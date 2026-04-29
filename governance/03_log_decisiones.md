# Log de Decisiones del Proyecto

**Propósito:** Registro inmutable de todas las decisiones tomadas por el PM durante la ejecución. Cada entrada se agrega al final, nunca se modifica.

**Formato:**
```
### D-NNN — [Título corto]
**Fecha:** YYYY-MM-DD HH:MM
**Tomada por:** [PM name]
**Tipo:** [Modificación de plan / Resolución de disputa / Excepción / Aprobación de cambio]

**Contexto:**
[Qué disparó la decisión, en 2-3 líneas]

**Decisión:**
[Una frase clara]

**Razón:**
[Por qué se decide así, especialmente si va contra la opinión de Operador o QA]

**Cambios concretos:**
- [Tarea X agregada]
- [Tarea Y movida a Bucket B]
- [Criterio Z modificado]

**Impacto en cronograma:**
[Días o tareas impactadas]

**Notificados:**
[Operador, QA, fecha-hora de notificación]
```

---

## Log de decisiones

### D-001 — Agregar T-F0-037 al master list para Camino C híbrido
**Fecha:** 2026-04-29 14:20
**Tomada por:** PM-Agent (orquestador conversacional)
**Tipo:** modificacion_plan

**Contexto:**
El usuario eligió Camino C (orquestación híbrida): orquestación conversacional para Fase 0, transición a n8n autónomo para Fase 1+. Esto requiere construir los workflows n8n antes del cierre de Fase 0.

**Decisión:**
Agregar T-F0-037 "Construir orquestación autónoma de agentes en n8n (Camino C)" al final de Fase 0, después del Phase Gate (T-F0-036).

**Razón:**
Sin esta tarea, la transición Fase 0 → Fase 1 no tiene mecanismo de orquestación autónomo. El Camino C lo exige explícitamente.

**Cambios concretos:**
- `tasks/02_lista_maestra_tareas.md`: agregada T-F0-037 (240 min, nivel_qa estricto, depende de T-F0-036)
- Issue GitHub #12 creado y agregado al project board
- Total tareas Fase 0: 36 → 37

**Impacto en cronograma:**
- Fase 0 extendida ~4h (240 min de T-F0-037)
- Inicio Fase 1: ~30 abr noche en lugar de 30 abr mañana

**Notificados:**
- Operador-Agent (por contexto en próxima asignación)
- QA-Agent (por contexto)
- Supervisor humano (David, vía esta conversación)

**Risk assessment:**
Bajo. Solo agrega tarea, no remueve ni modifica dependencias previas. La complejidad técnica de T-F0-037 está mitigada por specs detalladas en `governance/07_auditor_agent_spec.md` y `security/`.

---
