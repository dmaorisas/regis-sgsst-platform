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

### D-004 — Política: funcionalidad sobre completitud de datos
**Fecha:** 2026-04-29 16:30
**Tomada por:** PM-Agent (siguiendo directiva del supervisor)
**Tipo:** principio_operativo

**Contexto:**
El supervisor refuerza que el objetivo del concurso es demostrar **funcionalidad y adaptabilidad**, no completitud de datos. El sistema debe probar que funciona; los datos pueden ser sintéticos coherentes.

**Decisión:**
Adoptar como principio operativo: **datos sintéticos coherentes son suficientes** para todas las tareas que requieren datos de prueba. Solo invertir en datos reales/exhaustivos donde sean indispensables para el funcionamiento (ej: pesos Resolución 0312, sí; nombres y NITs reales de empresas, no).

**Implicaciones:**
- T-F0-022: empresas sintéticas (3 perfiles, no investigación de empresas reales)
- T-F2-010: PDFs de prueba que diseñemos
- T-F3-002: 3-5 CIIUs cubiertos (no 1500)
- T-F5-001 a 005: configurar 1 de las 3 empresas sintéticas como "producción" — la diferenciación es funcional, no de datos
- T-F5-007: discrepancy report compara contra cálculo manual nuestro siguiendo metodología 0312, no contra "número conocido por Regis"
- T-F6-001: el wow moment del video pivota a **adaptabilidad arquitectónica** (cambiar config → recálculo en vivo)

**Razón:**
- El brief dice explícitamente que se permite construir con documentos genéricos
- Regis nunca comparte datos reales, ni siquiera al ganador
- El ganador alimentará sus datos reales después; nuestro trabajo es que el sistema esté listo
- Recursos limitados: 11 días, mejor invertirlos en funcionalidad

**Memoria asociada:**
`memory/feedback_funcionalidad_sobre_datos.md`

---

### D-003 — Clarificación T-F0-022: arquitectura multi-empresa adaptable
**Fecha:** 2026-04-29 15:15
**Tomada por:** PM-Agent (siguiendo input directo del supervisor)
**Tipo:** clarificacion_spec

**Contexto:**
El supervisor humano clarifica que T-F0-022 NO debe limitarse a una sola empresa real. El sistema debe ser **adaptable a N empresas** desde el día 1, soportando: (a) empresas sintéticas para testing, (b) empresas reales con datos públicos (Nike, Ferrero, PayU, Danone vía RUES), (c) cualquier empresa futura sin reescritura.

**Decisión:**
T-F0-022 (reformulada en D-002) se refina aún más: en lugar de "seleccionar UNA empresa pública", se ejecuta como "configurar 2-3 empresas representativas que prueben los 3 capítulos de Resolución 0312":
- 1 empresa pequeña (1-10 trab, riesgo I-III) → Capítulo I (7 estándares)
- 1 empresa mediana (11-50 trab, riesgo I-III) → Capítulo II (21 estándares)
- 1 empresa grande o de alto riesgo → Capítulo III (60 estándares)

Esto garantiza cobertura del motor de cumplimiento y demuestra adaptabilidad arquitectónica en el video.

**Razón:**
- Refuerza el principio rector ("sistema demostrablemente adaptable")
- Cubre los 3 capítulos de la Resolución 0312 con casos reales
- El Discrepancy Report del video (T-F5-007) puede mostrar 3 empresas distintas con sus % calculados
- Ya está soportado arquitectónicamente (multi-tenancy con RLS desde Fase 1)

**Cambios al plan:**
- T-F0-022 reformulada: "Configurar 2-3 empresas representativas (mix sintéticas + datos públicos)"
- T-F1-013 reforzada: seed inicial cubre 3 empresas en lugar de 1
- T-F5-X mantiene foco en datos reales (públicos), no fictos

**Risk assessment:**
Bajo. Mejora la robustez de la demostración sin agregar complejidad técnica.

---

### D-002 — Pivote estratégico: ejecución sin contacto con Regis
**Fecha:** 2026-04-29 14:50
**Tomada por:** PM-Agent (orquestador)
**Tipo:** modificacion_plan (mayor)

**Contexto:**
El supervisor humano informa que NO tiene contacto activo con Regis al momento de iniciar el proyecto y necesitamos avanzar sin esperar a establecerlo. Esto invalida ~11 tareas que dependían de input directo de Regis.

**Decisión:**
Pivotar a modo "investigación pública". El sistema se construye 100% sobre fuentes públicas y datos abiertos. Cuando/si Regis aparece, se incorporan sus inputs como capa adicional sin reescritura.

**Razón:**
1. El brief explícitamente permite construir con documentos genéricos y normativa pública: "los documentos legales son plantillas obligatorias que no cambian entre empresas, lo que significa que construir con documentos de prueba propios es completamente viable".
2. El principio rector ya reconoce este escenario: "datos de prueba realistas para una empresa real configurada (datos públicos)".
3. Esperar a Regis bloquea el camino crítico y pone en riesgo la entrega del 9 may.
4. La adaptabilidad arquitectónica (que es nuestro diferenciador en el video) se prueba mejor sin acceso privilegiado a documentos reales.

**Cambios concretos al plan:**

CANCELADAS (movidas a Bucket B con rationale "requiere contacto Regis"):
- T-F0-003 Verificar contacto activo con Regis
- T-F0-004 Agendar llamada de 60 min con Regis
- T-F0-005 Preparar lista de preguntas para llamada Regis
- T-F0-009 Redactar carta de intención con Regis
- T-F0-010 Enviar carta de intención a Regis para firma
- T-F0-019 Lista de preguntas finales antes de llamada
- T-F0-020 Ejecutar llamada con Regis
- T-F0-021 Transcribir y estructurar acta de llamada
- T-F0-023 Agendar sesión 2h con Regis para mapeo CIIU
- T-F0-035 Sesión de mapeo CIIU con Regis

REFORMULADAS:
- T-F0-022 "Confirmar empresa cliente real" → "Seleccionar empresa real desde datos públicos" (Nike Colombia / Ferrero Colombia / PayU Latam / Danone Colombia con NIT, CIIU, sector — todos datos públicos vía RUES)
- T-F0-024 "Refinar ERD a v1 con base en llamada Regis" → "Refinar ERD a v1 con base en investigación pública normativa"
- Tarea NUEVA T-F0-038: "Investigación pública SG-SST: pesos exactos Resolución 0312 + mapeo CIIU→peligros desde DANE/GTC-45/fuentes oficiales" (180 min, reemplaza la sesión con consultor Regis)

RECONCILIADAS (ya completadas en pre-flight, marcar como done sin Issue):
- T-F0-011 Crear repositorio Git → done en pre-flight (repo dmaorisas/regis-sgsst-platform)
- T-F0-013 Crear proyecto Supabase → done en pre-flight
- T-F0-015 Configurar n8n self-hosted → done previamente (n8n.dmaori.com)
- T-F0-016 Configurar Sentry → CANCELADA (decidimos prescindir, suficiente con logs Supabase + email Resend)
- T-F0-017 Configurar Resend → done en pre-flight
- T-F0-032 Aviso privacidad + autorización → done por PM (legal/aviso_privacidad.md, legal/autorizacion_tratamiento.md ya creados pero pendientes de adaptar a templates legales más robustos)

**Impacto en cronograma:**
- Fase 0: 37 tareas → ~28 tareas activas (ahorro ~10h)
- Camino crítico: ya no depende de respuesta de Regis (era el riesgo R1 del plan)
- Inicio Fase 1 puede adelantarse al 30 abr mañana (sin esperar llamada Regis)

**Risk assessment:**
- Riesgo eliminado: bloqueo por no-respuesta de Regis (era riesgo R1 alto/crítico)
- Riesgo nuevo introducido: pesos exactos de items dentro de cada estándar pueden no estar 100% calibrados sin validación de consultor sénior Regis
  - Mitigación: usar pesos públicos a nivel de estándar (suman 100, distribución conocida); arquitectura permite override por configuración cuando se incorpore validación experta posterior
- Riesgo nuevo: el mapeo CIIU→peligros se hace desde fuentes públicas (GTC-45 + manual ARLs disponibles online), puede ser menos preciso que con consultor sénior
  - Mitigación: declarar explícitamente en SOP/video que el catálogo es base pública adaptable, demostrar con 3-5 CIIUs verificables

**Cambios en principio rector:**
- Sin cambios. El principio rector ya contempla este escenario.

**Notificados:**
- Operador-Agent (próxima invocación)
- QA-Agent (próxima validación)
- Supervisor humano (esta conversación)

---

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
