# ADR-007 — RBAC: 4 roles funcionales para concurso

**Estado:** Aceptado | **Fecha:** 2026-04-29

## Decisión

Implementar **4 roles** en la tabla `roles` para el demo del concurso:

1. `regis_admin` — admin de la consultora (Regis u otra), ve todas las empresas de su `regis_org_id`.
2. `regis_consultant` — consultor de la consultora con scope limitado a las empresas asignadas.
3. `client_admin` — admin de una empresa cliente, ve únicamente su `company_id`.
4. `worker` — trabajador, ve solo sus propios datos (exámenes, capacitaciones, consentimientos).

Granularidad fina (9+ roles: separar HSE manager, médico ocupacional, brigadista, etc.) queda en **Bucket B post-concurso**.

## Alternativas

- **A: 9 roles granulares** — pros: realismo de organigrama SG-SST (médico ocupacional, HSE manager, brigadista, miembro COPASST, etc.). Contras: combinatoria de RLS explota; cada permiso requiere test multi-tenant; tiempo prohibitivo para el 6 de mayo; el demo no necesita esa granularidad.
- **B: 4 roles funcionales** — escogida.
- **C: 2 roles (admin/usuario)** — pros: mínimo. Contras: no demuestra multi-tenancy real ante el jurado; rompe el principio de adaptabilidad.

## Razón

Los 4 roles cubren los flujos demo: consultora administrando varias empresas, empresa con su admin, trabajador firmando consentimientos y viendo sus exámenes. Es lo mínimo que demuestra multi-tenant real con RLS. Granularidad de 9 es un problema post-concurso y se modela como `roles.permisos JSONB` (ya en ERD) para extender sin migración disruptiva.

## Consecuencias

- **Positivas:** RLS testeable end-to-end en F1; demo creíble ante jurado; `user_company_role.company_id` nullable habilita el scope consultora (D-ERD-08).
- **Mitigaciones:** `roles.permisos` es `JSONB`, lo que permite extender permisos por rol sin DDL adicional. Cuando llegue Bucket B, se agregan roles sin migrar lo existente.

## Referencias

- `docs/erd/v0.md` (`roles`, `user_company_role`, D-ERD-08)
- `governance/01_roles_y_reglas.md`
