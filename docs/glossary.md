# Glosario SG-SST — Plataforma Regis

> **Tarea:** T-F0-030
> **Issue:** [#17](https://github.com/dmaorisas/regis-sgsst-platform/issues/17)
> **Propósito:** Terminología técnica SG-SST que los agentes (Operador, QA, PM, Auditor) y futuros desarrolladores deben conocer al operar sobre el dominio. Cada término referencia su fuente normativa cuando aplica.
> **Fuentes:** Decreto 1072/2015, Resolución 0312/2019, Resolución 2346/2007, Resolución 1401/2007, Ley 1562/2012, GTC-45/2012 (ICONTEC), Ley 1010/2006.
> **Referencia transversal:** `docs/research/sg_sst_normativa.md` (dossier completo con citas verificables).

---

## Convención

Cada entrada incluye:
- **Definición:** texto operativo (1-3 líneas).
- **Fuente:** norma exacta (artículo / estándar / ítem).
- **Uso en plataforma:** cómo se materializa en código / tablas del ERD.

Símbolos:
- `[ERD]` indica entidad o campo en el modelo de datos (`docs/erd/v0.md`).
- `[NORMA]` indica fuente normativa primaria.
- `[VERIFICAR]` se usaría si el dato no está confirmado; **ningún término de este glosario lleva esa marca**.

---

## A

### Accidente de Trabajo (AT)
- **Definición:** Suceso repentino que sobreviene por causa o con ocasión del trabajo y produce en el trabajador lesión orgánica, perturbación funcional, invalidez o muerte. También se considera AT el ocurrido durante la ejecución de órdenes del empleador o en cumplimiento de una labor bajo su autoridad, aún fuera del lugar y horas de trabajo.
- **Fuente:** [NORMA] Ley 1562/2012, Art. 3.
- **Uso en plataforma:** dispara creación obligatoria de `furat_reports` [ERD]; debe reportarse en 48 horas hábiles a la ARL/EPS/Mintrabajo (ver "FURAT").

### AFP — Administradora de Fondos de Pensiones
- **Definición:** Entidad privada o pública que administra el régimen de ahorro individual con solidaridad o el régimen de prima media para la afiliación pensional del trabajador.
- **Fuente:** [NORMA] Ley 100/1993, Libro I.
- **Uso en plataforma:** catálogo `afp_catalog` [ERD]; afiliación se valida en `workers.afp_id`.

### Apto / Apto con restricciones / No apto / Aplazado (Concepto de aptitud médico-ocupacional)
- **Definición:** Cuatro categorías que el médico ocupacional emite tras un examen médico ocupacional (ingreso, periódico, post-incapacidad, retiro):
  - **Apto:** trabajador puede desempeñar el cargo sin limitaciones.
  - **Apto con restricciones:** trabajador puede desempeñar el cargo sujeto a recomendaciones específicas (rotación, EPP adicional, no exposición a determinado riesgo).
  - **No apto:** trabajador no puede desempeñar el cargo evaluado.
  - **Aplazado:** se requiere examen complementario antes de emitir concepto.
- **Fuente:** [NORMA] Resolución 2346/2007, Art. 13–17 (criterios de evaluación y emisión del concepto).
- **Uso en plataforma:** campo `medical_exams.concepto_aptitud` [ERD]; el extractor IA `extract_medical_exam_pdf` debe normalizar a estas 4 categorías.

### ARL — Administradora de Riesgos Laborales
- **Definición:** Entidad responsable de afiliar y atender a los trabajadores en lo relacionado con accidentes de trabajo, enfermedades laborales y prevención.
- **Fuente:** [NORMA] Ley 1562/2012, Art. 4 y siguientes; Decreto 1295/1994.
- **Uso en plataforma:** catálogo `arl_catalog` [ERD]; afiliación operativa se almacena en `worker_company.arl_id` (un trabajador puede tener distinta ARL en cada empresa).

### ATEL — Accidente de Trabajo y Enfermedad Laboral
- **Definición:** Sigla operativa que agrupa AT (ver "Accidente de Trabajo") y EL (ver "Enfermedad Laboral"). Se usa en la nomenclatura de procesos de reporte e investigación obligatorios.
- **Fuente:** [NORMA] uso convencional derivado de Ley 1562/2012 y Resolución 1401/2007.
- **Uso en plataforma:** los flujos de reporte FURAT/FUREL e investigación 15 días aplican como categoría unificada en plantillas de notificación.

### Audit log
- **Definición:** Registro append-only de toda mutación crítica al dato (creación, edición, borrado lógico) con `actor_user_id`, `actor_type`, `old_values`, `new_values` y timestamp.
- **Fuente:** requisito interno R6.5 (trazabilidad obligatoria) + insumo para Habeas Data (Ley 1581/2012 Art. 17).
- **Uso en plataforma:** tabla `audit_log` [ERD], particionada por mes (D-ERD-05). Retención: 5 años (ver `governance/08_storage_policy.md`).

### Ausentismo
- **Definición:** No asistencia al trabajo cuando se esperaba que el trabajador asistiera; se mide como porcentaje del tiempo programado. Tipos: por enfermedad común, por enfermedad laboral, por accidente, por permiso legal, no justificado.
- **Fuente:** [NORMA] Resolución 0312/2019, Estándar 3.1.4 e Indicadores Art. 30 del Decreto 1072/2015 (Decreto 1072/2015 Art. 2.2.4.6.21).
- **Uso en plataforma:** indicador agregado mensual; futura entidad `indicators_monthly` (mencionada como brecha v0 → v1 en ERD §5).

---

## B

### Brigada de Emergencias
- **Definición:** Grupo organizado de trabajadores capacitados para responder ante emergencias (incendio, primeros auxilios, evacuación, derrames). Su existencia y entrenamiento son parte del Plan de Emergencias.
- **Fuente:** [NORMA] Decreto 1072/2015, Art. 2.2.4.6.25; Resolución 0312/2019, Estándar 5.1.2.
- **Uso en plataforma:** `committees.tipo = 'brigada'` [ERD]; integrantes en `committee_members`. La estructuración a partir de visita presencial usa el prompt `structure_emergency_plan_from_audio`.

---

## C

### Capítulo I / II / III (Resolución 0312)
- **Definición:** Tres niveles de aplicabilidad de los estándares mínimos según tamaño y clase de riesgo:
  - **Capítulo I (Art. 9):** empresas con ≤10 trabajadores clase de riesgo I, II o III + UPA pequeñas → **7 estándares** (calificación cualitativa Cumple/No cumple).
  - **Capítulo II (Art. 10–15):** empresas con 11–50 trabajadores clase de riesgo I, II o III → **21 estándares** (calificación sobre 100).
  - **Capítulo III (Art. 16):** empresas con >50 trabajadores **O** clase de riesgo IV/V (cualquier tamaño) → **60 estándares** (tabla completa Art. 27, calificación sobre 100).
- **Fuente:** [NORMA] Resolución 0312/2019, Art. 9, 10–15, 16 y 27.
- **Uso en plataforma:** tabla `standards_0312` [ERD] con flags `applies_chapter_i/ii/iii` por estándar; el motor de cumplimiento (T-F1-005) selecciona el subconjunto a evaluar según la empresa.

### Centro de trabajo
- **Definición:** Lugar físico donde un grupo de trabajadores desarrolla sus actividades. Una empresa puede tener varios centros con CIIU y clase de riesgo distintos (ej.: oficina nivel I + planta nivel V).
- **Fuente:** [NORMA] Decreto 1072/2015, Art. 2.2.4.6.16 (matriz de identificación por centro); ADR-02 conceptual del proyecto.
- **Uso en plataforma:** entidad `centros_de_trabajo` [ERD] con `ciiu_centro` y `clase_riesgo_centro` propios (D-ERD-02).

### CIIU — Clasificación Industrial Internacional Uniforme
- **Definición:** Código de 4 dígitos que identifica la actividad económica principal de la empresa. Versión vigente: Revisión 4 adaptada para Colombia (DANE 2012). Determina la clase de riesgo asignada por la ARL.
- **Fuente:** [NORMA] DANE — CIIU Rev. 4 A.C.; Decreto 1607/2002 (clases de riesgo I–V por CIIU).
- **Uso en plataforma:** catálogo `ciiu_codes` [ERD]; `companies.ciiu_principal` y `centros_de_trabajo.ciiu_centro`. Mapeo a peligros típicos en `ciiu_hazard_mapping` (5 CIIUs sembrados — ver `docs/research/ciiu_hazard_mapping_seed.json`).

### Clase de Riesgo (I–V)
- **Definición:** Cinco niveles de riesgo asignados a actividades económicas para efectos de la cotización al Sistema General de Riesgos Laborales (I = más bajo, V = más alto).
- **Fuente:** [NORMA] Decreto 1607/2002.
- **Uso en plataforma:** campo `clase_riesgo` en `ciiu_codes` y en `centros_de_trabajo.clase_riesgo_centro`. Determina aplicabilidad de Capítulo III (riesgo IV–V → siempre Cap III independiente del tamaño).

### Comité de Convivencia Laboral
- **Definición:** Comité bipartito (igual número de representantes empleador y trabajadores) cuya función es prevenir y atender quejas relacionadas con acoso laboral. Reúne trimestralmente; vigencia 2 años.
- **Fuente:** [NORMA] Resolución 1356/2012 (modifica Resolución 652/2012); Ley 1010/2006 (acoso laboral).
- **Uso en plataforma:** `committees.tipo = 'convivencia'` [ERD]; actas en `meeting_actas` con frecuencia trimestral configurada en `frequencies_seed.json`.

### COPASST — Comité Paritario de Seguridad y Salud en el Trabajo
- **Definición:** Comité bipartito (igual número de representantes empleador y trabajadores) responsable de la promoción y vigilancia del SG-SST. Obligatorio para empresas con ≥10 trabajadores; reúne mensualmente; vigencia 2 años.
- **Fuente:** [NORMA] Resolución 2013/1986 (constitución y funcionamiento); Decreto 1295/1994 Art. 63 (vigía SST <10 trab.).
- **Uso en plataforma:** `committees.tipo = 'copasst'` [ERD]; el motor de vencimientos (T-F1-006) alerta sobre la renovación a los 24 meses.

### Compromiso (de acta)
- **Definición:** Tarea concreta surgida de una reunión de comité (COPASST, Convivencia, brigada) con responsable y fecha de cumplimiento. Se diferencia del acta porque tiene seguimiento independiente.
- **Fuente:** [NORMA] Resolución 2013/1986 Art. 11 (actas obligatorias); D-ERD-09 del proyecto (modelado como entidad propia).
- **Uso en plataforma:** entidad `compromisos` [ERD]; recordatorios automáticos vía `pg_boss_jobs` cuando `fecha_compromiso <= now() + interval '3 days'`.

### Concepto de aptitud
- **Definición:** Ver "Apto / Apto con restricciones / No apto / Aplazado".

### Consentimiento (Habeas Data)
- **Definición:** Autorización previa, expresa e informada del titular para el tratamiento de sus datos personales. Para datos sensibles (salud, biométricos) la autorización debe ser explícita.
- **Fuente:** [NORMA] Ley 1581/2012 Art. 9 y 6; Decreto 1377/2013 Art. 5 y 7.
- **Uso en plataforma:** entidad `consents` [ERD] con `version_politica` y `revocado_at` (D-ERD-07). Ver `legal/autorizacion_tratamiento.md`.

---

## D

### Decreto 1072/2015 — Decreto Único Reglamentario del Sector Trabajo
- **Definición:** Cuerpo normativo que compila la regulación del sector trabajo. El Libro 2, Parte 2, Título 4, Capítulo 6 (Art. 2.2.4.6.1 a 2.2.4.6.42) regula el SG-SST, sustituyendo el Decreto 1443/2014.
- **Fuente:** [NORMA] Decreto 1072 del 26 de mayo de 2015, Mintrabajo.
- **Uso en plataforma:** referencia normativa transversal; los `frequencies_seed.json` y `standards_0312_seed.json` lo citan en sus campos `source_reference`.

### Documento SG-SST
- **Definición:** Cualquier registro escrito o digital exigido por la Resolución 0312 o Decreto 1072 como evidencia de implementación (política, matriz de riesgos, actas, exámenes, planes, etc.).
- **Fuente:** [NORMA] Decreto 1072/2015 Art. 2.2.4.6.13 (conservación documental).
- **Uso en plataforma:** entidad `documents` [ERD]; tipologías y retención en `document_types`.

---

## E

### EPS — Entidad Promotora de Salud
- **Definición:** Entidad responsable de afiliar al trabajador al Plan Obligatorio de Salud (POS).
- **Fuente:** [NORMA] Ley 100/1993, Libro II.
- **Uso en plataforma:** catálogo `eps_catalog` [ERD]; `workers.eps_id`.

### Enfermedad Laboral (EL)
- **Definición:** Aquella contraída como resultado de la exposición a factores de riesgo inherentes a la actividad laboral o del medio en el que el trabajador se ha visto obligado a trabajar. El Gobierno determina las EL en una tabla periódicamente actualizable.
- **Fuente:** [NORMA] Ley 1562/2012 Art. 4; Decreto 1477/2014 (tabla de enfermedades laborales).
- **Uso en plataforma:** dispara FUREL (ver "FUREL") en 48 horas hábiles tras diagnóstico; investigación obligatoria en 15 días calendario (ver "Investigación AT/EL").

### EPP — Elementos de Protección Personal
- **Definición:** Equipos diseñados para proteger al trabajador de uno o varios riesgos que amenacen su seguridad o salud. Su entrega es obligatoria, gratuita y sustituible por desgaste.
- **Fuente:** [NORMA] Resolución 2400/1979 Art. 176; Resolución 0312/2019 Estándar 4.2.6.
- **Uso en plataforma:** entrega registrada como `documents` con `document_type` específico; frecuencia "semestral o por desgaste" en `frequencies_seed.json`.

### Estándar mínimo (Resolución 0312)
- **Definición:** Cada uno de los criterios verificables que componen el SG-SST. La Resolución 0312/2019 define 60 estándares totales, agrupados en 7 grupos del Art. 27 con pesos que suman 100, distribuidos en el ciclo PHVA.
- **Fuente:** [NORMA] Resolución 0312/2019 Art. 27 (Tabla de Valores y Calificación).
- **Uso en plataforma:** tabla `standards_0312` [ERD]; el motor de cumplimiento evalúa cada uno como `cumple/no_cumple/no_aplica/pendiente` en `standard_evaluations`.

### Evaluación médica ocupacional
- **Definición:** Examen médico realizado por médico especialista en SST con licencia vigente. Tipos: pre-ocupacional (ingreso), periódica, post-incapacidad, post-ocupacional (retiro), reubicación.
- **Fuente:** [NORMA] Resolución 2346/2007 Art. 4–11; Decreto 1072/2015 Art. 2.2.4.6.7.
- **Uso en plataforma:** entidad `medical_exams` [ERD] con bucket separado y retención 20 años (D-ERD-04). Extracción IA via prompt `extract_medical_exam_pdf`.

### Evidencia documental
- **Definición:** Documento que demuestra el cumplimiento de un estándar mínimo. Cada estándar tiene `evidence_types[]` aceptables (ej.: política firmada, listado de asistencia, acta, matriz versionada).
- **Fuente:** [NORMA] Resolución 0312/2019 Art. 27 (columna evidencias por estándar); Decreto 1072/2015 Art. 2.2.4.6.13.
- **Uso en plataforma:** `standard_evaluations.evidencia_documento_id → documents.id` [ERD].

---

## F

### Frecuencia de accidentalidad
- **Definición:** Número de accidentes de trabajo por cada 100 trabajadores expuestos en un periodo. Fórmula estándar: `(N° AT en el periodo / N° trabajadores expuestos) × 100` (también se usa la base 200 000 horas-hombre trabajadas según ANSI Z16.1, vigente referencialmente en Colombia).
- **Fuente:** [NORMA] Decreto 1072/2015 Art. 2.2.4.6.21 (indicadores); Resolución 0312/2019 Art. 30.
- **Uso en plataforma:** indicador mensual; futura entidad de indicadores (brecha v0 → v1 en ERD §5).

### FURAT — Formato Único de Reporte de Accidente de Trabajo
- **Definición:** Formato oficial mediante el cual el empleador reporta a la ARL, EPS y Mintrabajo todo accidente de trabajo. Plazo: 48 horas hábiles después del evento.
- **Fuente:** [NORMA] Resolución 1401/2007 (investigación de incidentes y accidentes); Decreto 1295/1994 Art. 62; FURAT/FUREL publicado por el Fondo de Riesgos Laborales.
- **Uso en plataforma:** entidad `furat_reports` [ERD]; el motor de vencimientos dispara alerta en T+24h si `reportado_arl = false`.

### FUREL — Formato Único de Reporte de Enfermedad Laboral
- **Definición:** Formato oficial mediante el cual el empleador reporta a la ARL, EPS y Mintrabajo todo diagnóstico de enfermedad laboral. Plazo: 48 horas hábiles después del diagnóstico.
- **Fuente:** [NORMA] Resolución 156/2005 (formatos del informe de AT/EL); Resolución 1401/2007.
- **Uso en plataforma:** análogo a FURAT pero para EL; comparte tabla operativa o se modela como variante (decisión de v1).

---

## G

### GTC-45 — Guía Técnica Colombiana 45 / 2012
- **Definición:** Guía emitida por ICONTEC (revisión 2012) para la identificación de los peligros y la valoración de los riesgos en seguridad y salud ocupacional. Define las **8 categorías de peligros** (físico, químico, biológico, ergonómico/biomecánico, psicosocial, mecánico, eléctrico, locativo — agrupadas las tres últimas como "Condiciones de Seguridad" en la guía original) y la fórmula `NR = ND × NE × NCO` para nivel de riesgo (ver "Probabilidad × Consecuencia").
- **Fuente:** [NORMA] GTC-45/2012 (ICONTEC); referenciada por Decreto 1072/2015 Art. 2.2.4.6.15.
- **Uso en plataforma:** metodología por defecto en `risk_matrices.metodologia` [ERD]; el prompt `enrich_risk_matrix_from_ciiu` exige citar GTC-45 cuando sugiere peligros.

---

## H

### Habeas Data
- **Definición:** Derecho fundamental del titular a conocer, actualizar, rectificar y suprimir la información que sobre él se haya recogido en bases de datos. Incluye el derecho a revocar la autorización.
- **Fuente:** [NORMA] Constitución Política Art. 15; Ley estatutaria 1581/2012; Decreto 1377/2013; Ley estatutaria 1266/2008 (datos financieros y crediticios).
- **Uso en plataforma:** `consents` [ERD]; ver `legal/aviso_privacidad.md` y `legal/autorizacion_tratamiento.md`.

### Horas-hombre trabajadas (HHT)
- **Definición:** Sumatoria de horas efectivamente trabajadas por el conjunto de trabajadores en un periodo; denominador estándar de los indicadores de frecuencia/severidad cuando se usa la base 200 000 (ANSI Z16.1).
- **Fuente:** [NORMA] Decreto 1072/2015 Art. 2.2.4.6.21; metodología ANSI Z16.1 / OSHA referencial.
- **Uso en plataforma:** input de cálculo del indicador de frecuencia; capturado mensualmente.

---

## I

### Identificación de peligros y valoración de riesgos
- **Definición:** Proceso obligatorio anual (y ante cambios) de identificar todos los peligros existentes en cada centro de trabajo, valorar su nivel de riesgo y definir controles. La metodología más usada en Colombia es GTC-45.
- **Fuente:** [NORMA] Decreto 1072/2015 Art. 2.2.4.6.15; Resolución 0312/2019 Estándar 4.1.2.
- **Uso en plataforma:** entidad `risk_matrices` [ERD] versionada por `centro_id`.

### Investigación AT/EL
- **Definición:** Proceso obligatorio que el empleador (con apoyo del COPASST y la ARL) debe realizar tras todo accidente o diagnóstico de enfermedad laboral. Plazo: 15 días calendario después del evento. Resultado: identificación de causas básicas, causas inmediatas y plan de acción.
- **Fuente:** [NORMA] Resolución 1401/2007 (Mintrabajo).
- **Uso en plataforma:** asociada a `furat_reports` (campo opcional `investigacion_id` en v1); compromisos derivados se registran en `compromisos`.

### Incidente
- **Definición:** Suceso acaecido en el curso del trabajo o en relación con éste que tuvo el potencial de ser un accidente, en el que hubo personas involucradas sin que sufrieran lesiones o se presentaran daños a la propiedad y/o pérdida en los procesos. Diferencia clave con AT: **no produjo lesión**.
- **Fuente:** [NORMA] Resolución 1401/2007 Art. 3 (definición operativa); Decreto 1295/1994.
- **Uso en plataforma:** modelado como variante de `furat_reports` con `severidad = 'incidente'`, o entidad separada en v1.

---

## M

### Matriz de peligros
- **Definición:** Documento (típicamente tabla) que consolida la identificación de peligros, valoración de riesgos y controles existentes/propuestos por proceso, centro o cargo. Sinónimo: "Matriz IPER" (Identificación de Peligros y Evaluación de Riesgos).
- **Fuente:** [NORMA] Decreto 1072/2015 Art. 2.2.4.6.15; Resolución 0312/2019 Estándar 4.1.2; metodología GTC-45.
- **Uso en plataforma:** entidad `risk_matrices` [ERD] con `peligros` y `evaluacion` como JSONB versionado.

### Matriz legal
- **Definición:** Documento que lista la normativa SST aplicable a la empresa (ley, decreto, resolución, circular, NTC), su artículo relevante y el estado de cumplimiento. Frecuencia mínima de revisión: semestral.
- **Fuente:** [NORMA] Resolución 0312/2019 Estándar 2.7.1; Decreto 1072/2015 Art. 2.2.4.6.4.
- **Uso en plataforma:** documento tipo `matriz_legal` en `documents`; revisión semestral en `frequencies_seed.json`.

### Mediciones higiénicas
- **Definición:** Mediciones cuantitativas de los agentes ambientales presentes en el lugar de trabajo (ruido, iluminación, vibración, gases, material particulado, etc.) realizadas por personal calificado.
- **Fuente:** [NORMA] Decreto 1072/2015 Art. 2.2.4.6.24; Resolución 2400/1979 (rangos permisibles).
- **Uso en plataforma:** documentos tipo `medicion_higienica`; periodicidad según riesgo.

---

## P

### Peligro vs Riesgo (distinción crítica GTC-45)
- **Definición:** Distinción metodológica fundamental:
  - **Peligro:** fuente, situación o acto con potencial de daño en términos de enfermedad, lesión o combinación de ellas (ej.: ruido, sustancia química, altura).
  - **Riesgo:** combinación de la probabilidad de ocurrencia de un evento peligroso con la severidad de las consecuencias (ej.: hipoacusia neurosensorial por ruido sostenido >85 dB).
  - El **peligro existe**; el **riesgo se valora**. Los controles operan sobre el peligro y modifican el riesgo.
- **Fuente:** [NORMA] GTC-45/2012 (definiciones 3.5 peligro y 3.7 riesgo); ISO 45001 (alineación internacional).
- **Uso en plataforma:** `ciiu_hazard_mapping` lista peligros (no riesgos); `risk_matrices.evaluacion` valora riesgos. El prompt `enrich_risk_matrix_from_ciiu` debe respetar la distinción.

### PHVA — Planear, Hacer, Verificar, Actuar
- **Definición:** Ciclo de mejora continua adaptado al SG-SST. Cada uno de los 60 estándares mínimos pertenece a una de las 4 fases. Distribución de pesos: Planear 25, Hacer 60, Verificar 5, Actuar 10 (suma 100).
- **Fuente:** [NORMA] Decreto 1072/2015 Art. 2.2.4.6.4 (mejora continua); Resolución 0312/2019 Art. 27.
- **Uso en plataforma:** campo `cycle_phva` en `standards_0312`; el motor de cumplimiento expone breakdown por fase en `evaluation_snapshots.breakdown_phva`.

### PILA — Planilla Integrada de Liquidación de Aportes
- **Definición:** Mecanismo único mediante el cual los empleadores y trabajadores independientes pagan los aportes al Sistema de Seguridad Social Integral (salud, pensión, riesgos laborales, parafiscales).
- **Fuente:** [NORMA] Decreto 1670/2007; Resolución 1747/2008 y modificatorias.
- **Uso en plataforma:** integración futura — modelado como brecha v0 → v1 en ERD §5 (entidades `pila_files`, `pila_liquidaciones`).

### Plan Anual de Trabajo
- **Definición:** Documento que define las actividades, responsables, recursos y cronograma del SG-SST para un periodo de 12 meses. Su elaboración es obligatoria.
- **Fuente:** [NORMA] Decreto 1072/2015 Art. 2.2.4.6.8; Resolución 0312/2019 Estándar 2.4.1.
- **Uso en plataforma:** documento tipo `plan_anual` en `documents`; vigencia 1 año en `frequencies_seed.json`.

### Plan de Emergencias
- **Definición:** Documento que describe la organización, recursos, brigadas, rutas de evacuación y procedimientos para responder ante emergencias en cada centro de trabajo. Se complementa con simulacro anual obligatorio.
- **Fuente:** [NORMA] Decreto 1072/2015 Art. 2.2.4.6.25; Resolución 0312/2019 Estándar 5.1.1; Ley 1523/2012 (gestión del riesgo de desastres).
- **Uso en plataforma:** entidad `emergency_plans` [ERD] por centro; el prompt `structure_emergency_plan_from_audio` lo construye desde transcripción de visita.

### Plan de Mejoramiento (Art. 28)
- **Definición:** Documento obligatorio cuando la calificación del SG-SST es <85% (Moderadamente Aceptable o Crítico). Define acciones correctivas, responsables, recursos y plazos. Se reporta a la ARL en 3 o 6 meses según calificación.
- **Fuente:** [NORMA] Resolución 0312/2019 Art. 28.
- **Uso en plataforma:** disparado automáticamente cuando `evaluation_snapshots.porcentaje_global < 85`; documento tipo `plan_mejoramiento`.

### Política SG-SST
- **Definición:** Declaración formal y firmada por la alta dirección que establece el compromiso de la empresa con el SG-SST, sus objetivos generales y los recursos asignados. Revisión mínima: anual.
- **Fuente:** [NORMA] Decreto 1072/2015 Art. 2.2.4.6.5; Resolución 0312/2019 Estándar 2.1.1.
- **Uso en plataforma:** documento tipo `politica_sgsst` en `documents`; obligatoria para Capítulos I, II y III.

### Probabilidad × Consecuencia (NR = ND × NE × NC) — Nivel de Riesgo según GTC-45
- **Definición:** Fórmula para calcular el nivel de riesgo en la metodología GTC-45:
  - **ND** = Nivel de Deficiencia (1, 2, 6 ó 10)
  - **NE** = Nivel de Exposición (1, 2, 3 ó 4)
  - **NP** = Nivel de Probabilidad = ND × NE
  - **NC** = Nivel de Consecuencias (10, 25, 60 ó 100)
  - **NR** = Nivel de Riesgo = NP × NC
  - El resultado se interpreta en 4 niveles: I (Muy alto: 600–4000), II (Alto: 150–500), III (Medio: 40–120), IV (Bajo: 20–40).
- **Fuente:** [NORMA] GTC-45/2012 Anexo B (matriz de evaluación).
- **Uso en plataforma:** `risk_matrices.evaluacion` JSONB almacena ND, NE, NC, NR por peligro; el motor IA NO inventa estos valores, solo sugiere peligros (output del prompt `enrich_risk_matrix_from_ciiu`).

### Profesiograma
- **Definición:** Documento técnico que describe, para cada cargo de la empresa, las exigencias físicas, psicosociales, sensoriales y los riesgos a los que está expuesto el trabajador. Sirve como base para definir el contenido de los exámenes médicos ocupacionales.
- **Fuente:** [NORMA] Resolución 2346/2007 Art. 4 (criterios para definir el examen); buena práctica complementaria a la matriz de peligros.
- **Uso en plataforma:** documento tipo `profesiograma`; entrada del módulo médico que define qué pruebas pedir según cargo.

---

## R

### Resolución 0312/2019 — Estándares Mínimos del SG-SST
- **Definición:** Norma que define los estándares mínimos del SG-SST aplicables a empleadores y contratantes. Estructura: Capítulos I (≤10 trab. R-I/II/III), II (11–50 trab. R-I/II/III) y III (>50 trab. o riesgo IV/V), con un total de 60 estándares y la tabla de valores del Art. 27 que suma 100. Reemplazó a la Resolución 1111/2017.
- **Fuente:** [NORMA] Resolución 0312 del 13 de febrero de 2019, Mintrabajo (Diario Oficial 50.872 del 19/02/2019).
- **Uso en plataforma:** norma central del motor de cumplimiento; los pesos exactos están en `standards_0312_seed.json` y validados (suma = 100).

### Resolución 2346/2007 — Evaluaciones Médicas Ocupacionales
- **Definición:** Regula la práctica de evaluaciones médicas ocupacionales y el manejo de la historia clínica ocupacional. Establece la **retención mínima de 20 años** posteriores al cese de la relación laboral.
- **Fuente:** [NORMA] Resolución 2346 del 11 de julio de 2007, Mintrabajo (modificada por Resolución 1918/2009 en custodia).
- **Uso en plataforma:** sustenta la política de retención de `medical_exams` (D-ERD-04) y de `governance/08_storage_policy.md`.

---

## S

### Severidad de accidentalidad
- **Definición:** Indicador que mide el impacto de los accidentes en términos de días perdidos por cada 100 trabajadores (o 200 000 HHT). Fórmula estándar: `(días perdidos por AT / N° trabajadores) × 100` (también se usa la base 200 000 HHT con ANSI Z16.1).
- **Fuente:** [NORMA] Decreto 1072/2015 Art. 2.2.4.6.21; Resolución 0312/2019 Art. 30.
- **Uso en plataforma:** indicador mensual; junto con frecuencia y ausentismo conforma el cuadro de mando de seguridad.

### SG-SST — Sistema de Gestión de la Seguridad y Salud en el Trabajo
- **Definición:** Sistema de gestión basado en el ciclo PHVA cuyo objeto es prevenir lesiones y enfermedades causadas por las condiciones de trabajo, así como proteger y promover la salud de los trabajadores. Su implementación es obligatoria para todo empleador en Colombia.
- **Fuente:** [NORMA] Ley 1562/2012 (modifica Sistema de Riesgos Laborales); Decreto 1072/2015 Libro 2 Parte 2 Título 4 Cap. 6; Resolución 0312/2019.
- **Uso en plataforma:** dominio funcional completo de la plataforma Regis.

---

## V

### Vigía SST
- **Definición:** Persona designada por el empleador con responsabilidades análogas al COPASST cuando la empresa tiene **menos de 10 trabajadores**. No requiere conformación bipartita (es figura unipersonal).
- **Fuente:** [NORMA] Decreto 1295/1994 Art. 63 (literal b); Resolución 0312/2019 Estándar 1.1.6 (Cap. II en adelante exige COPASST).
- **Uso en plataforma:** modelado como `committees.tipo = 'vigia_sst'` con un único `committee_member` (la persona designada).

---

## Notas operativas para los agentes

1. **Antes de extraer datos de un PDF**, el Operador-Agent debe asegurar que el extractor reconozca los términos "Apto", "Apto con restricciones", "No apto", "Aplazado" como las cuatro únicas categorías válidas de `concepto_aptitud`. Cualquier otra categoría → marca para revisión humana.
2. **Cuando el Auditor-Agent verifique cumplimiento del Estándar 5.1.1 (Plan de Emergencias)**, debe confirmar que el documento exista por **cada `centro_de_trabajo`**, no solo a nivel empresa.
3. **El motor de vencimientos (T-F1-006)** se alimenta de `frequencies_seed.json` cuyas frecuencias están justificadas por las normas referenciadas en este glosario. Cualquier cambio en las normas debe disparar update de ambos artefactos.
4. **El glosario es lectura obligatoria para todo agente nuevo.** Términos no listados aquí pueden agregarse en versiones posteriores con el mismo formato (Definición / Fuente / Uso en plataforma).

---

**Total de términos definidos:** 36 (supera el mínimo de 25 exigido por el spec del Issue #17).

**Última actualización:** 2026-04-28 — versión inicial T-F0-030.
