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
