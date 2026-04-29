# Sistema de Gobernanza — Concurso Regis Colombia
**Versión:** 1.0 | **Vigencia:** 29 abril – 9 mayo 2026 | **Estado:** Lockeado

> Este documento define las reglas inquebrantables de operación del proyecto. Las reglas marcadas como **INQUEBRANTABLES** no pueden modificarse durante la ejecución bajo ninguna circunstancia, incluso si el equipo está bajo presión, cansado, o cree tener una buena razón. Cualquier cambio a estas reglas requiere reescribir este documento y firmarlo por las tres partes.

---

## 1. Principio rector supremo

> **"Un cliente real con datos reales mostrando un % calculado el 6 de mayo vale más que 6 módulos sintéticos perfectos."**

Cuando exista conflicto entre cualquier regla de este documento y este principio, **gana el principio**. Cuando exista duda sobre cualquier decisión, este principio es el desempate.

---

## 2. Los tres roles

### 2.1 OPERADOR (Operator / Builder)

**Misión:** Ejecutar tareas una a la vez, en el orden definido por la lista maestra, hasta que todas estén completas.

**Responsabilidades:**
- Tomar la siguiente tarea pendiente de la lista maestra (la de menor número que no esté en estado `aprobada`).
- Verificar que las dependencias declaradas de la tarea estén `aprobadas` antes de iniciar.
- Ejecutar la tarea exactamente como está descrita.
- Documentar el progreso: qué se hizo, qué decisiones se tomaron, qué obstáculos surgieron, qué evidencia existe (commits, archivos, capturas, links).
- Entregar a QA con un reporte de ejecución estandarizado (formato en sección 7).
- Reintentar la tarea si QA la rechaza, atendiendo el feedback recibido.

**Lo que el Operador PUEDE hacer:**
- Ejecutar la tarea con autonomía dentro de los límites de su descripción.
- Tomar decisiones técnicas menores no especificadas (nomenclatura de variables, layout de componentes, estructura interna de funciones) siempre que respeten ADRs.
- Hacer preguntas al PM si la tarea no es clara, en formato escrito.
- Levantar la mano (`flag_concern`) si encuentra que una tarea es imposible, contradice el principio rector, o detecta un riesgo grave.

**Lo que el Operador NO PUEDE hacer (INQUEBRANTABLE):**
- ❌ Ejecutar tareas fuera de orden (saltarse una pendiente para hacer una posterior).
- ❌ Modificar la lista de tareas sin aprobación del PM.
- ❌ Validar su propio trabajo (eso es función del QA).
- ❌ Marcar una tarea como `aprobada` (solo el QA puede).
- ❌ Cambiar ADRs ya escritos (debe levantar `flag_concern` al PM).
- ❌ Continuar a la siguiente tarea si QA aún no aprobó la actual.
- ❌ Ocultar errores o trabajo a medias.

**Output obligatorio por cada tarea:**
- Reporte de ejecución (formato en sección 7).
- Evidencia tangible (commit hash, archivo creado, captura de pantalla, link a documento, log de comando ejecutado).
- Lista de decisiones tomadas que no estaban en el spec.

---

### 2.2 QA (Quality Assurance)

**Misión:** Validar cada tarea ejecutada por el Operador contra (a) el spec de la tarea, (b) el objetivo de la fase, (c) el principio rector, y (d) la integridad funcional con el trabajo previo.

**Responsabilidades:**
- Recibir entrega del Operador con su reporte de ejecución.
- Verificar uno a uno los criterios de validación de la tarea.
- Probar funcionalidad cuando aplica (correr el código, abrir el archivo, ejecutar el flujo).
- Verificar integración: ¿la tarea ejecutada rompe alguna tarea previa ya aprobada?
- Emitir veredicto: `APROBADA` / `RECHAZADA` / `RECHAZADA_CON_AJUSTES`.
- Si rechaza: dejar feedback específico, accionable, sin ambigüedad. Citar exactamente qué criterio no se cumplió.

**Lo que el QA PUEDE hacer:**
- Rechazar tareas que cumplen "casi todos" los criterios pero fallan uno (no hay parcial-aprobación).
- Solicitar evidencia adicional al Operador.
- Sugerir mejoras menores (sin obligar) que no están en el spec pero ayudarían a la calidad.
- Levantar `flag_concern` al PM si nota patrones sistémicos (ej: 3 tareas seguidas con bugs similares).

**Lo que el QA NO PUEDE hacer (INQUEBRANTABLE):**
- ❌ Ejecutar la tarea por el Operador (separación de roles).
- ❌ Modificar el código/entregable que está validando.
- ❌ Aprobar una tarea sin verificar todos los criterios listados en su spec.
- ❌ Aprobar trabajo que rompe funcionalidad previa.
- ❌ Cambiar criterios de validación de una tarea (eso es función del PM).
- ❌ Rechazar una tarea por razones fuera del spec de esa tarea (si descubre algo sistémico, escala al PM).

**Niveles de rigor del QA:**

| Nivel | Cuándo | Qué hace |
|---|---|---|
| **Estricto** | Tareas en ruta crítica del demo, motor de cumplimiento, multi-tenancy/RLS, datos reales | Verifica criterio por criterio, prueba funcionalmente, busca activamente edge cases |
| **Estándar** | Mayoría de tareas | Verifica criterios listados, prueba flujo principal |
| **Ligero** | Tareas administrativas, documentación, configuración inicial | Verifica que existan los entregables y sean coherentes |

El nivel de cada tarea está en su spec (campo `nivel_qa`).

**Output obligatorio por cada tarea validada:**
- Veredicto: `APROBADA` / `RECHAZADA` / `RECHAZADA_CON_AJUSTES`.
- Lista de criterios verificados con su resultado (✅/❌).
- Si rechaza: feedback específico citando el criterio que falló y qué se necesita para aprobar.
- Tiempo invertido en la validación.

---

### 2.3 PROJECT MANAGER (PM)

**Misión:** Liderar la ejecución global del proyecto. Garantizar que el Operador esté alineado con el objetivo, que el QA esté validando con el rigor correcto, y que el plan siga teniendo sentido a medida que avanza la realidad.

**Responsabilidades:**
- Mantener actualizada la lista maestra de tareas y aprobar cualquier modificación.
- Resolver disputas entre Operador y QA cuando hay segunda iteración rechazada (sección 4).
- Hacer revisión al cierre de cada fase (gate de fase).
- Detectar deriva de alcance, priorización mal hecha, o atrasos sistémicos.
- Defender el principio rector activamente.
- Decidir si una sugerencia de Operador o QA debe integrarse al plan o descartarse.

**Lo que el PM PUEDE hacer (autoridad exclusiva):**
- Modificar la lista de tareas (agregar, eliminar, reordenar) con justificación documentada.
- Cambiar criterios de validación de una tarea con justificación documentada.
- Mover tareas entre buckets A/B/C/D.
- Detener una fase si los riesgos lo ameritan.
- Cambiar el nivel de QA de una tarea.
- Romper empate entre Operador y QA en una segunda iteración rechazada.
- Aprobar excepciones puntuales al flujo (con razón documentada).

**Lo que el PM NO PUEDE hacer (INQUEBRANTABLE):**
- ❌ Ejecutar tareas (no es su rol).
- ❌ Validar tareas (no es su rol).
- ❌ Modificar el principio rector.
- ❌ Modificar las reglas de este documento sin reescribirlo formalmente.
- ❌ Aprobar saltarse una tarea sin reordenarla explícitamente en la lista maestra.
- ❌ Cambiar el plan por capricho — toda modificación requiere razón documentada.
- ❌ Sustituir al QA en su veredicto (puede pedir reanálisis, no imponer aprobación).

**Output obligatorio por cada decisión:**
- Decisión tomada.
- Razón documentada en el log de decisiones.
- Impacto en la lista de tareas (qué cambia).
- Notificación al Operador y QA.

---

## 3. Flujo de comunicación

### 3.1 Ciclo estándar (90% de los casos)

```
                 ┌─────────────┐
                 │  PM define  │
                 │ siguiente   │
                 │   tarea     │
                 └──────┬──────┘
                        │
                        ▼
                 ┌─────────────┐
                 │  Operador   │
                 │  ejecuta    │
                 │   tarea     │
                 └──────┬──────┘
                        │
                        ▼
                 ┌─────────────┐
                 │  Operador   │
                 │  entrega a  │
                 │     QA      │
                 └──────┬──────┘
                        │
                        ▼
                 ┌─────────────┐
                 │     QA      │
                 │   valida    │
                 └──────┬──────┘
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
         APROBADA              RECHAZADA
              │                   │
              ▼                   ▼
         siguiente          Operador
          tarea             corrige y
                            re-entrega
```

### 3.2 Ciclo de re-trabajo (segunda iteración)

```
RECHAZADA
   ↓
Operador corrige (atendiendo feedback específico de QA)
   ↓
Re-entrega a QA
   ↓
QA valida segunda vez
   ↓
   ├── APROBADA → siguiente tarea
   └── RECHAZADA otra vez → ESCALAR A PM (regla anti-loop, sección 4)
```

### 3.3 Escalación al PM

```
PM revisa caso (Operador entrega + feedback QA)
   ↓
PM decide:
   ├── Operador tenía razón → instruye QA aprobar (con condición o sin)
   ├── QA tenía razón → instruye Operador rehacer con guía adicional
   ├── Ambos parcialmente correctos → modifica spec de la tarea + reinicia ciclo
   └── La tarea no tiene sentido en este punto → mueve tarea (Bucket B/C/D, o reordena)
```

### 3.4 Canales de comunicación

| Canal | Para qué | Quién lo usa |
|---|---|---|
| **Reporte de ejecución** | Operador → QA, entrega de tarea | Operador |
| **Veredicto de validación** | QA → Operador (y al log) | QA |
| **Flag de concern** | Operador o QA → PM, problemas detectados | Operador, QA |
| **Decisión de PM** | PM → todos, cambios al plan | PM |
| **Daily check-in** | Sincronización inicio/fin de día | Los tres |
| **Phase gate review** | Cierre de fase | Los tres juntos |

---

## 4. Reglas anti-loop (INQUEBRANTABLES)

Para evitar que Operador y QA queden en bucle infinito de rechazos:

**Regla 4.1 — Máximo 2 iteraciones por tarea entre Operador y QA.**
- Iteración 1: Operador ejecuta → QA valida → si rechaza, vuelve a Operador.
- Iteración 2: Operador corrige → QA valida → si rechaza nuevamente, **escalación obligatoria al PM**.
- No hay iteración 3 sin intervención del PM.

**Regla 4.2 — El feedback de QA debe ser accionable.**
- Si QA rechaza, debe especificar exactamente qué criterio falló y qué necesita ver para aprobar.
- Feedback como "no me gusta" o "podría estar mejor" es inválido — el Operador puede rechazar el rechazo y elevarlo al PM.

**Regla 4.3 — Cambio de spec rompe el contador de iteraciones.**
- Si el PM modifica la spec de una tarea, el contador de iteraciones vuelve a cero.

**Regla 4.4 — El tiempo es un límite duro.**
- Cualquier tarea que tarde más del **doble** del tiempo estimado se escala automáticamente al PM, independientemente de iteraciones.
- El PM decide: extender, recortar alcance, mover a Bucket B/C/D, o reasignar.

**Regla 4.5 — Disagreement protocol.**
- Si Operador cree que QA está rechazando incorrectamente, puede invocar `disagreement` enviando su caso al PM **sin** rehacer la tarea.
- PM revisa y emite decisión vinculante.
- Esto se usa cuando el QA rechaza por razones fuera del spec o aplica criterios inconsistentes.

---

## 5. Matriz de autoridad

| Decisión | Operador | QA | PM |
|---|:-:|:-:|:-:|
| Ejecutar tarea | ✅ | ❌ | ❌ |
| Aprobar tarea | ❌ | ✅ | Solo en escalación |
| Rechazar tarea | ❌ | ✅ | Solo en escalación |
| Crear tarea nueva | Sugiere | Sugiere | ✅ |
| Eliminar tarea | Sugiere | Sugiere | ✅ |
| Reordenar tareas | Sugiere | Sugiere | ✅ |
| Cambiar criterio de validación | ❌ | Sugiere | ✅ |
| Cambiar ADR | Sugiere | Sugiere | ✅ |
| Cerrar fase (gate) | ❌ | Recomienda | ✅ |
| Decidir Bucket A/B/C/D | Sugiere | Sugiere | ✅ |
| Modificar este documento | ❌ | ❌ | Reescribir formal |

---

## 6. Reglas estructurales (INQUEBRANTABLES)

**R6.1 — Separación de roles.** Una persona no puede ser Operador y QA simultáneamente en la misma tarea. Si el equipo es de 1 persona, debe alternar conscientemente: ejecuta como Operador → cambia de modo y valida como QA → cambia de modo y revisa como PM. Cada cambio de modo debe documentarse.

**R6.2 — No tarea sin spec.** Toda tarea ejecutada debe tener spec previo en la lista maestra. Trabajo ad-hoc sin tarea creada va al limbo y debe regularizarse con creación retroactiva de tarea por el PM.

**R6.3 — Toda decisión documentada.** Decisiones del PM, veredictos del QA, y reportes del Operador van a un log de proyecto. Sin log, no hay decisión.

**R6.4 — Estados de tarea inmutables.** Una tarea solo puede estar en uno de estos estados: `pendiente` / `en_progreso` / `entregada_qa` / `aprobada` / `rechazada` / `escalada_pm` / `bloqueada` / `cancelada`. Las transiciones permitidas están definidas en sección 8.

**R6.5 — Trazabilidad obligatoria.** Toda tarea aprobada debe tener evidencia verificable: commit hash, link a archivo, captura, log. Sin evidencia, no hay aprobación.

**R6.6 — Daily ritual.** Tres momentos no negociables al día:
- **09:00 — Standup:** los 3 roles revisan estado, próximas tareas, blockers.
- **14:00 — Mid-day check:** progreso vs plan, ajustes de tarde si hace falta.
- **18:00 — Closing:** cierre del día, log de avance, definición del primer task de mañana.

**R6.7 — Phase gate.** Al final de cada fase, los 3 roles hacen revisión conjunta. La fase no se cierra hasta que el PM apruebe formalmente el gate. Sin gate aprobado, no se inicia la siguiente fase.

**R6.8 — El principio rector es desempate.** Cualquier conflicto que no esté resuelto por las reglas se resuelve apelando al principio rector.

---

## 7. Formatos estandarizados

### 7.1 Reporte de ejecución (Operador → QA)

```markdown
## Tarea: [ID y título]
**Operador:** [nombre]
**Inicio:** [fecha-hora]
**Fin:** [fecha-hora]
**Tiempo invertido:** [horas:minutos]

### ¿Qué hice?
[Descripción narrativa de lo ejecutado, paso a paso si es necesario]

### Evidencia
- [Commit hash, link, archivo, captura]
- [...]

### Decisiones no especificadas en el spec
- [Decisión 1 + razón]
- [Decisión 2 + razón]

### Obstáculos encontrados
- [Si hubo, cómo se resolvieron]

### Confianza en el entregable
[Alta / Media / Baja] — [razón si no es Alta]

### Listo para QA
[✅ / Bloqueado por: ...]
```

### 7.2 Veredicto de QA (QA → Operador y log)

```markdown
## Validación tarea: [ID y título]
**QA:** [nombre]
**Inicio:** [fecha-hora]
**Fin:** [fecha-hora]
**Iteración:** [1 / 2 / escalada]

### Criterios verificados
- ✅ [Criterio 1] — [evidencia]
- ✅ [Criterio 2] — [evidencia]
- ❌ [Criterio 3] — [qué falla]
- [...]

### Veredicto
[APROBADA / RECHAZADA / RECHAZADA_CON_AJUSTES]

### Feedback al Operador (si rechazada)
[Específico, accionable, sin ambigüedad]
- Para aprobar la siguiente iteración necesito: [...]

### Riesgos detectados (escalar al PM si aplica)
[Si nota algo sistémico fuera del scope de esta tarea]
```

### 7.3 Flag de concern (Operador o QA → PM)

```markdown
## Flag: [tipo: bloqueante / sistémico / decisión / contradicción]
**Origen:** [Operador / QA]
**Tarea relacionada:** [ID]
**Severidad:** [crítica / alta / media]

### Situación
[Qué pasó, en 2-3 líneas]

### Por qué levanto el flag
[Por qué esto requiere intervención del PM y no se resuelve solo]

### Opciones que veo
1. [Opción A]
2. [Opción B]

### Mi recomendación
[Cuál opción y por qué]

### Tiempo de respuesta esperado
[Crítico = inmediato / Alto = 1 hora / Medio = 4 horas]
```

### 7.4 Decisión del PM

```markdown
## Decisión PM: [identificador, ej D-014]
**Fecha:** [fecha-hora]
**Contexto:** [qué disparó la decisión]

### Decisión
[Una frase clara]

### Razón
[Por qué se decide así]

### Cambios al plan
- [Tarea X agregada]
- [Tarea Y movida a Bucket B]
- [...]

### Impacto en cronograma
[Días impactados]

### Notificados
[Operador, QA, fecha-hora]
```

---

## 8. Estados de tarea y transiciones permitidas

```
[pendiente]
    │
    │ Operador toma tarea (verifica dependencias)
    ▼
[en_progreso]
    │
    │ Operador entrega
    ▼
[entregada_qa]
    │
    ├── QA aprueba ──► [aprobada] (estado final)
    │
    ├── QA rechaza ──► [rechazada]
    │                       │
    │                       │ Operador corrige
    │                       ▼
    │                  [en_progreso] (iteración 2)
    │
    └── 2da rechazo o disagreement ──► [escalada_pm]
                                              │
                                              │ PM decide
                                              ▼
                                  [pendiente] / [aprobada] / [cancelada]

Estados especiales:
- [bloqueada]: dependencia no resuelta o factor externo. PM debe resolver.
- [cancelada]: PM cancela la tarea (movida a Bucket B/C/D o eliminada).
```

**Transiciones prohibidas:**
- ❌ `pendiente` → `aprobada` (sin pasar por ejecución y QA).
- ❌ `entregada_qa` → `pendiente` (debe pasar por veredicto).
- ❌ `aprobada` → cualquier otro estado (es final).

---

## 9. Phase gate — criterio de cierre de fase

Una fase se cierra cuando:
1. ✅ Todas las tareas de la fase en estado `aprobada` o explícitamente `cancelada`.
2. ✅ Hito de validación de la fase verificado por los 3 roles.
3. ✅ Documentación de la fase actualizada (decisiones, riesgos, lecciones).
4. ✅ Lista de tareas de la siguiente fase revisada y ajustada según lo aprendido.
5. ✅ PM firma el gate con timestamp y nota.

**Si alguno de los 5 puntos falla, la fase no se cierra.** Es preferible extender la fase un día que cerrar prematuramente.

---

## 10. Excepciones permitidas

**E10.1 — Emergencia operativa.** Si el sistema está caído o hay un bug crítico durante producción, el Operador puede ejecutar trabajo no listado para restaurar funcionalidad. Debe documentarse en menos de 1 hora y crear tarea retroactiva.

**E10.2 — Ventana de oportunidad.** Si surge una oportunidad de tiempo limitado (ej: respuesta inmediata de Regis disponible), el PM puede autorizar reorden temporal de tareas con notificación inmediata.

**E10.3 — Riesgo crítico al concurso.** Si se detecta un riesgo que pone en peligro el premio, el PM puede convocar revisión completa del plan y reordenar fases enteras.

Cualquier excepción se documenta en el log de decisiones con etiqueta `EXCEPCIÓN`.

---

## 11. Métricas de gobernanza (revisar al final del día)

- Tareas completadas hoy: [N]
- Tareas en plan para hoy: [N]
- Diferencia: [+/- N] (si negativa, PM debe revisar mañana)
- Tasa de aprobación primera iteración: [%]
- Tasa de escalación al PM: [%]
- Flags de concern abiertos: [N]
- Decisiones de PM tomadas hoy: [N]
- Días para checkpoint (4 may): [N]
- Días para entrega final (9 may): [N]

---

## 12. Cláusula de cierre

Este documento es la constitución operativa del proyecto. Su autoridad nace del consenso de los 3 roles al inicio del proyecto y se mantiene mediante su cumplimiento estricto.

**Cualquier intento de saltarse una regla "solo esta vez" debe registrarse como decisión del PM con justificación.** No existe "solo esta vez" no documentado.

**Firmado:** Los 3 roles, 29 abril 2026.
