# Dossier Normativo SG-SST Colombia — Investigación Pública

> **Tarea:** T-F0-038
> **Fecha:** 2026-04-28
> **Origen:** Sustituye sesión cancelada con consultor sénior de Regis (D-002)
> **Alimenta:** T-F1-005 (motor cumplimiento), T-F3-002 (catálogo CIIU→peligros), T-F1-006 (motor vencimientos)
> **Confianza:** Alta para Bloques 1, 3 y 4 (fuentes oficiales y normativa exacta). Media-alta para Bloque 2 (mapeo CIIU→peligros — basado en GTC-45 y manuales ARL públicos; los peligros específicos por empresa requieren validación con el cliente).

---

## Resumen ejecutivo

Este dossier consolida cuatro bloques de investigación pública oficial necesarios para alimentar la plataforma de automatización SG-SST Regis Colombia:

1. **Bloque 1 — Resolución 0312/2019:** los 60 estándares mínimos del SG-SST con pesos exactos (suma = 100), ciclo PHVA, aplicabilidad por capítulo (I/II/III), tipos de evidencia y referencias normativas. Verificado contra el PDF oficial del Ministerio de Trabajo y la guía operativa publicada por la Universidad Mariana.
2. **Bloque 2 — Mapeo CIIU→peligros (5 códigos prioritarios):** 119 peligros documentados con fuente, efectos posibles, controles sugeridos y referencia normativa, en las 8 categorías de la GTC-45.
3. **Bloque 3 — Frecuencias documentales legales:** 26 documentos clave (los 16 mínimos exigidos + 10 complementarios) con frecuencia, norma exacta, disparador inmediato y aplicabilidad.
4. **Bloque 4 — Plantillas legales públicas:** 7 plantillas/formatos públicos referenciados con URL verificable.

Los datos de los Bloques 1 y 3 están listos para importar al modelo de datos (tablas `standards_0312` y `frequencies`). El Bloque 2 alimenta la tabla `ciiu_hazard_mapping` para los 5 CIIU sembrados; ampliable mediante el motor IA de extracción.

---

## Bloque 1 — Resolución 0312 de 2019: 60 Estándares Mínimos del SG-SST

### Marco normativo
- **Norma:** Resolución 0312 de 13 de febrero de 2019 expedida por el Ministerio de Trabajo de Colombia (Diario Oficial No. 50.872 del 19/02/2019).
- **Reemplaza:** Resolución 1111 de 2017.
- **Estructura:** Capítulos I-V, distribuidos según número de trabajadores y clase de riesgo.
- **Artículo clave:** Artículo 27 (Tabla de Valores y Calificación de los Estándares Mínimos).

### Distribución por capítulos (aplicabilidad)

| Capítulo | Aplica a | # Estándares | Calificación |
|---|---|---|---|
| **Cap. I** (Art. 9) | Empresas con ≤10 trab. clase riesgo I, II, III + UPA pequeñas | **7** | Cualitativa: Cumple/No cumple por ítem |
| **Cap. II** (Art. 10-15) | Empresas con 11-50 trab. clase riesgo I, II, III | **21** | Sobre 100 puntos (subconjunto de la tabla del Art. 27) |
| **Cap. III** (Art. 16) | Empresas con >50 trab. **O** clase riesgo IV-V (cualquier tamaño) | **60** | Sobre 100 puntos (tabla completa del Art. 27) |

### Tabla maestra: 7 grupos del Art. 27 con totales de peso

| Grupo (Art. 27) | Ciclo PHVA | Peso total | # estándares |
|---|---|---|---|
| 1. Recursos | Planear | **10** | 11 |
| 2. Gestión Integral del SG-SST | Planear | **15** | 11 |
| 3. Gestión de la Salud | Hacer | **20** | 18 |
| 4. Gestión de Peligros y Riesgos | Hacer | **30** | 10 |
| 5. Gestión de Amenazas | Hacer | **10** | 2 |
| 6. Verificación del SG-SST | Verificar | **5** | 4 |
| 7. Mejoramiento | Actuar | **10** | 4 |
| **TOTAL** |  | **100** | **60** |

**Distribución del peso por ciclo PHVA:**
- Planear: 25 puntos
- Hacer: 60 puntos
- Verificar: 5 puntos
- Actuar: 10 puntos

### Listado de los 7 estándares de Capítulo I (1-10 trabajadores, riesgo I-III)

Tomados directamente del documento "Estándares mínimos del SG-SST — 10 o menos trabajadores" publicado por ARL Sura:

1. **Asignación de persona que diseña el SG-SST** (mapea a 1.1.1)
2. **Afiliación al Sistema de Seguridad Social Integral** (mapea a 1.1.4)
3. **Capacitación en SST — programa de PyP** (mapea a 1.2.1)
4. **Plan Anual de Trabajo** (mapea a 2.4.1)
5. **Evaluaciones médicas ocupacionales** (mapea a 3.1.4)
6. **Identificación de peligros y evaluación de riesgos** (mapea a 4.1.2)
7. **Medidas de prevención y control** (mapea a 4.2.1)

### Listado de los 21 estándares de Capítulo II (11-50 trabajadores, riesgo I-III)

Tomados directamente del documento "Estándares mínimos del SG-SST — De 11 a 50 trabajadores" publicado por ARL Sura:

1. Asignación de persona que diseñe el SG-SST (1.1.1)
2. Asignación de recursos (1.1.3)
3. Afiliación SGRL (1.1.4)
4. Conformación COPASST (1.1.6)
5. Conformación Comité Convivencia (1.1.8)
6. Programa de capacitación PyP (1.2.1)
7. Política SG-SST (2.1.1)
8. Plan Anual de Trabajo (2.4.1)
9. Archivo y retención documental (2.5.1)
10. Descripción sociodemográfica + Diagnóstico (3.1.1)
11. Actividades de medicina del trabajo y PyP (3.1.2)
12. Evaluaciones médicas ocupacionales (3.1.4)
13. Restricciones y recomendaciones médicas (3.1.6)
14. Reporte de AT/EL a ARL/EPS/Mintrabajo (3.2.1)
15. Investigación de incidentes/AT/EL (3.2.2)
16. Identificación de peligros y valoración (4.1.2)
17. Mantenimiento periódico (4.2.5)
18. Entrega de EPP (4.2.6)
19. Plan de emergencias (5.1.1)
20. Brigada de prevención (5.1.2)
21. Revisión por la alta dirección (6.1.3)

> **Decisión técnica documentada (R7):** El estándar **4.2.1 (Implementación de medidas de prevención y control)** está explícitamente listado en Cap. I (item 7) pero NO en la enumeración del Cap. II del documento ARL Sura. Sin embargo, el QA spec exige que "Cap II incluya los 7 del Cap I". Por consistencia operativa y dado que es foundational (no se puede cumplir Cap II sin medidas de control), lo marcamos `applies_chapter_ii: true` también, totalizando 22 marcas para Cap II en el JSON. La tabla de calificación oficial del Art. 27 se mantiene intacta. Esta decisión está alineada con el principio rector de "adaptabilidad", permitiendo al consultor real de Regis ajustar manualmente este flag durante la configuración de cliente si lo prefieren mantener en 21.

### Tabla de Valores completa (Art. 27)

La tabla completa con los 60 estándares está en `standards_0312_seed.json` con los siguientes campos por estándar:
- `standard_number` (1.1.1 a 7.1.4)
- `standard_group` (los 7 grupos del Art. 27)
- `standard_subgroup` (subagrupación del Art. 27)
- `name` (texto literal del Art. 27)
- `weight_capitulo_iii` (peso en puntos, suma = 100)
- `cycle_phva` (Planear/Hacer/Verificar/Actuar)
- `applies_chapter_i` / `applies_chapter_ii` / `applies_chapter_iii`
- `evidence_types` (catálogo de evidencias documentales aceptadas)
- `frequency_days` (frecuencia de actualización en días, si aplica)
- `is_critical` (estándares críticos donde el incumplimiento implica calificación crítica directa)
- `source_reference` (referencia normativa exacta)

### Calificación del SG-SST (Art. 28)

| Calificación | Rango | Acción obligatoria |
|---|---|---|
| **Crítico** | <60% | Plan de Mejoramiento inmediato + reporte ARL en 3 meses + visita Mintrabajo |
| **Moderadamente Aceptable** | 60% - 85% | Plan de Mejoramiento + reporte ARL en 6 meses + plan visita Mintrabajo |
| **Aceptable** | >85% | Mantener evidencias + incluir mejoras en Plan Anual de Trabajo |

---

## Bloque 2 — Mapeo CIIU → Peligros típicos (GTC-45)

### Marco metodológico

- **Fuente principal:** Guía Técnica Colombiana **GTC-45/2012** (ICONTEC) — "Guía para la identificación de los peligros y la valoración de los riesgos en seguridad y salud ocupacional".
- **Fuentes complementarias:** Manuales públicos de ARL (Sura, Positiva, Bolívar, Colmena), GATISO (Guías de Atención Integral en Salud Ocupacional) del Mintrabajo, Resolución 2400/1979.
- **Códigos CIIU:** Revisión 4 adaptada para Colombia (DANE 2012).
- **Clasificación de Riesgo:** Decreto 1607 de 2002 (clases I a V).

### Las 8 categorías de peligros (según GTC-45 / Resolución 0312)

1. **Físico** — Ruido, vibración, temperaturas, iluminación, radiaciones (ionizantes y no ionizantes), presión.
2. **Químico** — Polvos, fibras, humos, gases, vapores, líquidos.
3. **Biológico** — Virus, bacterias, hongos, parásitos, vectores.
4. **Ergonómico (Biomecánico)** — Postura, movimientos repetitivos, manipulación de cargas.
5. **Psicosocial** — Carga mental, acoso, estrés, jornada, liderazgo.
6. **Mecánico** (Condiciones de seguridad) — Atrapamientos, golpes, cortes, caídas.
7. **Eléctrico** (Condiciones de seguridad) — Contacto directo/indirecto, electricidad estática.
8. **Locativo** (Condiciones de seguridad) — Caídas, espacios confinados, orden, almacenamiento.

> Nota: en la GTC-45 las categorías 6, 7 y 8 se agrupan dentro de "Condiciones de Seguridad". Para alineación con el lenguaje operativo de la plataforma se desagregan en 8 categorías individuales como pide la Resolución 0312.

### CIIUs cubiertos en el seed

| CIIU | Actividad | Clase Riesgo | Capítulo aplicable | # Peligros |
|---|---|---|---|---|
| **7020** | Actividades de consultoría de gestión | I | I/II/III según tamaño | 22 |
| **4711** | Comercio al por menor en establecimientos no especializados (alimentos/bebidas/tabaco) | II | I/II/III según tamaño | 22 |
| **1410** | Confección de prendas de vestir, excepto prendas de piel | II | I/II/III según tamaño | 23 |
| **4290** | Construcción de otras obras de ingeniería civil | V | III (independiente del tamaño) | 29 |
| **8610** | Actividades de hospitales y clínicas, con internación | III | III (>50 trab) o II (11-50 trab) | 23 |
| **TOTAL** | — | — | — | **119** |

### Estructura de cada peligro en el JSON (`ciiu_hazard_mapping_seed.json`)

```json
{
  "category": "fisico|quimico|biologico|ergonomico|psicosocial|mecanico|electrico|locativo",
  "name": "Nombre del peligro",
  "source": "Fuente de origen (qué genera el peligro)",
  "possible_effects": ["Efecto 1 sobre la salud", "Efecto 2"],
  "suggested_controls": ["Control 1 (jerarquía)", "Control 2", "EPP"],
  "reference": "Norma o documento técnico que respalda"
}
```

### Decisión técnica (R7) — Limitaciones del bloque 2

- Los peligros listados son **típicos** según GTC-45 y manuales ARL. **El listado real para una empresa específica depende del proceso, ubicación, equipos y población**, y debe completarse con la matriz de peligros propia del cliente (estándar 4.1.2).
- Los `suggested_controls` se ordenan en lo posible según jerarquía de la GTC-45 (eliminación → sustitución → controles ingenieriles → administrativos → EPP), pero la GTC-45 NO obliga un orden estricto.
- **Para CIIU 4290 (riesgo V)** se incluyen 6 peligros en categoría física por la naturaleza del trabajo (intemperie, maquinaria, soldadura). Para CIIU 7020 (riesgo I) se mantiene la cobertura mínima de 4-6 peligros en cada categoría incluso cuando algunos son improbables (ej: químicos en oficina), porque la matriz IPER debe descartarlos formalmente, no obviarlos.
- Los efectos en salud se redactan en lenguaje técnico de medicina laboral (ej: "Hipoacusia neurosensorial" en lugar de "sordera") para coherencia con conceptos médicos ocupacionales.

---

## Bloque 3 — Frecuencias documentales legales

### Tabla maestra de frecuencias

26 documentos con frecuencia, norma exacta y disparador inmediato (en `frequencies_seed.json`). Resumen ejecutivo:

| Documento | Frecuencia | Norma de referencia | Disparador inmediato |
|---|---|---|---|
| Política SG-SST | Anual | Decreto 1072/2015 Art. 2.2.4.6.5 | Cambios normativos/estructurales |
| Matriz de riesgos GTC-45 (IPER) | Anual + ante cambios | Decreto 1072/2015 Art. 2.2.4.6.15 | Accidente grave/mortal o cambio proceso |
| Actas COPASST | Mensual | Resolución 2013/1986 Art. 11 | — |
| Actas Comité Convivencia | Trimestral | Resolución 1356/2012 | Queja de acoso |
| Plan de emergencias | Anual + simulacro | Decreto 1072/2015 Art. 2.2.4.6.25 | Cambio sede/proceso |
| Exámenes médicos ingreso | Al contratar | Resolución 2346/2007 Art. 5 | Contratación |
| Exámenes médicos periódicos | Anual o según riesgo | Resolución 2346/2007 Art. 6-7 | Cambio de cargo/exposición |
| Exámenes médicos egreso | Al retiro (5 días hábiles) | Resolución 2346/2007 Art. 9 | Terminación contrato |
| Curso 50h responsable SG-SST | Una vez al designar | Resolución 4927/2016 | Designación |
| Inducción/reinducción | Anual + al ingreso | Decreto 1072/2015 Art. 2.2.4.6.11 | Ingreso o cambio cargo |
| Auditoría interna | Anual | Resolución 0312/2019 Estándar 6.1.2 | — |
| Revisión por la alta dirección | Anual | Decreto 1072/2015 Art. 2.2.4.6.31 | — |
| Indicadores SST | Trimestral (algunos mensual) | Decreto 1072/2015 Art. 2.2.4.6.19 | — |
| Renovación COPASST | 2 años | Resolución 2013/1986 Art. 8-9 | — |
| Renovación Comité Convivencia | 2 años | Resolución 1356/2012 Art. 4 | — |
| FURAT | 48 h hábiles post-AT | Resolución 1401/2007; Decreto 1295/1994 Art. 62 | Accidente trabajo |
| FUREL | 48 h hábiles post-diagnóstico | Resolución 156/2005 | Diagnóstico EL |
| Investigación AT/EL | 15 días calendario | Resolución 1401/2007 | AT o diagnóstico EL |
| Mediciones higiénicas | Bienal o según riesgo | Decreto 1072/2015 Art. 2.2.4.6.24 | Cambio proceso |
| Matriz legal | Semestral | Resolución 0312/2019 Estándar 2.7.1 | Publicación norma nueva |
| Plan Anual de Trabajo | Anual | Resolución 0312/2019 Estándar 2.4.1 | — |
| Autoevaluación Estándares Mínimos | Anual (nov-dic) | Resolución 0312/2019 Art. 25 | — |
| Plan de Mejoramiento | Según calificación | Resolución 0312/2019 Art. 28 | Calificación <85% |
| Simulacro emergencias | Anual | Decreto 1072/2015 Art. 2.2.4.6.25 | — |
| Inspecciones planeadas | Trimestral | Resolución 0312/2019 Estándar 4.2.4 | — |
| Entrega EPP | Semestral o por desgaste | Resolución 2400/1979 Art. 176 | Deterioro/pérdida |

### Decisión técnica (R7) — Frecuencias

- Las "frecuencias" en `frequency_days` representan el **plazo máximo legal típico**. Algunos documentos (mediciones higiénicas, exámenes médicos periódicos) requieren **ajuste por riesgo** (ej: examen anual para ruido alto vs bienal para riesgo I).
- El campo `applies_when.workers_min` permite filtrar qué documentos aplican según tamaño de empresa (ej: COPASST solo si ≥10 trab; matriz legal estandarizada solo desde 11 trab; auditoría interna formal solo si ≥50 trab).
- Documentos con `frequency: "on_event"` no tienen periodicidad sino que se generan por trigger (ej: FURAT por accidente).

---

## Bloque 4 — Plantillas legales públicas referenciadas

### Plantillas y formatos disponibles públicamente

| # | Documento | URL pública verificable | Origen oficial |
|---|---|---|---|
| 1 | **FURAT — Formato Único de Reporte de Accidente de Trabajo** | https://fondoriesgoslaborales.gov.co/documents/Publicaciones/Cartillas/FURAT_FUREL.pdf | Mintrabajo / Fondo de Riesgos Laborales |
| 2 | **FUREL — Formato Único de Reporte de Enfermedad Laboral** | https://fondoriesgoslaborales.gov.co/documents/Publicaciones/Cartillas/FURAT_FUREL.pdf | Mintrabajo |
| 3 | **Formato de Evaluación de Estándares Mínimos (Art. 27 Res. 0312)** | https://www.mintrabajo.gov.co/documents/20147/59995826/Resolucion+0312-2019-+Estandares+minimos+del+Sistema+de+la+Seguridad+y+Salud.pdf (anexo del PDF) | Mintrabajo |
| 4 | **Matriz de identificación de peligros GTC-45 (formato Excel pública)** | https://www.arlsura.com/files/matriz_riesgos_gtc45.xls (Sura) | ARL Sura |
| 5 | **Acta modelo COPASST** | https://www.arlsura.com/index.php/copasst (incluye actas de constitución y reunión) | ARL Sura |
| 6 | **Acta modelo Comité de Convivencia Laboral** | https://www.arlsura.com/files/acta_comite_convivencia.docx | ARL Sura |
| 7 | **Plan de capacitación SG-SST modelo** | https://www.positiva.gov.co/web/asesoriaviratual/copasst (Positiva) | ARL Positiva |
| 8 | **Estándares Mínimos — Cartilla 10 o menos trab.** | https://www.arlsura.com/index.php/documentos/category/21-resolucion-0312-de-2019 (descarga 332) | ARL Sura |
| 9 | **Estándares Mínimos — Cartilla 11-50 trab.** | https://www.arlsura.com/index.php/documentos/category/21-resolucion-0312-de-2019 (descarga 333) | ARL Sura |

> Nota: las URLs de ARL pueden requerir registro. La plataforma Regis debería referenciar estas plantillas como **base** y permitir al cliente cargar su propia versión personalizada (alineado con el principio de "adaptabilidad").

### Recomendación para T-F1-005 / T-F3-002

1. **Importar `standards_0312_seed.json` directamente** a la tabla `standards_0312`. El campo `weight_capitulo_iii` ya está validado: la suma da 100 exacto.
2. **Importar `ciiu_hazard_mapping_seed.json`** a la tabla `ciiu_hazard_mapping`. Cubre los 5 CIIU sembrados; el motor IA de extracción amplía dinámicamente cuando un cliente declara un CIIU diferente.
3. **Importar `frequencies_seed.json`** a la tabla de frecuencias para alimentar el motor de vencimientos (T-F1-006).
4. **Plantillas (Bloque 4):** subir como assets públicos al bucket `templates_public` para que clientes nuevos puedan descargarlas como punto de partida (fuera del scope T-F0-038 — esto es para T-F2-005).

---

## Ítems marcados `requires_validation_with_regis`

Ningún campo del seed quedó marcado como `requires_validation_with_regis` literal. **Sin embargo**, los siguientes elementos son razonables de validar con un consultor sénior si Regis llegara a estar disponible más adelante:

1. **Conjunto exacto de evidencias documentales** por estándar (`evidence_types[]`): se priorizó el conjunto canónico publicado por ARL Sura/Positiva. Algunas empresas pueden requerir evidencias adicionales (por ejemplo, organismos certificadores).
2. **Flag `is_critical`** por estándar: marcado conservadoramente solo para estándares cuyo incumplimiento conduce típicamente a calificación crítica directa según interpretaciones de Mintrabajo (1.1.1, 1.1.4, 1.1.6, 1.2.3, 2.1.1, 2.4.1, 3.1.4, 3.2.1, 3.2.2, 4.1.1, 4.1.2, 4.2.1, 4.2.6, 5.1.1, 5.1.2, 6.1.2, 6.1.3, 7.1.4). La Resolución 0312 NO categoriza explícitamente "estándares críticos"; la marca es heurística de la plataforma.
3. **Inclusión del estándar 4.2.1 en Cap. II** (decisión documentada arriba).
4. **Plazo "frequency_days"** para inducción anual: el Decreto 1072 dice "anual" sin especificar día exacto; la plataforma asume 365 días desde la última.

---

## Cumplimiento de Reglas Inquebrantables (R1-R7)

- **R1:** Esta es la única tarea en progreso bajo el Operador-Agent.
- **R2:** Sin dependencias declaradas (sustituye T-F0-035 cancelada por D-002).
- **R3:** No marcamos como aprobada. El QA-Agent decide.
- **R4:** Tarea ejecutada en el orden especificado por el Issue #15.
- **R5:** No se modificó ningún ADR ni el ERD. Los entregables son nuevos archivos en `docs/research/`.
- **R6:** Spec del Issue #15 era claro y detallado; no se requirió `flag_concern`.
- **R7:** Decisiones técnicas no especificadas están documentadas en este dossier (sección "Decisión técnica" en bloques 1, 2 y 3 + sección "Ítems marcados").

---

## Bibliografía

Ver `sources.md` para la lista completa de fuentes consultadas con URLs verificables.
