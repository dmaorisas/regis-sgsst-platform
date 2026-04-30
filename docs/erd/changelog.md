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

## v1 — 2026-04-29 (T-F1-001, D-006 fusion)

**Autor:** Operador-Agent
**Tarea:** [T-F1-001](../../tasks/02_lista_maestra_tareas.md#t-f1-001--supabase-migrations-pipeline--erd-v1-d-006-fusion) (absorbe T-F0-024 por D-006)
**Issue:** [#19](https://github.com/dmaorisas/regis-sgsst-platform/issues/19)
**Estado:** Borrador — pendiente QA estándar.

### Resumen

Refinamiento de v0 incorporando los aprendizajes del dossier normativo público de [T-F0-038](https://github.com/dmaorisas/regis-sgsst-platform/issues/15) (QA-aprobado el 2026-04-28). Se alinean tres tablas a sus respectivos seeds JSON y se agrega una tabla nueva de frecuencias. Sustituye al planeado T-F0-024 conforme D-006 (fusión migrations + ERD v1, ver [governance/03_log_decisiones.md](../../governance/03_log_decisiones.md)).

### Cambios respecto a v0

1. **`standards_0312` (refinado, +9 campos):** alineado a `docs/research/standards_0312_seed.json`.
   - Renombre `peso → weight_capitulo_iii numeric(5,2)`.
   - Reemplazo `capitulo TEXT` → `applies_chapter_i/ii/iii BOOLEAN`.
   - Nuevos: `evidence_types TEXT[]`, `frequency_days INT`, `is_critical BOOLEAN`, `requires_validation_with_regis BOOLEAN`, `grupo TEXT`, `subgrupo TEXT`, `source_reference TEXT`.
2. **`ciiu_hazard_mapping` (refinado, +5 campos):** alineado a `docs/research/ciiu_hazard_mapping_seed.json`.
   - Renombre `peligro_descripcion → peligro_nombre`.
   - Nuevos: `peligro_fuente`, `possible_effects TEXT[]`, `suggested_controls TEXT[]`, `reference TEXT`, `ciiu_description TEXT` (denormalizado), `applicable_chapter TEXT`.
3. **`document_frequencies` (nueva):** PK natural `document_type TEXT`, materializa los 26 documentos de `docs/research/frequencies_seed.json`.
4. **`document_types` (mínimo):** +1 campo opcional `document_frequency_code TEXT` (FK a `document_frequencies`).
5. **Cosmético:** v1 cuenta correctamente 36 entidades en el header (la línea "33 totales" del v0 se mantiene en v0 — no se reedita por R5; v1 redacta correcto desde el inicio).

### Entidades v1 (36)

35 v0 + `document_frequencies`. Tabla resumen completa en [`v1.md` §3](v1.md#3-tabla-resumen-de-entidades-36-totales).

### Decisiones de diseño nuevas (D-ERD-11 a D-ERD-16)

Documentadas en [`v1.md` §4](v1.md#4-decisiones-de-diseño-nuevas-en-v1-r7):

1. D-ERD-11 — `applies_chapter_i/ii/iii` como booleans en lugar de `capitulo TEXT`.
2. D-ERD-12 — `requires_validation_with_regis` como flag de transparencia.
3. D-ERD-13 — Renombre `peso → weight_capitulo_iii` con `numeric(5,2)`.
4. D-ERD-14 — `document_frequencies` con PK natural en lugar de UUID.
5. D-ERD-15 — Denormalizar `ciiu_description` en `ciiu_hazard_mapping`.
6. D-ERD-16 — `document_types.document_frequency_code` opcional, no obligatorio.

Las 10 decisiones D-ERD-01 a D-ERD-10 de v0 siguen vigentes.

### Entregables

- [`v1.mmd`](v1.mmd) — Mermaid ER diagram completo.
- [`v1.dbml`](v1.dbml) — DBML para dbdiagram.io.
- [`v1.md`](v1.md) — Documento explicativo + diff vs v0 + decisiones nuevas.
- [`changelog.md`](changelog.md) — Este archivo.

### Pipeline de migrations

T-F1-001 también materializa el pipeline de Supabase migrations:

- `supabase/config.toml` (commiteado).
- `supabase/migrations/20260430012121_init.sql` (migration de prueba).
- Tabla `_migration_test` aplicada al proyecto remoto `ltitkmipilzzuvomtlqf` y registrada en `supabase_migrations.schema_migrations`.

Las migrations 001+ que materializan v1 en SQL son responsabilidad de tareas posteriores (T-F1-002+).

### Limitaciones que persisten

Sin cambios respecto a v0 ([`v0.md` §5](v0.md#5-limitaciones-conocidas-de-v0-a-resolver-en-v1--t-f0-024)): PILA, plan de capacitación, indicadores SST agregados, inspecciones planeadas, mantenimientos preventivos / EPP. No son ruta crítica para el demo del 6 de mayo.
