# Loop Detector — Especificación

**Propósito:** Detectar y detener loops infinitos o re-trabajo excesivo de los agentes antes de que consuman recursos sin progreso real.

---

## Triggers de detección automática

Cualquiera de estos triggers dispara pausa + email al supervisor:

### Trigger 1: Tarea con 3+ rechazos QA
```sql
SELECT t.id, COUNT(qv.id) as rejection_count
FROM tasks t
JOIN qa_verdicts qv ON qv.task_id = t.id
WHERE qv.verdict IN ('rechazada', 'rechazada_con_ajustes')
GROUP BY t.id
HAVING COUNT(qv.id) >= 3
```
**Acción:** pausar tarea específica + escalar al PM (ya estaba en regla, esto lo automatiza).

### Trigger 2: Tarea en `en_progreso` por más de 2× tiempo estimado
```sql
SELECT t.id,
  EXTRACT(epoch FROM (now() - t.started_at))/60 as minutes_in_progress,
  t.estimated_minutes
FROM tasks t
WHERE t.status = 'en_progreso'
  AND EXTRACT(epoch FROM (now() - t.started_at))/60 > 2 * t.estimated_minutes
```
**Acción:** pausar tarea + email supervisor con detalle.

### Trigger 3: Mismo error reportado 5+ veces en logs (1h)
```sql
SELECT error_signature, COUNT(*) as occurrences
FROM error_logs
WHERE created_at > now() - interval '1 hour'
GROUP BY error_signature
HAVING COUNT(*) >= 5
```
**Acción:** pausar agente que está generando el error + email.

### Trigger 4: Tasa de aprobación 1ra iteración cae bajo 60% en últimas 5 tareas
```sql
WITH last_5 AS (
  SELECT task_id, MIN(iteration) = 1 AND verdict = 'aprobada' as approved_first
  FROM qa_verdicts
  WHERE created_at > now() - interval '6 hours'
  GROUP BY task_id
  ORDER BY MAX(created_at) DESC LIMIT 5
)
SELECT AVG(approved_first::int)::float as approval_rate
FROM last_5
```
Si `approval_rate < 0.6` → email de warning al PM, no pausa.

### Trigger 5: Agente invoca el mismo prompt con misma input 3+ veces
Detección programática: hash del prompt + input. Si se repite >3 veces en 30 min → pausa agente.

### Trigger 6: Decisiones contradictorias del PM
Detecta cuando el PM toma 2 decisiones contradictorias en menos de 2 horas (ej: aprobar criterio X y luego rechazarlo).
**Acción:** email al supervisor para verificar coherencia del PM.

---

## Implementación

```typescript
// lib/loop-detector.ts

// Corre cada 5 minutos via pg-boss cron job
async function loopDetectorCheck() {
  const triggers = [
    checkTrigger1_RejectionCount,
    checkTrigger2_OverdueTask,
    checkTrigger3_RepeatedErrors,
    checkTrigger4_LowApprovalRate,
    checkTrigger5_DuplicateInvocations,
    checkTrigger6_ContradictoryDecisions
  ]

  for (const trigger of triggers) {
    const result = await trigger()
    if (result.detected) {
      await handleDetection(result)
    }
  }
}

async function handleDetection(detection: LoopDetection) {
  // 1. Persistir en tabla loop_detections (inmutable)
  await db.insert('loop_detections', detection)

  // 2. Aplicar acción según severidad
  switch (detection.action) {
    case 'pause_task':
      await pauseTask(detection.task_id)
      break
    case 'pause_agent':
      await pauseAgent(detection.agent_id)
      break
    case 'pause_system':
      await pauseSystem(detection.reason)
      break
    case 'warn_pm':
      await notifyPM(detection)
      break
  }

  // 3. Email supervisor si severidad >= high
  if (detection.severity === 'critical' || detection.severity === 'high') {
    await sendEmail({
      to: 'maori.david@dmaori.com',
      subject: `[REGIS - ${detection.severity.toUpperCase()}] Loop detectado`,
      body: formatDetectionForEmail(detection)
    })
  }

  // 4. Comentar en GitHub Issue afectado
  if (detection.task_id) {
    await commentOnIssue(detection.task_id, formatDetectionComment(detection))
  }
}
```

---

## Configuración

```yaml
# config/loop_detector.yaml

triggers:
  rejection_count:
    enabled: true
    threshold: 3
    severity: high
    action: pause_task
    auto_escalate_to_pm: true

  overdue_task:
    enabled: true
    multiplier: 2.0  # 2× tiempo estimado
    severity: high
    action: pause_task

  repeated_errors:
    enabled: true
    threshold: 5
    window_minutes: 60
    severity: critical
    action: pause_agent

  low_approval_rate:
    enabled: true
    threshold: 0.60
    window_tasks: 5
    severity: medium
    action: warn_pm

  duplicate_invocations:
    enabled: true
    threshold: 3
    window_minutes: 30
    severity: critical
    action: pause_agent

  contradictory_pm_decisions:
    enabled: true
    window_hours: 2
    severity: high
    action: notify_human

cron_schedule: "*/5 * * * *"  # cada 5 minutos
```

---

## Reanudación

Tras pausa por loop:

1. Email al supervisor con detección detallada.
2. Estado del sistema queda en `paused` con razón.
3. Supervisor investiga: ¿prompt mal? ¿tarea mal especificada? ¿agente alucinando?
4. Aplica corrección (modifica spec, ajusta prompt, reinicia agente con contexto fresco).
5. Reanudación vía endpoint `/api/admin/resume`:
   - Comentario obligatorio explicando la causa raíz
   - Decisión sobre la tarea: continuar, recomenzar, mover a Bucket B/C/D
   - Logged en `governance/03_log_decisiones.md`

---

## Métricas que el Loop Detector también reporta

Aunque no haya trigger, en cada corrida calcula y persiste:
- Tasa de aprobación 1ra iteración (rolling 6h, 24h)
- Tiempo promedio por nivel de QA
- Tiempo promedio en `en_progreso` por agente
- # de escalaciones al PM por día
- # de pausas activadas por día

Estas métricas alimentan el snapshot del PM cada 6h.
