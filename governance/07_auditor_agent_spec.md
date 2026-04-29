# Especificación del Auditor-Agent (4to agente sombra)

**Misión:** Detectar violaciones de reglas que los otros 3 agentes (Operador, QA, PM) hayan dejado pasar. No interviene en el flujo principal; solo reporta al supervisor humano.

**Filosofía:** menos es más. El Auditor existe para encontrar lo que los demás ya no ven, no para duplicar el QA.

---

## 6 estrategias de optimización (combinadas)

### Estrategia 1: Modo batch async, no real-time

El Auditor **NO se invoca después de cada tarea**. Corre en batch cada 4 horas:
- Toma todas las tareas aprobadas en las últimas 4h.
- Procesa en una sola llamada de contexto largo.
- Produce reporte único.

**Ahorro:** ~95% de invocaciones individuales evitadas.

### Estrategia 2: Sampling estratificado (no todo)

No audita el 100% de tareas. Audita:
- **100% de tareas críticas** (las 7 marcadas con 🔥)
- **30% de tareas con `nivel_qa: estricto`**
- **10% de tareas con `nivel_qa: estándar`**
- **0% de tareas con `nivel_qa: ligero`** (no vale la pena)

**Ahorro:** ~75% de tareas no auditadas.

### Estrategia 3: Modelo lightweight por defecto

El Auditor usa **Groq Llama 3.3 70B (gratis)** para 90% de las auditorías. Solo escala a Claude Sonnet cuando:
- Detectó anomalía y necesita razonamiento profundo para confirmarla
- Tarea crítica (las 7 marcadas)

**Ahorro:** ~85% de costo de tokens.

### Estrategia 4: Detección por patrones, no por análisis

El Auditor opera en 2 capas:

**Capa 1 (algorítmica, sin LLM):** verificación de reglas duras vía SQL queries:
```sql
-- Regla: Ningún Operador aprueba sus propias tareas
SELECT * FROM audit_log WHERE actor_id IN (
  SELECT operador_id FROM tasks WHERE id = audit_log.task_id
) AND action = 'approve';

-- Regla: No hay tareas aprobadas con dependencias no cumplidas
SELECT t.id FROM tasks t
WHERE t.status = 'aprobada'
AND EXISTS (
  SELECT 1 FROM task_dependencies td
  JOIN tasks dep ON dep.id = td.depends_on
  WHERE td.task_id = t.id AND dep.status != 'aprobada'
);

-- Regla: No hay 2 tareas en `en_progreso` por el mismo Operador
SELECT operador_id, COUNT(*) FROM tasks
WHERE status = 'en_progreso'
GROUP BY operador_id HAVING COUNT(*) > 1;
```

**Capa 2 (LLM):** SOLO si la capa 1 detecta algo sospechoso o si toca una tarea muestreada de 🔥.

**Ahorro:** ~90% de las verificaciones se hacen sin LLM.

### Estrategia 5: Cache de patrones normales

El Auditor mantiene un "perfil de normalidad":
- Tiempo promedio de QA por nivel
- Tasa de aprobación 1ra iteración esperada (>80%)
- Patrones de feedback comunes

Si una tarea está dentro de los patrones normales → auditoría ligera (solo capa 1).
Si una tarea es atípica → auditoría profunda (capa 2 con LLM).

**Ahorro:** ~50% de profundidad ahorrada en tareas normales.

### Estrategia 6: Reportes incrementales, no completos

El Auditor no genera reporte largo cada 4h. Genera **delta reports**:
- Solo nuevos hallazgos desde la última auditoría
- Si no hay hallazgos → mensaje vacío "todo OK"
- Reporte completo solo en phase gates

**Ahorro:** ~70% de tokens de output.

---

## Costo estimado del Auditor

Con las 6 optimizaciones aplicadas:

| Métrica | Sin optimizar | Optimizado | Ahorro |
|---|---|---|---|
| Invocaciones/día | ~120 | ~6 | 95% |
| Tokens promedio/invocación | 8000 | 3000 | 62% |
| Modelo | Sonnet (~$0.015/1k tok) | Llama Groq ($0) o Sonnet en 10% | 90% |
| **Costo/día estimado** | **~$15 USD** | **~$0.50 USD** | **96%** |
| **Costo total 11 días** | ~$165 USD | **~$5.50 USD** | 96% |

---

## Qué reporta el Auditor

Output estandarizado en JSON:

```json
{
  "audit_run_id": "audit-2026-04-29-12",
  "timestamp": "2026-04-29T12:00:00Z",
  "tasks_audited": 18,
  "tasks_sampled_total": 24,
  "findings": [
    {
      "severity": "high",
      "rule_violated": "R6.1 - Separación de roles",
      "task_id": "T-F1-016",
      "evidence": "El mismo agent_id aparece como operator y como qa_validator",
      "recommended_action": "Reabrir tarea, reasignar QA a otro agente"
    }
  ],
  "patterns_detected": [
    {
      "type": "qa_lenient",
      "description": "QA-agent aprobó 5 tareas seguidas en <2 min cada una",
      "concern": "Posible validación superficial",
      "action": "Sugerir al PM revisar muestreo manual"
    }
  ],
  "metrics_anomalies": [
    {
      "metric": "approval_rate_first_iteration",
      "current": 0.55,
      "baseline": 0.80,
      "deviation": "-31%"
    }
  ],
  "human_attention_required": false
}
```

Si `human_attention_required: true` → email inmediato al supervisor.

---

## Reglas inquebrantables del Auditor

1. **No interviene en el flujo principal.** No puede pausar tareas, no puede aprobar/rechazar, no puede modificar nada. Solo reporta.
2. **No depende de los otros 3 agentes.** Si los 3 están caídos, el Auditor sigue funcionando.
3. **Si no encuentra nada, no inventa hallazgos.** Reporte vacío es válido.
4. **Si encuentra violación crítica, escala al humano inmediatamente.** No al PM, no al QA. Directo al supervisor.
5. **Su log es inmutable.** Append-only en tabla `auditor_findings`.

---

## Cuándo escala al humano (tú)

| Hallazgo | Acción |
|---|---|
| Violación de regla inquebrantable | Email inmediato + pausa de los otros 3 agentes |
| Patrón de QA superficial detectado | Email en próximo snapshot de 6h |
| Anomalía en métricas | Email en próximo snapshot de 6h |
| Tareas críticas auditadas, todo OK | Mención breve en snapshot de 6h |
| Auditoría rutinaria sin hallazgos | Sin notificación |

---

## Configuración invocable

```yaml
# config/auditor.yaml
schedule:
  cron: "0 */4 * * *"  # cada 4 horas
  timezone: America/Bogota

sampling_rates:
  critical_tasks: 1.0
  strict_qa_tasks: 0.30
  standard_qa_tasks: 0.10
  light_qa_tasks: 0.0

llm:
  default: groq/llama-3.3-70b-versatile
  for_critical_tasks: anthropic/claude-sonnet-4-6
  for_anomaly_followup: anthropic/claude-sonnet-4-6

cost_cap_per_day_usd: 1.50
cost_cap_per_run_usd: 0.30

notifications:
  human_attention_threshold: high
  channel: email
  recipient: ${SUPERVISOR_EMAIL}
```
