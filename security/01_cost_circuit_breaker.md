# Cost Circuit Breaker — Especificación

**Propósito:** Pausar automáticamente todo el sistema si el gasto en APIs supera límites definidos. Evita que un loop de agentes cause un costo descontrolado.

---

## Principios

1. **Cap por hora, día, módulo y agente.**
2. **Verificación PRE-llamada.** Si la llamada va a hacer rebasar el cap, NO se ejecuta.
3. **Verificación POST-llamada.** Tracking real para detectar drift.
4. **Pausa automática + email** cuando se rebasa el cap.
5. **Solo el supervisor humano** puede reanudar tras pausa por costo.

---

## Configuración (en `config/cost_caps.yaml`)

```yaml
caps:
  per_hour_total_usd: 5.00
  per_day_total_usd: 30.00
  per_request_max_usd: 1.00  # ninguna llamada individual debe exceder

  per_agent_per_day:
    operador_agent: 15.00
    qa_agent: 8.00
    pm_agent: 4.00
    auditor_agent: 1.50

  per_module_per_day:
    medical_exam_extraction: 5.00
    plan_emergencias_structuring: 5.00
    discrepancy_report_analysis: 3.00
    risk_matrix_enrichment: 4.00
    acta_generation: 3.00
    other: 10.00

actions_on_breach:
  per_hour_breach: warn_only
  per_day_breach: pause_system
  per_request_breach: reject_call
  per_agent_breach: pause_specific_agent
  per_module_breach: warn_and_throttle  # reduce a complejidad menor
```

---

## Implementación (pseudocódigo)

```typescript
// lib/cost-breaker.ts
async function checkBudgetBeforeCall(
  agent_id: string,
  module: string,
  estimated_cost_usd: number
): Promise<{ allowed: boolean; reason?: string }> {

  // 1. Cap absoluto por request
  if (estimated_cost_usd > caps.per_request_max_usd) {
    await logBreach('per_request', { estimated_cost_usd })
    await rejectCall()
    return { allowed: false, reason: 'per_request_cap' }
  }

  // 2. Sumas actuales
  const hourly = await getCostSinceHourStart()
  const daily = await getCostSinceDayStart()
  const agentDaily = await getCostByAgentToday(agent_id)
  const moduleDaily = await getCostByModuleToday(module)

  // 3. Proyecciones tras esta llamada
  if (daily + estimated_cost_usd > caps.per_day_total_usd) {
    await pauseSystem('cost_cap_daily')
    await sendEmailSupervisor('CRÍTICO: cap diario excedido', { daily, estimated_cost_usd })
    return { allowed: false, reason: 'per_day_cap' }
  }

  if (agentDaily + estimated_cost_usd > caps.per_agent_per_day[agent_id]) {
    await pauseAgent(agent_id)
    await sendEmailSupervisor('Agente pausado por cap', { agent_id, agentDaily })
    return { allowed: false, reason: 'per_agent_cap' }
  }

  if (moduleDaily + estimated_cost_usd > caps.per_module_per_day[module]) {
    await throttleModule(module)
    return { allowed: true, reason: 'throttled_complexity_reduced' }
    // sigue permitida pero forzada a complejidad menor
  }

  if (hourly + estimated_cost_usd > caps.per_hour_total_usd) {
    await sendWarning('Cap horario superado', { hourly })
    return { allowed: true, reason: 'warned_only' }
  }

  return { allowed: true }
}
```

---

## Estimación de costo pre-llamada

```typescript
function estimateCallCost(
  provider: string,
  model: string,
  prompt: string,
  expected_output_tokens: number
): number {
  const input_tokens = countTokens(prompt)
  const pricing = PRICING_TABLE[provider][model]
  return (input_tokens * pricing.input_per_1k + expected_output_tokens * pricing.output_per_1k) / 1000
}

// PRICING_TABLE actualizada con valores actuales
const PRICING_TABLE = {
  groq: {
    'llama-3.3-70b-versatile': { input_per_1k: 0, output_per_1k: 0 },
    'llama-3.1-8b-instant': { input_per_1k: 0, output_per_1k: 0 }
  },
  anthropic: {
    'claude-sonnet-4-6': { input_per_1k: 0.003, output_per_1k: 0.015 },
    'claude-opus-4-7': { input_per_1k: 0.015, output_per_1k: 0.075 },
    'claude-haiku-4-5-20251001': { input_per_1k: 0.0008, output_per_1k: 0.004 }
  },
  gemini: {
    'gemini-1.5-flash': { input_per_1k: 0, output_per_1k: 0 },  // free tier
    'gemini-1.5-pro': { input_per_1k: 0, output_per_1k: 0 }     // free tier con limits
  }
}
```

---

## Reanudación tras pausa

Solo el supervisor humano (David) puede reanudar:

1. Recibe email de pausa con razón y métricas.
2. Investiga (¿hubo loop? ¿agente alucinó? ¿cap mal configurado?).
3. Si cap mal configurado → ajusta cap en `config/cost_caps.yaml`, reload.
4. Si todo OK → invoca endpoint `/api/admin/resume?reason=...`.
5. Sistema reanuda, contadores se mantienen, no se resetan.

---

## Dashboard de costo (vista supervisor)

URL: `/regis/system-health/costs`

Muestra:
- Costo acumulado hoy (con barra hacia el cap)
- Por hora últimas 24h (gráfica)
- Por agente
- Por módulo
- Top 10 llamadas más caras
- Llamadas rechazadas por cap (count)
