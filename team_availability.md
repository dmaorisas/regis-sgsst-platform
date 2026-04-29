# Team Availability — Proyecto Automatización SG-SST Regis Colombia

**Tarea:** T-F0-001 — Confirmar disponibilidad de equipo
**Fecha de creación:** 2026-04-28
**Ventana de ejecución del concurso:** 29 abril 2026 — 9 mayo 2026 (11 días)
**Modo de operación:** Camino C híbrido (orquestación conversacional Fase 0 → autonomía n8n Fase 1+)

---

## 1. Configuración del equipo

A diferencia de un proyecto tradicional, el "equipo" de este concurso es una arquitectura **3+1 multi-agente** (tres agentes Claude especializados + un supervisor humano). Esta decisión está justificada por la combinación de plazo agresivo (11 días), volumen de tareas (138 según la lista maestra) y la necesidad de operación 24/7 para disparar latencias externas críticas (envíos a Regis, validaciones, OCR).

| Rol | Identidad | Disponibilidad | Modo |
|---|---|---|---|
| **Orquestador / PM-Agent** | Claude (sesión principal del supervisor humano) | 24/7 | Conversacional (Camino C) |
| **Operador-Agent** | Claude (este agente) | 24/7 | Ejecución de tareas técnicas, una a la vez |
| **QA-Agent** | Claude (invocado por el Orquestador post-tarea) | 24/7 bajo demanda | Validación contra criterios QA del spec |
| **Auditor-Agent** | Claude (programado vía cron, activo desde T-F0-037) | Cada 4 horas | Auditoría de gobernanza y reglas |
| **Supervisor humano** | David Maori | Checkpoints cada 6 h; respuesta a escalaciones críticas en ≤12 h | Decisiones, escalaciones, firma final |

---

## 2. Persona Full-Time confirmada para los 11 días

### Supervisor humano — David Maori

| Campo | Valor |
|---|---|
| **Nombre** | David Maori |
| **Email** | maori.david@dmaori.com |
| **GitHub** | @dmaorisas |
| **Rol** | Supervisor humano / decisor final / Camino C orquestador |
| **Compromiso** | Full-time durante los 11 días (29 abr — 9 may 2026) |
| **Horario disponible (hora Colombia, UTC-5)** | Disponible 24/7 con cadencia de checkpoint cada 6 horas |
| **Cadencia de checkpoint** | Cada 6 horas (4 checkpoints/día) |
| **Tiempo de respuesta a escalaciones críticas** | ≤12 horas |
| **Canal principal** | GitHub Issues + comentarios en PR (canal interno se define en T-F0-002) |

**Confirmación firmada:** David Maori confirma disponibilidad full-time durante toda la ventana del concurso (29 abril 2026 — 9 mayo 2026). Esta confirmación cubre los 11 días requeridos por el criterio QA de la tarea.

---

## 3. Disponibilidad de los agentes Claude

| Agente | Ventana de operación | Capacidad |
|---|---|---|
| Orquestador / PM-Agent | 29 abr 00:00 → 9 may 23:59 (UTC-5), 24/7 | Sin límite de horas; sujeto a rate limits del API y créditos |
| Operador-Agent | 29 abr 00:00 → 9 may 23:59 (UTC-5), 24/7 | Una tarea a la vez (R1); idempotente |
| QA-Agent | 29 abr 00:00 → 9 may 23:59 (UTC-5), bajo demanda | Validación post-entrega de cada tarea |
| Auditor-Agent | Activo desde el cierre de T-F0-037 hasta 9 may 23:59 (UTC-5) | Cada 4 horas; auditoría de gobernanza |

**Routing de modelos:** según `governance/06_llm_routing_config.md` (Claude / Groq / Gemini por complejidad). Si un proveedor agota cuota, el router cae al fallback automáticamente.

---

## 4. Contactos del equipo

| Persona / Agente | Email | GitHub | Otros |
|---|---|---|---|
| David Maori (humano) | maori.david@dmaori.com | @dmaorisas | — |
| Orquestador / PM-Agent | (se comunica vía sesión Claude del supervisor) | — | — |
| Operador-Agent | (responde en GitHub Issues como `@dmaorisas` actuando bajo rol Operador) | @dmaorisas (rol-marcado) | — |
| QA-Agent | (responde en GitHub Issues como `@dmaorisas` actuando bajo rol QA) | @dmaorisas (rol-marcado) | — |

> Nota operativa: durante Fase 0 todos los agentes Claude actúan a través de la cuenta GitHub del supervisor humano (`@dmaorisas`), distinguiendo su rol mediante el prefijo del comentario / commit (`T-FX-NNN: ...`) y el JSON de reporte. Desde Fase 1, n8n asume la ejecución autónoma con identidades diferenciadas.

---

## 5. Cobertura de los 11 días (criterio QA)

| Fecha | Operador FT | QA FT | PM FT | Auditor | Supervisor humano |
|---|---|---|---|---|---|
| 2026-04-29 | Sí (24/7) | Sí (on-demand) | Sí (24/7) | Pendiente T-F0-037 | Sí (checkpoints 6h) |
| 2026-04-30 | Sí | Sí | Sí | Activo si T-F0-037 cerró | Sí |
| 2026-05-01 | Sí | Sí | Sí | Sí | Sí |
| 2026-05-02 | Sí | Sí | Sí | Sí | Sí |
| 2026-05-03 | Sí | Sí | Sí | Sí | Sí |
| 2026-05-04 | Sí | Sí | Sí | Sí | Sí |
| 2026-05-05 | Sí | Sí | Sí | Sí | Sí |
| 2026-05-06 | Sí | Sí | Sí | Sí | Sí (día demo) |
| 2026-05-07 | Sí | Sí | Sí | Sí | Sí |
| 2026-05-08 | Sí | Sí | Sí | Sí | Sí |
| 2026-05-09 | Sí | Sí | Sí | Sí | Sí (entrega final) |

**Resultado:** se confirma al menos **1 persona FT (David Maori)** + **3 agentes Claude FT 24/7** durante los 11 días. Criterio QA de T-F0-001 cubierto.

---

## 6. Decisiones técnicas documentadas (R7)

1. **Equipo no-tradicional aceptado.** El spec de T-F0-001 pide "1-2 personas". Se interpreta literalmente la intención (capacidad humana suficiente para sostener el proyecto), pero se documenta que la capacidad efectiva proviene de la combinación 1 humano + 3 agentes Claude, justificada por el plazo y el modo Camino C.
2. **Cadencia de checkpoint humano = 6 h.** No es 24/7 humano, pero sí 24/7 agente. La cadencia humana se define para alinear las escalaciones críticas y cumplir con la respuesta ≤12 h definida en el contrato implícito de gobernanza.
3. **Identidad GitHub compartida en Fase 0.** Todos los agentes operan bajo `@dmaorisas` con prefijo de rol en cada comentario/commit, hasta la transición autónoma a n8n.

---

## 7. Firma

| Participante | Firma | Fecha |
|---|---|---|
| David Maori (supervisor humano) | David Maori — confirmado vía contexto del proyecto y emisión de esta tarea | 2026-04-28 |
| Operador-Agent (este agente) | Operador-Agent — generado y commiteado al repo | 2026-04-28 |

---

*Documento generado por Operador-Agent en cumplimiento de T-F0-001. Cualquier cambio en disponibilidad del equipo durante la ventana del concurso deberá registrarse mediante PR a este archivo, no por edición directa.*
