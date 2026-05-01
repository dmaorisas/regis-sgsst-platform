# T-F15-015 — Arquitectura de orquestación autónoma de agentes en n8n

**Tarea:** T-F15-015 (ex T-F0-037, renumerada por D-009)
**Decisiones aplicables:** D-009, D-010, D-011
**Modo de construcción:** PM-Agent vía MCP n8n (Project ID `apHolqjKxJnd6rHP`)
**Fecha inicio:** 2026-05-01

---

## Modelo de comunicación entre workflows

**Decisión arquitectónica:** comunicación vía Postgres (Supabase), NO vía webhooks internos.

**Razón:**

- Setup más simple: no hay que exponer webhooks internos en n8n
- Más resiliente: si un workflow está caído, los siguientes lo retoman cuando vuelva
- Auditable: la cola completa queda persistida en `agent_tasks`
- Compatible con la cola humana existente (`ai_outputs_pending_review`)

**Patrón:** cada workflow es un **cron consumer** que hace `SELECT ... WHERE assigned_to = 'mi_rol' AND status IN ('mi_estado_inicial')`, procesa, y hace `UPDATE` para pasar al siguiente rol.

```
┌──────────────────┐  cron 10min     ┌──────────────────┐
│ task-dispatcher  │────────────────▶│ agent_tasks      │
│ (Issues→queue)   │                 │ (status=queued)  │
└──────────────────┘                 └──────────────────┘
                                              │
                                              │ assigned_to=operador
                                              ▼
┌──────────────────┐  cron 2min      ┌──────────────────┐
│ operador-executor│◀────────────────│ agent_tasks      │
│ (LLM + GH comment)                 │ (status=queued)  │
└──────────────────┘                 └──────────────────┘
         │
         │ UPDATE status=qa_pending, assigned_to=qa
         ▼
┌──────────────────┐  cron 2min      ┌──────────────────┐
│ qa-validator     │◀────────────────│ agent_tasks      │
│ (LLM + verdict)  │                 │ (status=qa_pending)
└──────────────────┘                 └──────────────────┘
         │
         ├── verdict=APROBADA → UPDATE status=approved (terminal)
         ├── verdict=RECHAZADA + iter<2 → UPDATE status=queued (reciclar)
         └── verdict=RECHAZADA + iter=2 → UPDATE status=escalated, assigned_to=pm
                                              │
                                              ▼
┌──────────────────┐  cron 6h        ┌──────────────────┐
│ pm-coordinator   │◀────────────────│ agent_tasks      │
│ (snapshot+escal) │                 │ (status=escalated)
└──────────────────┘                 └──────────────────┘

┌──────────────────┐  cron 5min      ┌──────────────────┐
│ auditor          │────────────────▶│ system_state     │
│ (loop detector)  │                 │ (paused=true si) │
│ + cost circuit   │                 │ loop_detections  │
└──────────────────┘                 └──────────────────┘
```

---

## Esquema de datos (migration `20260501140000_system_state.sql`)

### `system_state` (singleton id=1)

- `paused` bool — si true, todos los workflows hacen early-exit
- `pause_reason`, `pause_scope`, `pause_target`, `paused_at`, `paused_by`
- `resumed_at`, `resumed_by`, `resume_note`

Reanudación manual: `UPDATE public.system_state SET paused=false, resumed_at=NOW(), resumed_by='David', resume_note='...' WHERE id=1`

### `agent_tasks` (cola de orquestación)

- Estados: `queued`, `in_progress`, `qa_pending`, `approved`, `rejected`, `escalated`, `cancelled`
- `assigned_to`: `operador`, `qa`, `pm`, `none`
- `iteration`: contador de re-trabajo (regla 4.1 anti-loop: max 2)
- `last_operador_output`, `last_qa_verdict`, `last_qa_feedback`, `pm_resolution`
- `started_at`, `completed_at`

### `loop_detections` (log inmutable)

- `trigger_name`, `severity`, `task_id`, `agent_id`, `details` (JSONB), `action_taken`

---

## Workflow #1: regis-task-dispatcher (✅ código en `01-task-dispatcher.workflow.ts`)

**Trigger:** cron 10 min
**Lógica:**

1. Check `system_state.paused` → si true, log y exit
2. GET `/repos/dmaorisas/regis-sgsst-platform/issues` con labels `agent:operador,bucket:A`
3. Filtrar por título matching `[T-F\d+(\.\d+)?-\d+]`
4. Ordenar por fase asc, ID asc
5. Tomar el primero, INSERT en `agent_tasks` (ON CONFLICT DO NOTHING — idempotente)
6. Comentar en el Issue de GitHub

**Credenciales:**

- `Supabase Postgres` (n8n type: `postgres`)
- `GitHub PAT (Header)` (n8n type: `httpHeaderAuth`, header `Authorization: Bearer ghp_...`)

---

## Workflow #2: regis-operador-executor (PENDIENTE)

**Trigger:** cron 2 min
**Lógica:**

1. Check pause → exit si paused
2. SELECT next task: `SELECT * FROM agent_tasks WHERE assigned_to='operador' AND status='queued' ORDER BY created_at ASC LIMIT 1`
3. UPDATE status='in_progress', `attempt_count=attempt_count+1`
4. **Cost circuit breaker pre-call:** SUM cost_usd FROM ai_usage WHERE created_at > date_trunc('day', NOW()) AND agent_id='operador_agent'. Si suma + 0.10 > 15.00 → pause + email
5. **HTTP POST Anthropic API** (`/v1/messages`):
   - `model: claude-sonnet-4-6` (complexity=medium per `06_llm_routing_config.md`, agent default)
   - `system`: contenido completo de `prompts/01_operador_agent_system.md`
   - `messages[0].user`: contexto de la tarea (spec del Issue + body + iteration + feedback previo de QA si hay)
   - `max_tokens: 8000`, `temperature: 0`
6. INSERT en `ai_usage` con prompt_tokens, completion_tokens, cost_usd, model, agent_id='operador_agent', task_id, latency_ms
7. UPDATE agent_tasks SET status='qa_pending', assigned_to='qa', last_operador_output=<respuesta del LLM>
8. Comentar en GitHub Issue con el reporte de ejecución del Operador

**Credenciales adicionales:**

- `Anthropic API Key` (n8n type: `httpHeaderAuth`, header `x-api-key: sk-ant-...` y `anthropic-version: 2023-06-01`)

**Cost cap inline (Code node antes del HTTP Request):**

```javascript
const today_spend = parseFloat($input.first().json.today_spend || 0)
const cap = 15.0 // de governance/06 per_agent_per_day.operador_agent
const estimated = 0.1
if (today_spend + estimated > cap) {
  return [{ json: { allowed: false, reason: 'per_agent_cap', today_spend, cap } }]
}
return [{ json: { allowed: true, today_spend } }]
```

---

## Workflow #3: regis-qa-validator (PENDIENTE)

**Trigger:** cron 2 min
**Lógica:**

1. Check pause → exit si paused
2. SELECT next: `WHERE assigned_to='qa' AND status='qa_pending'`
3. UPDATE status='in_progress'
4. Cost circuit breaker (cap qa_agent: $8/día per `06_llm_routing_config.md`)
5. POST Anthropic con `prompts/02_qa_agent_system.md` + spec del Issue + last_operador_output
6. **Output parser estructurado:** esperar JSON `{ verdict: 'APROBADA' | 'RECHAZADA' | 'RECHAZADA_CON_AJUSTES', criterios: [...], feedback?: string, riesgos?: string }`
7. INSERT ai_usage
8. **Branch por veredicto:**
   - APROBADA → UPDATE status='approved', completed_at=NOW(); cerrar Issue GitHub
   - RECHAZADA + iteration<2 → UPDATE status='queued', iteration=iteration+1, last_qa_feedback=...
   - RECHAZADA + iteration=2 → UPDATE status='escalated', assigned_to='pm' (regla anti-loop 4.1)
9. Comentar veredicto en GitHub Issue

---

## Workflow #4: regis-pm-coordinator (PENDIENTE)

**Trigger:** cron 6h (snapshots) + cron 15min (escalaciones)
**Lógica dual:**

### Branch A: snapshot cada 6h

1. Calcular métricas: tasks aprobadas, en progreso, escaladas, costo IA acumulado, etc.
2. Comentar en Issue #11 (`[STATUS] Dashboard`) con formato del snapshot definido en `prompts/03_pm_agent_system.md`
3. Si hay escalaciones críticas → email al supervisor vía Resend HTTP

### Branch B: resolución de escalaciones (cron 15 min)

1. SELECT WHERE assigned_to='pm' AND status='escalated'
2. Cost circuit breaker (cap pm_agent: $4/día)
3. POST Anthropic con `prompts/03_pm_agent_system.md` + contexto completo (spec, output operador, veredicto QA, iteration history)
4. **Output:** `{ resolution: 'INSTRUCT_QA_APPROVE' | 'INSTRUCT_OPERADOR_REWORK' | 'MODIFY_SPEC' | 'MOVE_TO_BUCKET_B', notes: string, modified_spec?: string }`
5. Aplicar acción + INSERT en `governance/03_log_decisiones.md` (vía GitHub PUT contents API)
6. UPDATE agent_tasks según resolución
7. Email al supervisor con la decisión

---

## Workflow #5: regis-auditor-loop-detector (PENDIENTE)

**Trigger:** cron 5 min (per `security/02_loop_detector.md`)
**Lógica:** ejecuta los 3 triggers SQL implementables en MVP:

### Trigger 1: rejection count >= 3

```sql
SELECT task_id, COUNT(*) AS rejections
FROM agent_tasks WHERE status IN ('rejected', 'escalated')
GROUP BY task_id HAVING COUNT(*) >= 3
```

→ UPDATE system_state SET paused=true, pause_reason='loop_detector:rejection_count', pause_scope='task', pause_target=task_id

### Trigger 2: tarea overdue (en_progreso > 2× estimated)

```sql
SELECT task_id, EXTRACT(epoch FROM (NOW() - started_at))/60 AS minutes_in_progress, estimated_minutes
FROM agent_tasks
WHERE status='in_progress' AND estimated_minutes > 0
  AND EXTRACT(epoch FROM (NOW() - started_at))/60 > 2 * estimated_minutes
```

→ pause task

### Trigger 5: duplicate invocations (mismo prompt+input >3 veces en 30min)

```sql
SELECT request_hash, COUNT(*) AS invocations
FROM ai_usage
WHERE request_hash IS NOT NULL AND created_at > NOW() - interval '30 minutes'
GROUP BY request_hash HAVING COUNT(*) > 3
```

→ identificar agente, pause agent

**Si cualquier trigger detecta:**

1. INSERT en `loop_detections`
2. UPDATE `system_state` SET paused=true (scope correspondiente)
3. POST email al supervisor vía Resend (HTTP Request node)

**Diferidos a F5 hardening:** triggers 3 (repeated_errors, requiere `error_logs` table), 4 (low_approval_rate, requiere histórico extendido), 6 (contradictory PM decisions, requiere análisis NLP).

---

## Credenciales requeridas en n8n web UI

| Nombre en SDK         | Tipo n8n credential | Configurar                                                                                                                  |
| --------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `Supabase Postgres`   | postgres            | host=db.<proj>.supabase.co, port=5432, db=postgres, user=postgres, password=<DB password>, ssl=require                      |
| `GitHub PAT (Header)` | httpHeaderAuth      | name=Authorization, value=Bearer ghp_xxx (PAT con scopes: repo, project)                                                    |
| `Anthropic API Key`   | httpHeaderAuth      | name=x-api-key, value=sk-ant-xxx (reusable: añadir también `anthropic-version: 2023-06-01` como header normal en cada call) |
| `Resend API`          | httpHeaderAuth      | name=Authorization, value=Bearer re_xxx                                                                                     |

**Nota:** los workflows usan `newCredential('Nombre exacto')`. Cuando el supervisor importa los workflows en n8n, mapea cada `newCredential` a la credencial real ya configurada.

---

## Routing LLM (de `governance/06_llm_routing_config.md`)

Por agente (defaults):

- operador_agent: medium → claude-sonnet-4-6 (cap $0.10/req, $15/día)
- qa_agent: complex → claude-sonnet-4-6 (cap $0.10/req, $8/día)
- pm_agent: complex → claude-sonnet-4-6 (cap $0.10/req, $4/día)
- auditor_agent: simple → SQL puro en este MVP (sin LLM call), $0/día

Pricing (`security/01_cost_circuit_breaker.md`):

- claude-sonnet-4-6: input $3/MTok, output $15/MTok
- claude-opus-4-7 (fallback): input $15/MTok, output $75/MTok

---

## Plan de testing E2E

1. Aplicar migration en Supabase remoto: `npx supabase db push`
2. Crear 1 Issue ficticio en GitHub: `[T-TEST-001] Hello world ficticio` con labels `agent:operador,bucket:A,phase:F1.5`
3. Ejecutar manualmente `regis-task-dispatcher` desde n8n web UI → debería encolar el ticket
4. Verificar `SELECT * FROM agent_tasks WHERE task_id='T-TEST-001'` retorna 1 fila status='queued'
5. Verificar comentario aparece en el Issue de GitHub
6. (Repetir con #2-#5 una vez construidos)

---

## Estado actual de construcción

| #   | Workflow              | Validate | Created en n8n      | Notas                                                                                                                                                                                                                                                                                                                     |
| --- | --------------------- | -------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | task-dispatcher       | ✅       | ❌ 500 reproducible | Código completo en `flows/01-task-dispatcher.workflow.ts`. **Diagnóstico:** test-tiny (2 nodos) creó OK, así que el endpoint funciona; el 500 lo dispara algo en el código grande (sospecha: jsCode del Code node con regex escapado, o el expr() en `queryReplacement`). Próximo paso: simplificar/dividir y reintentar. |
| 2   | operador-executor     | ❌       | ❌                  | Spec arriba, código pendiente                                                                                                                                                                                                                                                                                             |
| 3   | qa-validator          | ❌       | ❌                  | Spec arriba, código pendiente                                                                                                                                                                                                                                                                                             |
| 4   | pm-coordinator        | ❌       | ❌                  | Spec arriba, código pendiente                                                                                                                                                                                                                                                                                             |
| 5   | auditor-loop-detector | ❌       | ❌                  | Spec arriba, código pendiente                                                                                                                                                                                                                                                                                             |

### Aplicado al stack

- ✅ Migration `20260501140000_system_state.sql` ejecutada en Supabase remoto (`ltitkmipilzzuvomtlqf`). Verificado: `system_state` (id=1, paused=false), `agent_tasks` (0 rows), `loop_detections` (0 rows).
- ✅ Test workflow trivial creado y archivado vía MCP (confirma endpoint funcional).

---

## Handoff para próxima sesión

**Qué hacer primero:**

1. Reintentar `create_workflow_from_code` con el código de `flows/01-task-dispatcher.workflow.ts` (probablemente fue un 500 transitorio)
2. Aplicar migration `20260501140000_system_state.sql` a Supabase remoto
3. Configurar las 4 credenciales en n8n web UI según la tabla arriba
4. Construir workflows #2-#5 siguiendo los specs de este documento + el patrón validado en #1
5. Test E2E con un ticket ficticio

**Consideración de costo:** este documento + el código de #1 fueron creados con Opus 1M. Los workflows #2-#5 son trabajo mecánico (validate→create) que se ejecuta más barato con Sonnet en sesión nueva.
