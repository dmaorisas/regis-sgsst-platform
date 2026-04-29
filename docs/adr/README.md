# Architecture Decision Records (ADRs)

**Proyecto:** Automatización SG-SST — Regis Colombia
**Última actualización:** 2026-04-29

Este directorio contiene los ADRs (Architecture Decision Records) del proyecto. Cada ADR documenta una decisión técnica con su contexto, alternativas evaluadas, razón y consecuencias.

## Convenciones

- **Formato estándar (ADRs principales):** Estado, Fecha, Decidido por, Contexto, Alternativas evaluadas (3+), Decisión, Razón, Consecuencias (positivas/negativas/mitigaciones), Referencias.
- **Formato corto (ADRs auxiliares):** Estado, Fecha, Decisión, Alternativas (2+), Razón, Consecuencias, Referencias.
- **Estados posibles:** `Aceptado`, `Pendiente`, `Reemplazado por ADR-XXX`, `Deprecado`.
- **Inmutabilidad:** un ADR aceptado no se modifica; si cambia la decisión, se crea un nuevo ADR que lo reemplaza explícitamente. R5 del documento de gobernanza aplica: nadie modifica ADRs ya escritos sin reescritura formal.

## Índice

| ADR | Título | Estado | Fecha | Tipo |
|---|---|---|---|---|
| [ADR-001](ADR-001-stack-frontend.md) | Stack Frontend: Next.js 14 directo | Aceptado | 2026-04-29 | Principal |
| [ADR-002](ADR-002-centros-trabajo-multi-ciiu.md) | Centros de trabajo + multi-CIIU | Aceptado | 2026-04-29 | Principal |
| [ADR-003](ADR-003-audit-trail-fase-1.md) | Audit Trail desde Fase 1 (no Fase 5) | Aceptado | 2026-04-29 | Principal |
| [ADR-004](ADR-004-storage-primario.md) | Storage Primario: Supabase Storage + Drive espejo | Aceptado | 2026-04-29 | Principal |
| [ADR-005](ADR-005-job-queue-pg-boss.md) | Job Queue: pg-boss sobre Postgres | Aceptado | 2026-04-29 | Principal |
| [ADR-006](ADR-006-anti-alucinacion.md) | Anti-alucinación: 3 capas (no 7) | Aceptado | 2026-04-29 | Corto |
| [ADR-007](ADR-007-rbac-4-roles.md) | RBAC: 4 roles funcionales para concurso | Aceptado | 2026-04-29 | Corto |
| [ADR-008](ADR-008-pgboss-procesos-largos.md) | Procesos largos (Whisper) vía pg-boss async | Aceptado | 2026-04-29 | Corto |
| [ADR-009](ADR-009-testing-minimal.md) | Testing minimal para concurso | Aceptado | 2026-04-29 | Corto |
| [ADR-010](ADR-010-resend-email.md) | Resend como provider de email transaccional | Aceptado | 2026-04-29 | Corto |

## Notas

- **ADR-002** fue formalizado en la tarea **T-F0-026** (2026-04-29). La decisión ya estaba aplicada en el ERD v0 (centros de trabajo como entidad de primera clase con CIIU propio, ver `docs/erd/v0.md` D-ERD-02); este ADR documenta formalmente el contexto, alternativas y consecuencias.
- Los ADRs principales (001, 002, 003, 004, 005) usan el formato extenso porque su decisión condiciona la arquitectura en múltiples fases.
- Los ADRs cortos (006-010) usan el formato breve porque formalizan decisiones más acotadas pero igualmente vinculantes.

## Próximos ADRs previstos (no comprometidos)

- ADR-011 (tentativo) — Estrategia de migraciones Supabase y particionado de `audit_log`.
- ADR-012 (tentativo) — Política de versionado de documentos en `documents`.

Estos quedan supeditados a su tarea correspondiente y no tienen fecha aún.
