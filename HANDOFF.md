# HANDOFF — Estado del proyecto al cierre de sesión

**Última actualización:** 2026-04-30 (cierre F1.5 sub-bloques A/B/C/D)
**Próxima sesión:** lee este archivo PRIMERO

---

## 🎯 LEE ESTO PRIMERO (nueva sesión)

Si eres una nueva instancia de Claude Code retomando este proyecto:

1. Lee este archivo completo
2. Lee `governance/01_roles_y_reglas.md` (constitución de los 3 roles agente)
3. Lee `governance/03_log_decisiones.md` (10 decisiones PM acumuladas)
4. Verifica estado vivo con: `gh issue list --repo dmaorisas/regis-sgsst-platform --state open` (debería retornar solo 1 issue: status dashboard)
5. Tu rol es **PM-Agent (orquestador conversacional)** según `prompts/03_pm_agent_system.md`

---

## Estado actual del proyecto

```
F0 ████████████ 100% Cimientos (Phase Gate firmado)
F1 ████████████ 100% Motor + Dashboards (Phase Gate firmado)
F1.5 █████████░  80% Plumbing (A,B,C,D ✅ — falta E)
F2 ░░░░░░░░░░░   0% PILA + Exámenes (módulos 1+2 del brief)
F3 ░░░░░░░░░░░   0% Matrices + Actas (módulos 3+4)
F4 ░░░░░░░░░░░   0% Plan emergencias (módulo 5)
F5 ░░░░░░░░░░░   0% Hardening + discrepancy report
F6 ░░░░░░░░░░░   0% Video + entrega (9 may)

Avance global: ~38%
20 ciclos aprobados | 90% 1ra iter | ~$18 USD costo IA
```

---

## Decisión inmediata pendiente al retomar

**¿Construir T-F15-015 (orquestación n8n completa) o saltar a F2?**

Mi recomendación al cierre: **saltar a F2** (módulos PILA + exámenes médicos del concurso = entregable visible para el video). T-F15-015 declarado en roadmap, ejecutable después si queda tiempo.

Razón: la orquestación manual (PM-Agent conversacional) ha funcionado muy bien (90% aprobación 1ra iter). Invertir 4h en autonomía interna no agrega valor al producto entregable; los 9 días restantes son mejor invertidos en módulos visibles.

---

## Lo último ejecutado (resumen últimos 5 ciclos)

| Ciclo              | Estado      | Notas                                                                                                   |
| ------------------ | ----------- | ------------------------------------------------------------------------------------------------------- |
| Bloque F1.5-A      | ✅ Aprobado | pg-boss + cola revisión humana + UI `/regis/review-queue`                                               |
| Bloque F1.5-B      | ✅ Aprobado | NotificationService + Resend email + WhatsApp stub + ClaudeClient con tracking + Pino logger (56 tests) |
| Bloque F1.5-C      | ✅ Aprobado | Habeas Data modal + ARCO + validador NIT módulo 11 + calendario hábil colombiano (101 tests)            |
| Bloque F1.5-D      | ✅ Aprobado | storage_metrics migration + measure_storage script + **PRIMER WORKFLOW n8n vía MCP**                    |
| MCP n8n confirmado | ✅ D-010    | Project ID `apHolqjKxJnd6rHP`, primer workflow `8UxvpGlqWe1XaIT8` activo                                |

---

## Decisiones PM activas (10)

`governance/03_log_decisiones.md` tiene el detalle. Resumen:

- D-001: T-F0-037 agregada para Camino C
- D-002: Pivote no-Regis (10 tareas a Bucket B)
- D-003: Multi-empresa adaptable (3 piloto sintéticas)
- D-004: Funcionalidad sobre completitud de datos
- D-005: Política almacenamiento (4 capas)
- D-006: T-F0-024 fusionada con T-F1-001
- D-007: T-F0-039 split (doc F0 / técnico T-F15-014)
- D-008: Wati a Bucket B (email cubre requerimiento)
- D-009: T-F0-037 reubicada al final F1.5 como T-F15-015
- **D-010: MCP n8n conectado** (Project ID `apHolqjKxJnd6rHP`)

---

## Hitos críticos cumplidos (🔥)

- ✅ T-F1-005: Pesos 0312 (suma=100 exacto)
- ✅ T-F1-011: RLS multi-tenant (36 policies, 17 tablas)
- ✅ T-F1-012: Tests aislación (8/8 verde, bidireccional)
- ✅ T-F1-016: Lógica No Aplica (caso 50/30/20→71.43)

Pendientes:

- T-F5-007: Discrepancy report
- T-F6-004: Edición video final

---

## Estado tangible verificable

### App local

```bash
cd "/Users/maoriherrera/Downloads/Claude Projects/Concurso - Regis Colombia"
npm run dev
# → http://localhost:3000
# Login admin@empresa1.test / Demo2026! → ve 68%
# Login admin@regis.test / Demo2026! → portafolio + /regis/review-queue (3 items pendientes)
```

### n8n.dmaori.com

- Project: Dmaori SAS (ID `apHolqjKxJnd6rHP`)
- Workflow proyecto: `8UxvpGlqWe1XaIT8` ([URL](https://n8n.dmaori.com/workflow/8UxvpGlqWe1XaIT8))
- 40 workflows pre-existentes del usuario (Bot Comercial, Asistente Finanzas, etc.)

### Base de datos Supabase (`ltitkmipilzzuvomtlqf`)

- 26 tablas + 13 particiones audit_log + schema `pgboss`
- 60 estándares 0312 (suma=100), 119 peligros, 26 frecuencias documentales
- 3 empresas piloto + 125 trabajadores + 9 comités
- 36 RLS policies en 17 tablas
- Storage: 0.45% del free tier (2.24MB / 500MB)
- 101+ tests automatizados verde

### Repo GitHub

- https://github.com/dmaorisas/regis-sgsst-platform
- 35 commits, 28 issues (20 cerradas/aprobadas, 8 canceladas Bucket B)
- Project board: https://github.com/users/dmaorisas/projects/3

---

## Plan restante (de hoy 30 abr al 9 may)

### Inmediato (decidir al retomar)

- [ ] **F1.5-E (T-F15-015)** — Construir 5 workflows orquestación en n8n vía MCP (~4h) **O** saltar a F2
- [ ] **F1.5 Phase Gate** — GO_CON_AJUSTES si T-F15-015 declarado en roadmap

### Fases siguientes

- **F2 PILA + Exámenes médicos** (módulos 1+2 del brief, ~16h)
  - Watcher Gmail/Drive de PILAs
  - Pipeline extracción IA de exámenes con Claude
  - Bucket separado historia clínica
  - UI gestión + recordatorios
- **F3 Matrices + Actas** (módulos 3+4, ~16h)
  - Catálogo CIIU→peligros (datos ya en DB)
  - Form GTC-45 + IA enrichment
  - Generación actas COPASST/Convivencia
- **F4 Plan emergencias** (módulo 5, ~12h)
  - Audio → Whisper → estructuración IA
- **F5 Hardening + discrepancy report** (~14h)
  - Mobile responsive, modo offline básico, polish UI
  - Discrepancy report (sin Regis: cálculo manual nuestro vs sistema)
- **F6 Video + SOP + Submission** (~21h)

### Spawn tasks pendientes (no bloqueantes, hacerlas si hay tiempo)

1. Limpieza tests integration (deja filas dummy con snapshot_date 2025-01-01)
2. Bug centro principal alfabético en regis/dashboard (promedio 68% en lugar de ~74%)
3. Regenerar NITs sintéticos válidos en seeds (DV módulo 11 incorrecto detectado por T-F15-009)

---

## 📖 Lectura recomendada al retomar (orden)

1. Este archivo (`HANDOFF.md`) — TÚ ESTÁS AQUÍ
2. `governance/01_roles_y_reglas.md` — constitución agentes
3. `governance/03_log_decisiones.md` — 10 decisiones PM
4. `tasks/02_lista_maestra_tareas.md` — plan completo (138 tareas originales)
5. `tasks/03_tareas_criticas_y_ruta.md` — críticas
6. `phases/fase_0_gate.md` y `phases/fase_1_gate.md` — cierres firmados
7. Issues GitHub: `gh issue list --repo dmaorisas/regis-sgsst-platform --state all --limit 30`

## Comandos útiles para retomar

```bash
# Estado vivo
cd "/Users/maoriherrera/Downloads/Claude Projects/Concurso - Regis Colombia"
gh issue list --repo dmaorisas/regis-sgsst-platform --state open
gh project item-list 3 --owner dmaorisas | head -30

# Verificar app
npm run dev

# Verificar tests
npx vitest run

# Verificar storage
set -a; source .env.local; set +a
npx tsx scripts/measure_storage.ts --source=manual

# Verificar workflow n8n
# Abrir: https://n8n.dmaori.com/workflow/8UxvpGlqWe1XaIT8
```

---

## Días al deadline final

- **Hoy:** 30 abr 2026
- **Entrega final:** 9 mayo 2026 (10 días)
- **Buffer disponible:** ~25%

---

**Estado al cierre de esta sesión: SÓLIDO. Sistema operativo, demo-able, tests verde, MCP validado. Ningún blocker.**
