# ADR-005 — Job Queue: pg-boss sobre Postgres (no Redis/BullMQ)

**Estado:** Aceptado
**Fecha:** 2026-04-29
**Decidido por:** PM-Agent + supervisor humano (David Maori)

## Contexto

La plataforma necesita ejecutar trabajos asíncronos: cron de partición mensual de `audit_log`, recordatorios de compromisos COPASST, generación de snapshots mensuales de cumplimiento, transcripciones Whisper de actas (audio de 30 min no cabe en Edge Functions con timeout 60s), reportes de discrepancias, ciclo de vida de retención (20 años para exámenes médicos), corrida del Loop Detector cada 5 minutos y del Auditor-Agent cada 4 horas. Para integraciones con sistemas externos (PILA, ARLs, WhatsApp/Wati, Resend, Drive) ya está previsto n8n. La pregunta era qué motor de jobs usar internamente.

## Alternativas evaluadas

### Alternativa A: Redis + BullMQ
- Pros: estándar de la industria; gran ecosistema; observabilidad madura.
- Contras: infra adicional (Upstash Redis o instancia dedicada); separa el estado transaccional del estado de jobs; introduce un segundo store que puede desincronizarse con Postgres; sobredimensionado para 100 pymes.

### Alternativa B: RabbitMQ
- Pros: muy maduro; routing complejo si fuera necesario.
- Contras: misma desventaja de infra extra; routing complejo no es lo que necesitamos; over-engineering claro.

### Alternativa C: AWS SQS
- Pros: gestionado, sin infra propia.
- Contras: cuenta AWS adicional; lock-in regional; latencia variable; pago por mensaje; no se integra con RLS.

### Alternativa D: n8n para todo
- Pros: una sola plataforma de automation.
- Contras: n8n es excelente para integraciones, malo para jobs internos transaccionales (cron de partición, retención, snapshots, transcripciones largas); no comparte transacciones con Postgres; difícil testear localmente; convierte a n8n en SPOF de la plataforma.

### Alternativa E: pg-boss sobre Postgres (Supabase)
- Pros: usa la misma instancia Postgres que ya tenemos; jobs y datos comparten transacciones (commit atómico); cero infra extra; soporta cron, retries, retención, jobs largos sin timeout artificial; el Loop Detector ya consulta `pg_boss_jobs` (D-ERD-10); permite procesos de horas si fuera necesario.
- Contras: throughput limitado por Postgres (suficiente para 100 pymes, no para millones de mensajes/seg); observabilidad menos madura que BullMQ; menos plugins.

## Decisión

**pg-boss sobre Postgres (Supabase)** es la cola de jobs interna. **n8n se reserva exclusivamente para integraciones con sistemas externos**.

## Razón

El principio rector premia adaptabilidad y sencillez operativa el día 1. Una sola fuente de verdad transaccional (Postgres) elimina inconsistencias entre datos y jobs, simplifica backup/restore (`security/03_backup_automatico.md`), reduce surface de fallo y costos. pg-boss soporta exactamente los patrones que necesitamos: cron (partición, snapshots, Loop Detector, Auditor), retries con backoff, jobs largos (Whisper async, ver ADR-008), retención programada (20 años exámenes médicos, ADR-004). 100 pymes no requieren throughput de Redis; sí requieren consistencia transaccional.

## Consecuencias

### Positivas
- Cero infra adicional; backup unificado con la base de datos.
- Atomicidad: encolar job + escribir registro ocurre en la misma transacción.
- Compatible con audit trail (ADR-003) sin cambios.
- El Loop Detector y el Cost Circuit Breaker pueden inspeccionar la cola con SQL.

### Negativas
- Throughput limitado por Postgres (no apto para escenarios masivos).
- Observabilidad (UI de jobs) requiere construirse mínimamente.
- Mantenimiento: cuidar índices y vacuum sobre tablas pg-boss.

### Mitigaciones
- Para escala futura, migración a Redis es viable (interfaz de cola se abstrae).
- Dashboard mínimo de jobs en `/regis/system-health/jobs` (vista admin).
- Configurar `archive_completed_after_seconds` en pg-boss para evitar bloat.

## Referencias

- `docs/erd/v0.md` D-ERD-10
- `governance/06_llm_routing_config.md` (jobs IA pasan por router)
- `security/01_cost_circuit_breaker.md` (caps por agente/módulo)
- `security/02_loop_detector.md` (cron 5min)
- `governance/07_auditor_agent_spec.md` (cron 4h)
- ADR-008 (Whisper async vía pg-boss)
