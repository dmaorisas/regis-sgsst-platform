# ADR-003 — Audit Trail desde Fase 1 (no Fase 5)

**Estado:** Aceptado
**Fecha:** 2026-04-29
**Decidido por:** PM-Agent + supervisor humano (David Maori)

## Contexto

La plataforma maneja datos sensibles (exámenes médicos, datos personales bajo Ley 1581/2012, evaluaciones de cumplimiento con peso legal) y opera con cuatro agentes IA (Operador, QA, PM, Auditor) que mutan datos. La regla R6.5 del documento de gobernanza exige **trazabilidad obligatoria** sobre toda tarea aprobada. El ERD v0 ya define `audit_log` particionado por mes y `actor_type` distinguiendo humanos vs agentes (D-ERD-05). La pregunta era cuándo materializar esta tabla y sus triggers: Fase 1 (con la primera migración) o Fase 5 (cerca de entrega).

## Alternativas evaluadas

### Alternativa A: Audit trail desde Fase 1 (con la primera migración Supabase)
- Pros: cero deuda técnica posterior; cada mutación queda registrada desde el primer commit que toca datos reales; el Auditor-Agent (Capa 1, SQL) puede operar desde F2; test multi-tenant valida RLS y audit a la vez.
- Contras: ~4h adicionales de trabajo en F1 (triggers, partición mensual, cron).

### Alternativa B: Audit trail en Fase 5 (post-MVP)
- Pros: F1 más liviana, demo del 6 de mayo no lo necesita estrictamente.
- Contras: inyectarlo retroactivamente sobre tablas con datos cuesta ~3× más (regenerar histórico desde logs incompletos, validar diffs, repasar todas las mutaciones); rompe la regla R6.5 durante 80% del proyecto; el Auditor-Agent no puede operar; si gana el concurso, llegamos a producción sin auditoría.

### Alternativa C: Híbrido (audit_log presente en F1, triggers parciales, completar en F5)
- Pros: gradual, menos trabajo concentrado.
- Contras: ambiguo sobre qué está cubierto y qué no; fuente probable de bugs y "creía que esto se loggeaba"; difícil de probar.

## Decisión

Implementar `audit_log` con triggers Postgres + middleware en Server Actions **desde la Fase 1**, con partición mensual automática y append-only por diseño. No se difiere a Fase 5.

## Razón

El principio rector exige una arquitectura que el ganador pueda alimentar con documentos oficiales el día 1. Datos médicos y de SG-SST sin audit trail no son auditables ni defendibles legalmente. Inyectar audit retroactivamente sobre datos reales es ~3× más costoso (estimado por experiencia del supervisor en proyectos previos). Además, el Auditor-Agent (Capa 1 SQL, sin LLM) depende de `audit_log` para detectar violaciones de R6.1 (separación de roles) — si la tabla no existe en F1, el cuarto agente no funciona durante el grueso del proyecto.

## Consecuencias

### Positivas
- Cumple R6.5 desde el día 1.
- Habilita Auditor-Agent Capa 1 (gratis, sin LLM) desde F2.
- Hace defendible la propuesta legalmente ante Regis.
- `audit_log` particionado por mes mantiene queries rápidas a futuro.

### Negativas
- ~4h extra en F1; todas las migraciones futuras deben recordar particionar.
- Cada Server Action con mutación necesita triggers; aumenta complejidad de testing.

### Mitigaciones
- Plantilla de migración con trigger genérico de auditoría (un solo helper).
- ADR-009 deja claro que el motor de cumplimiento sí lleva unit tests, donde audit es testable.
- Cron pg-boss crea la partición del mes siguiente automáticamente (ver ADR-005).

## Referencias

- `governance/01_roles_y_reglas.md` R6.5
- `docs/erd/v0.md` D-ERD-05, sección 4.2
- `governance/07_auditor_agent_spec.md` Capa 1 SQL
