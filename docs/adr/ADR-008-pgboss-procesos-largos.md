# ADR-008 — Procesos largos (Whisper) vía pg-boss async

**Estado:** Aceptado | **Fecha:** 2026-04-29

## Decisión

Las transcripciones Whisper de audio largo (actas COPASST de 30-90 min, audios de inspecciones) se procesan como **jobs asíncronos en pg-boss** con callback al terminar. La UI muestra estado "transcribiendo..." y notifica via in-app + email cuando completa. **No** se ejecutan en Edge Functions de Supabase ni en Server Actions síncronos.

## Alternativas

- **A: Edge Functions de Supabase** — pros: sin infra extra. Contras: timeout de 60 segundos = inviable para audio de 30+ min; falla silenciosa = mala UX.
- **B: Serverless workers (Lambda, Cloud Run)** — pros: escalable. Contras: infra adicional; lock-in cloud; observabilidad fuera del stack; costo por invocación.
- **C: pg-boss async con callback** — escogida.

## Razón

pg-boss ya está adoptado (ADR-005) y soporta jobs de horas si fuera necesario. Mantiene la regla de una sola fuente de verdad transaccional. El usuario no espera frente a un spinner: encola → recibe notificación → consume el resultado. Compatible con cost circuit breaker (caps por módulo, `security/01_cost_circuit_breaker.md`) y con el router LLM (complejidad medium para transcripción, `governance/06_llm_routing_config.md`).

## Consecuencias

- **Positivas:** UX honesta ("esto tarda 5 min"); reintentos automáticos; trazabilidad completa via `ai_usage` y `pg_boss_jobs`; consistente con D-ERD-10.
- **Mitigaciones:** UI ofrece push notification (in-app) + email cuando el job termina; si el job falla 3 veces, el usuario recibe alerta y se genera entrada en `auditor_findings` para revisión.

## Referencias

- ADR-005 (pg-boss como cola interna)
- `governance/06_llm_routing_config.md`
- `security/01_cost_circuit_breaker.md`
- `docs/erd/v0.md` D-ERD-10
