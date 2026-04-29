# ERD Changelog — Regis SG-SST Platform

Registro de versiones del modelo de datos. Cada cambio significativo se documenta con su razón.

---

## v0 — 2026-04-28

**Autor:** Operador-Agent
**Tarea:** [T-F0-018](../../tasks/02_lista_maestra_tareas.md#t-f0-018--borrador-erd-v0-en-dbdiagramio)
**Issue:** [#13](https://github.com/dmaorisas/regis-sgsst-platform/issues/13)
**Estado:** Borrador inicial — pendiente QA estricto.

### Resumen
Primera versión del ERD canónico del proyecto. Diseñado con datos públicos (D-002, sin input de Regis), arquitectura multi-empresa de día 1 (D-003), y materializando ADR-02 conceptual (centros de trabajo + multi-CIIU).

### Entidades incluidas (35)
- **Tenancy & catálogos (10):** `regis_orgs`, `companies`, `centros_de_trabajo`, `ciiu_codes`, `ciiu_hazard_mapping`, `empresa_ciiu`, `eps_catalog`, `afp_catalog`, `arl_catalog`, `document_types`.
- **Cumplimiento normativo (1):** `standards_0312`.
- **Personas y roles (5):** `users`, `roles`, `user_company_role`, `workers`, `worker_company`.
- **Cumplimiento operacional (3):** `standard_evaluations`, `evaluation_snapshots`, `documents`.
- **Comités (4):** `committees`, `committee_members`, `meeting_actas`, `compromisos`.
- **Especializadas (4):** `medical_exams`, `risk_matrices`, `emergency_plans`, `furat_reports`.
- **Sistema (6):** `audit_log`, `consents`, `notifications`, `ai_usage`, `ai_outputs_pending_review`, `pg_boss_jobs`.
- **Observabilidad de agentes (2):** `loop_detections`, `auditor_findings`.

### N:M (pivot) declaradas
- `worker_company` (workers ↔ companies, con historia laboral).
- `empresa_ciiu` (companies ↔ ciiu_codes, multi-CIIU por empresa).
- `user_company_role` (users ↔ companies con rol; permite scope consultora cuando `company_id` es NULL).

### Decisiones de diseño documentadas
10 decisiones de diseño (D-ERD-01 a D-ERD-10) están documentadas en [`v0.md` §3](v0.md#3-decisiones-de-diseño-no-obvias). Resumen:
1. `workers` desacoplado de `companies` con pivot histórico.
2. `centros_de_trabajo` como entidad de primera clase con CIIU propio.
3. `evaluation_snapshots` inmutable (sin updated_at/deleted_at).
4. `medical_exams` con bucket separado y retención 20 años explícita.
5. `audit_log` particionado por mes y append-only.
6. `ai_usage.request_hash` indexado para Loop Detector trigger 5.
7. `consents` con versión de política y `revocado_at`.
8. `user_company_role.company_id` nullable para scope consultora.
9. `compromisos` como entidad propia, no jsonb dentro de actas.
10. `pg_boss_jobs` declarada pero administrada por la librería pg-boss.

### Limitaciones conocidas
Pendientes para v1 (ver [`v0.md` §5](v0.md#5-limitaciones-conocidas-de-v0-a-resolver-en-v1--t-f0-024)):
- Integración PILA.
- Plan de capacitación (`training_*`).
- Indicadores SST agregados (Resolución 0312 art. 30).
- Inspecciones planeadas.
- Mantenimientos preventivos / EPP.

### Entregables
- [`v0.mmd`](v0.mmd) — Mermaid ER diagram.
- [`v0.dbml`](v0.dbml) — DBML para dbdiagram.io.
- [`v0.md`](v0.md) — Documento explicativo con diagrama embebido, tabla resumen y decisiones.
- [`changelog.md`](changelog.md) — Este archivo.

---

## v1 — pendiente (T-F0-024)

Se actualizará tras la llamada con Regis (T-F0-020) y la sesión de mapeo CIIU→peligros (T-F0-023). Cambios esperados:
- Refinamiento de campos según vocabulario que use Regis.
- Posible adición de entidades pendientes (PILA, capacitación, indicadores).
- Validación de pesos de `standards_0312` con consultor sénior.
- Casos típicos de la operación de Regis no contemplados aún.
