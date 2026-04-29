# ADR-009 — Testing minimal para concurso

**Estado:** Aceptado | **Fecha:** 2026-04-29

## Decisión

La estrategia de testing para el concurso (entrega 9 mayo 2026) es deliberadamente **mínima y enfocada**:

1. **Unit tests obligatorios** sobre el motor de cumplimiento (`standard_evaluations` → `evaluation_snapshots`, cálculo de % global, breakdown PHVA, breakdown por capítulo). Cobertura objetivo: 100% del cálculo numérico.
2. **1 test e2e** del flujo demo (login → seleccionar empresa → ver dashboard de cumplimiento → abrir un estándar → cargar evidencia → recalcular).
3. **Sin pirámide completa**: no hay integration tests por módulo, ni tests de UI exhaustivos, ni tests de carga.

## Alternativas

- **A: Pirámide completa (unit + integration + e2e + carga)** — pros: cobertura industrial. Contras: tiempo prohibitivo dado el deadline 9 mayo; sobre-ingeniería para una demo de concurso.
- **B: Zero tests** — pros: velocidad máxima. Contras: el motor de cumplimiento es el corazón del demo; un bug numérico en el % se ve en pantalla y mata la credibilidad.
- **C: Minimal (motor + 1 e2e)** — escogida.

## Razón

El motor de cumplimiento es la única parte del sistema donde un bug se traduce inmediatamente en un número incorrecto en pantalla del demo del 6 de mayo (riesgo de credibilidad ante el jurado). Los unit tests sobre cálculo numérico son baratos y de altísimo valor. El e2e del flujo principal previene regresiones del happy path y sirve de smoke test antes de cada deploy. El resto se cubre con QA-Agent manual y sampling del Auditor-Agent.

## Consecuencias

- **Positivas:** tiempo de QA enfocado donde más duele un bug; el motor de cumplimiento queda con red de seguridad; el e2e detecta breakages obvios.
- **Mitigaciones:** el QA-Agent en nivel "estricto" para tareas críticas (motor, RLS, multi-tenancy) compensa la falta de tests automatizados en otras áreas; post-concurso, Bucket B incluirá ampliar la pirámide.

## Referencias

- `governance/01_roles_y_reglas.md` (niveles de QA)
- `tasks/03_tareas_criticas_y_ruta.md` (motor de cumplimiento es ruta crítica)
