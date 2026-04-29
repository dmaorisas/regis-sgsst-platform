# Veredicto QA — T-FX-NNN

**QA:** QA-Agent
**Iteración:** 1 / 2 / escalada
**Nivel QA aplicado:** estricto / estándar / ligero
**Inicio:** YYYY-MM-DD HH:MM
**Fin:** YYYY-MM-DD HH:MM
**Tiempo invertido:** Xmin

---

## Verificación de reglas del Operador

- ✅ R1 Operador trabajó solo una tarea — _evidencia_
- ✅ R2 Dependencias estaban aprobadas — _evidencia_
- ✅ R3 Operador no se auto-aprobó — _evidencia_
- ✅ R4 Tarea ejecutada en orden — _evidencia_
- ✅ R5 No modificó specs/ADRs — _evidencia_
- ✅ R6 Sin ambigüedades / generó flag_concern — _evidencia_
- ✅ R7 Decisiones documentadas en reporte — _evidencia_

**Si alguna regla violada → rechazo automático sin importar contenido.**

---

## Verificación de criterios

| # | Criterio del spec | Resultado | Evidencia verificada |
|---|---|---|---|
| 1 | [criterio 1] | ✅ pasa | [archivo/output que demuestra] |
| 2 | [criterio 2] | ❌ falla | [qué exactamente falta] |
| 3 | [criterio 3] | ✅ pasa | [...] |

---

## Verificación de integración

- ✅ Tests previos siguen pasando
- ✅ No rompe trabajo de tareas anteriores aprobadas
- _Evidencia: [tests ejecutados, output]_

---

## Veredicto

**[APROBADA | RECHAZADA | RECHAZADA_CON_AJUSTES | ESCALADA_PM]**

---

## Feedback al Operador (si rechazada)

[Específico, accionable, sin ambigüedad]

**Para aprobar la siguiente iteración necesito ver:**
- [ ] [Cosa específica 1]
- [ ] [Cosa específica 2]

---

## Concerns sistémicos detectados

[Si nada → escribir "Ninguno". Si hay → describir + flag_concern al PM]

---

## Métricas de esta validación

- Criterios verificados: N/N
- Iteración: 1/2
- Tiempo invertido: Xmin (esperado para nivel: Ymin)
- Confianza en veredicto: alta/media/baja
