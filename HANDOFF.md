# HANDOFF — Estado del proyecto al cierre de sesión

**Última actualización:** 2026-04-30 (cierre Fase 1)
**Próxima sesión:** lee este archivo PRIMERO + los listados al final

---

## Estado actual del proyecto

```
F0 ████████████ 100% Cimientos (Phase Gate firmado: phases/fase_0_gate.md)
F1 ████████████ 100% Motor + Dashboards (Phase Gate firmado: phases/fase_1_gate.md)
F1.5 █░░░░░░░░░  ~7% Plumbing (Bloque A entregado por Operador, pendiente QA)
F2 ░░░░░░░░░░░   0% PILA + Exámenes médicos
F3 ░░░░░░░░░░░   0% Matrices + Actas
F4 ░░░░░░░░░░░   0% Plan emergencias + Checkpoint Regis (4 may)
F5 ░░░░░░░░░░░   0% Hardening
F6 ░░░░░░░░░░░   0% Video + entrega (9 may)

Avance global: ~33%
Tasa aprobación 1ra iteración: 88%
Costo IA acumulado estimado: ~$15 USD
```

---

## Lo que está EN PROGRESO (al cierre)

**Issue #25** — Bloque F1.5-A (pg-boss + cola revisión humana + UI revisión)

- **Estado:** Entregado por Operador en commit `9e09e1b`, NO cerrado (esperando QA)
- **Reporte de Operador:** https://github.com/dmaorisas/regis-sgsst-platform/issues/25#issuecomment-4354238508
- **Lo que entregó:**
  - pg-boss 12.18.1 instalado, schema `pgboss` creado en Supabase
  - Migration `20260430162038_review_queue.sql` aplicada (tabla `ai_outputs_pending_review`)
  - UI `/regis/review-queue` + `/regis/review-queue/[id]` con server actions approve/reject
  - 3 items dummy seedeados
  - Tests + build + lint verde
- **Próxima acción:** spawn QA-Agent para validar (nivel estándar)

---

## Lo que sigue después de F1.5-A QA

| Bloque F1.5                     | Tareas                                                          | Tiempo |
| ------------------------------- | --------------------------------------------------------------- | ------ |
| **A** (entregado, pendiente QA) | T-F15-001/002/003                                               | ~3h    |
| **B**                           | T-F15-004/005/006/011/012 (notificaciones + AI tracking + Pino) | ~2h    |
| **C**                           | T-F15-007/008/009/010 (Habeas Data + validadores)               | ~2h    |
| **D**                           | T-F15-014 (cleanup workflows)                                   | ~1.5h  |
| **E**                           | **T-F15-015 (n8n orchestration)** ← LA GRANDE                   | ~4h    |
| **F**                           | T-F15-013 (Phase Gate F1.5)                                     | ~30min |

Después: F2 (módulos PILA + exámenes médicos del concurso).

---

## Decisión pendiente del supervisor sobre n8n (T-F15-015)

Para construir los 5 workflows n8n, el supervisor (David) debe elegir:

- **A) MCP del n8n** — yo me conecto, automatizado completo (~30min setup MCP)
- **B) JSON manual** — Operador genera, David importa en n8n web UI
- **C) API REST n8n** — Operador crea via POST /rest/workflows
- **D) Híbrido recomendado** — Operador genera JSON + crea via API + David valida visualmente

Decisión propuesta por PM-Agent: **Opción D**.

---

## Decisiones PM activas (10)

Lee `governance/03_log_decisiones.md`. Resumen:

- D-001: T-F0-037 agregada para Camino C
- D-002: Pivote no-Regis (10 tareas a Bucket B)
- D-003: Multi-empresa adaptable, 3 piloto
- D-004: Funcionalidad sobre completitud de datos
- D-005: Política almacenamiento (4 capas)
- D-006: T-F0-024 fusionada con T-F1-001
- D-007: T-F0-039 split (doc F0 / técnico T-F15-014)
- D-008: Wati a Bucket B (email cubre requerimiento)
- D-009: T-F0-037 reubicada al final F1.5 como T-F15-015

---

## Hitos críticos cumplidos (🔥)

- ✅ T-F1-005: Pesos 0312 (suma=100 exacto)
- ✅ T-F1-011: RLS multi-tenant (36 policies, 17 tablas)
- ✅ T-F1-012: Tests aislación (8/8 verde, bidireccional)
- ✅ T-F1-016: Lógica No Aplica (caso 50/30/20→71.43)

Pendientes:

- T-F5-007: Discrepancy report (con cliente real público)
- T-F6-004: Edición video final

---

## Estado tangible verificable

### App local

```bash
cd "/Users/maoriherrera/Downloads/Claude Projects/Concurso - Regis Colombia"
npm run dev
# → http://localhost:3000
# Login: admin@empresa1.test / Demo2026! → ve 68%
# Login: admin@regis.test / Demo2026! → ve portafolio 3 empresas
# Login: admin@regis.test → /regis/review-queue → 3 items pendientes
```

### Base de datos Supabase

- Project: `ltitkmipilzzuvomtlqf`
- 25 tablas + 13 particiones audit + schema `pgboss`
- 60 estándares 0312 (suma=100), 119 peligros, 26 frecuencias
- 3 empresas + 125 trabajadores + 9 comités
- 36 RLS policies en 17 tablas + 3 policies en review queue
- 51 tests verde

### Repo

- https://github.com/dmaorisas/regis-sgsst-platform
- 27 commits, 25 issues (16 cerradas/aprobadas, 8 canceladas Bucket B, 1 en QA)

---

## Para retomar en nueva sesión

**Lee primero (en este orden):**

1. Este archivo (`HANDOFF.md`)
2. `governance/01_roles_y_reglas.md` (constitución agentes)
3. `governance/03_log_decisiones.md` (10 decisiones PM)
4. `tasks/02_lista_maestra_tareas.md` (plan completo)
5. `tasks/03_tareas_criticas_y_ruta.md` (críticas)
6. `phases/fase_0_gate.md` y `phases/fase_1_gate.md` (cierres firmados)
7. GitHub Issues #25 (estado actual: pendiente QA)

**Comando útil para ver estado vivo:**

```bash
# Estado de issues
gh issue list --repo dmaorisas/regis-sgsst-platform --state open

# Estado del project board
gh project item-list 3 --owner dmaorisas | head -30
```

**Próxima acción recomendada al retomar:**

1. Validar QA del Bloque F1.5-A (Issue #25)
2. Si aprueba: avanzar a Bloque B (notificaciones + AI tracking + Pino)
3. Decisión supervisor sobre opción n8n (A/B/C/D)

---

## Días al deadline

- **Checkpoint Regis** (4 may): 5 días (NOTA: este checkpoint era del plan original con Regis activo, sin contacto Regis no aplica)
- **Entrega final** (9 may): 10 días

Plan ajustado por D-002:

- 30 abr - 1 may: F1.5 Plumbing (~12h)
- 1 may - 3 may: F2 PILA + Exámenes (~16h)
- 3 may - 4 may: F3 Matrices + Actas (~16h)
- 4 may - 5 may: F4 Plan emergencias + recuperación (~12h)
- 5 may - 7 may: F5 Hardening + discrepancy report (~14h)
- 7 may - 9 may: F6 Video + SOP + submission (~21h)

Buffer ~25% asumido en estimaciones.
