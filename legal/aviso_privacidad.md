# Aviso de Privacidad — Plataforma Regis SG-SST

> **Tarea:** T-F0-032
> **Issue:** [#17](https://github.com/dmaorisas/regis-sgsst-platform/issues/17)
> **Marco normativo:** Ley estatutaria 1581 de 2012, Decreto 1377 de 2013 (reglamentario), Ley estatutaria 1266 de 2008 (datos financieros y de crédito), Decreto 1074 de 2015 (DUR Comercio), Resolución 2346 de 2007 (datos de salud ocupacional), Constitución Política Art. 15.
> **Versión documento:** 1.0
> **Fecha vigencia:** 2026-04-28
> **Plantilla base:** Guía SIC para responsables del tratamiento + lineamientos del Decreto 1377/2013.

---

## 1. Identificación del responsable del tratamiento

**Razón social del responsable:** [La consultora SG-SST que opera la plataforma — placeholder configurable por cliente. En adelante, "el Responsable" o "Regis Colombia / Consultora Usuaria".]

**NIT:** [VERIFICAR — completar al cierre del onboarding del cliente]
**Domicilio:** [VERIFICAR — completar al cierre del onboarding]
**Correo electrónico para tratamiento de datos:** [VERIFICAR — proponer `proteccion.datos@<dominio-cliente>.co`]
**Teléfono de contacto:** [VERIFICAR]
**Página web:** [VERIFICAR]

> **Nota operativa al equipo:** los campos `[VERIFICAR]` son los únicos legítimos en este documento. El operador del cliente final completa estos placeholders al activar la plataforma para su organización. Ningún otro dato debe inventarse.

**Encargado del tratamiento:** la plataforma tecnológica Regis (en adelante, "el Encargado"), operada por [Grupo Dmaori S.A.S. / razón social del operador tecnológico — placeholder].

---

## 2. Marco legal aplicable

Este aviso se expide en cumplimiento de:

- **Ley estatutaria 1581 de 2012** "Por la cual se dictan disposiciones generales para la protección de datos personales", Artículos 4, 5, 6, 8, 9, 10, 12, 14, 15, 17, 18 y 21.
- **Decreto 1377 de 2013** "Por el cual se reglamenta parcialmente la Ley 1581 de 2012", Artículos 5, 6, 7, 9, 10, 11, 12, 13 y 14.
- **Ley estatutaria 1266 de 2008** "Por la cual se dictan las disposiciones generales del hábeas data y se regula el manejo de la información contenida en bases de datos personales, en especial la financiera, crediticia, comercial, de servicios y la proveniente de terceros países" (cuando aplique a datos financieros/crediticios del titular).
- **Resolución 2346 de 2007** del Ministerio de la Protección Social — historia clínica ocupacional (datos sensibles de salud).
- **Constitución Política de Colombia, Artículo 15** — derecho a la intimidad personal y familiar y al hábeas data.
- **Decreto 1074 de 2015** — Decreto Único Reglamentario del Sector Comercio, Industria y Turismo (compila la reglamentación de protección de datos a nivel nacional, incluyendo el Decreto 1377/2013).
- Lineamientos y circulares de la **Superintendencia de Industria y Comercio (SIC)** como autoridad nacional de protección de datos personales.

---

## 3. Finalidad del tratamiento

Los datos personales recolectados a través de la plataforma Regis SG-SST son tratados con las siguientes finalidades específicas, todas relacionadas con la implementación, operación y auditoría del **Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST)** del empleador titular del cliente:

1. **Cumplimiento normativo SG-SST** — gestionar la información requerida por el Decreto 1072/2015 (Libro 2 Parte 2 Título 4 Capítulo 6) y la Resolución 0312/2019 (estándares mínimos), incluyendo:
   - Identificación y valoración de peligros (matriz IPER) por cargo y centro de trabajo.
   - Conformación y operación del COPASST, Comité de Convivencia Laboral, Brigada de Emergencias y Vigía SST.
   - Programación, registro y trazabilidad de exámenes médicos ocupacionales (ingreso, periódicos, post-incapacidad, egreso, reubicación) — Resolución 2346/2007.
   - Reporte de accidentes de trabajo (FURAT) y enfermedades laborales (FUREL) ante ARL, EPS y Ministerio del Trabajo (Resolución 1401/2007, Resolución 156/2005).
   - Investigación de incidentes y accidentes laborales — Resolución 1401/2007.
   - Plan de Emergencias por centro de trabajo — Decreto 1072/2015 Art. 2.2.4.6.25.
   - Plan Anual de Trabajo, indicadores SST y plan de mejoramiento — Resolución 0312/2019.
2. **Cálculo del porcentaje de cumplimiento de los estándares mínimos** del SG-SST conforme a la Resolución 0312/2019 (Art. 27 y 28), incluyendo la generación de evidencias documentales.
3. **Notificaciones y recordatorios automáticos** al titular y a su empleador/consultora sobre vencimientos documentales (exámenes médicos, capacitaciones, simulacros, renovación COPASST/Convivencia, etc.) por correo electrónico, WhatsApp Business (Wati) y/o SMS.
4. **Auditoría y trazabilidad** mediante un registro `audit_log` de mutaciones críticas, conforme a buenas prácticas de protección de datos (Ley 1581/2012 Art. 17 — deberes del responsable).
5. **Procesamiento mediante Inteligencia Artificial** para extracción estructurada de información de documentos (PDFs de exámenes médicos, transcripciones de visitas) — todos los outputs IA pasan validación de schema y, cuando la confianza es baja, revisión humana antes de persistirse.
6. **Defensa de los derechos del empleador y del titular** en caso de controversias laborales o procesos ante autoridades (Mintrabajo, ARL, Juzgados Laborales, SIC).
7. **Generación de reportes consolidados** para la consultora SG-SST que presta el servicio al empleador (multi-tenancy: la consultora `regis_org` ve agregados de sus clientes `companies`).

> **No se realizan tratamientos con finalidades comerciales, publicitarias o de marketing.** No se cede ni vende información a terceros con fines comerciales.

---

## 4. Categorías de datos tratados

### 4.1 Datos de identificación
Nombres y apellidos, tipo y número de documento (CC, CE, TI, PA, PEP), fecha de nacimiento, sexo (cuando es exigido por ficha médica), nacionalidad.

### 4.2 Datos de contacto
Dirección de residencia, ciudad, departamento, teléfono(s), correo electrónico personal, contacto de emergencia.

### 4.3 Datos laborales
Cargo, tipo de contrato, fecha de ingreso y retiro, centro de trabajo, EPS, AFP, ARL, salario (cuando se requiere para liquidación PILA, en futuras versiones), horario laboral, antecedentes laborales.

### 4.4 Datos sensibles (Ley 1581/2012 Art. 5)

> **Aviso especial:** los siguientes son **datos sensibles** según el Artículo 5 de la Ley 1581/2012. Su tratamiento requiere autorización **expresa, previa, informada y específica** del titular (Art. 6 ibídem) — diferente y más estricta que la autorización general. Ver `legal/autorizacion_tratamiento.md`.

- **Datos de salud:** conceptos de aptitud médico-ocupacional, restricciones, recomendaciones, diagnósticos relacionados con enfermedades laborales, antecedentes ocupacionales relevantes, exámenes paraclínicos referenciados en la historia clínica ocupacional. Estos datos se rigen además por la **Resolución 2346/2007** del Ministerio de la Protección Social (Art. 17 — reserva de la historia clínica ocupacional) y la Ley 23 de 1981 (Código de Ética Médica).
- **Datos biométricos** (en futuras versiones, si la plataforma agrega control de acceso por huella).

### 4.5 Datos de niños, niñas y adolescentes
La plataforma **no recolecta** datos de menores de edad como titulares. En el caso excepcional de menores que sean trabajadores autorizados (Art. 35 del Código Sustantivo del Trabajo y Ley 1098/2006), su tratamiento requiere autorización del representante legal (Decreto 1377/2013 Art. 12).

### 4.6 Datos de comités y compromisos
Nombres y cargos de integrantes del COPASST, Comité de Convivencia, brigada; firmas digitales o escaneadas en actas; compromisos asumidos.

### 4.7 Datos derivados de IA
Outputs de modelos de inteligencia artificial sobre documentos del titular (extractos estructurados, sugerencias de peligros, planes de emergencia preliminares). Estos outputs se conservan en cola de revisión humana cuando la confianza es inferior al 85% (capa 4 anti-alucinación — ver `prompts/01_operador_agent_system.md`).

---

## 5. Derechos del titular (ARCO + revocatoria + consulta + reclamo)

Conforme al Artículo 8 de la Ley 1581/2012 y Artículos 14 a 18 ibídem, el titular tiene los siguientes derechos:

### 5.1 Acceso (consulta)
Conocer, en cualquier tiempo y de forma gratuita, los datos personales que sobre él reposen en la base de datos del Responsable. La consulta se atiende en máximo **diez (10) días hábiles** contados desde la recepción (Art. 14, Ley 1581/2012).

### 5.2 Rectificación
Solicitar la rectificación o actualización de los datos cuando sean parciales, inexactos, incompletos, fraccionados, induzcan a error o aquellos cuyo tratamiento esté expresamente prohibido o no haya sido autorizado.

### 5.3 Cancelación (supresión)
Solicitar la supresión de los datos cuando considere que no están siendo tratados conforme a la Ley o cuando haya cesado la finalidad. La supresión opera salvo cuando exista un deber legal o contractual de conservación (ej.: historia clínica ocupacional, retención 20 años post-egreso conforme Resolución 2346/2007).

### 5.4 Oposición
Oponerse al tratamiento de los datos cuando éste no se haya basado en una causal legal habilitante distinta del consentimiento (cuando el tratamiento dependa exclusivamente del consentimiento, prima la revocatoria — §5.5).

### 5.5 Revocatoria del consentimiento
Revocar la autorización en cualquier momento, salvo cuando exista un deber legal o contractual de conservar los datos (Decreto 1377/2013 Art. 9). El plazo de atención es de **quince (15) días hábiles** (Art. 15, Ley 1581/2012, cuando se trate de reclamo).

### 5.6 Acceso a la prueba de la autorización
Solicitar copia de la autorización otorgada (Art. 12 Decreto 1377/2013).

### 5.7 Información sobre el uso
Ser informado, previa solicitud, respecto del uso que se le ha dado a los datos personales.

### 5.8 Presentar quejas ante la SIC
Acudir a la **Superintendencia de Industria y Comercio** una vez agotado el trámite de consulta o reclamo ante el Responsable (Art. 16, Ley 1581/2012).

### 5.9 Plazos de atención (Art. 14 y 15, Ley 1581/2012)

| Solicitud | Plazo máximo |
|---|---|
| Consulta | 10 días hábiles desde la recepción. Prorrogable hasta 5 días hábiles más, comunicando los motivos al titular. |
| Reclamo / rectificación / actualización / supresión / revocatoria | 15 días hábiles desde el día siguiente a la recepción. Prorrogable hasta 8 días hábiles más, comunicando los motivos al titular. |

---

## 6. Mecanismo para el ejercicio de los derechos

El titular puede ejercer sus derechos a través de los siguientes canales:

1. **Correo electrónico:** [VERIFICAR — proponer `proteccion.datos@<dominio-cliente>.co`] indicando en el asunto "Solicitud Habeas Data — [tipo de solicitud]".
2. **Comunicación escrita** dirigida a la dirección física del Responsable indicada en §1.
3. **Formulario web** dentro de la plataforma Regis (en futuras versiones, F2+).

La solicitud debe contener (Decreto 1377/2013 Art. 14 y 15):
- Identificación del titular (nombre y número de documento).
- Descripción precisa del derecho que ejerce y los hechos que lo motivan.
- Dirección física o electrónica para notificación.
- Documentos que respalden la solicitud cuando aplique.

El Responsable acusa recibo en un plazo no mayor a **dos (2) días hábiles** y atiende la solicitud en los plazos del §5.9.

---

## 7. Vigencia del aviso y del tratamiento

### 7.1 Vigencia de este aviso
Este aviso de privacidad rige desde la fecha indicada en la cabecera (versión 1.0, fecha de vigencia 2026-04-28) y mantiene su validez hasta que el Responsable expida una versión actualizada. Las versiones se conservan accesibles para consulta histórica (campo `consents.version_politica` en la base de datos).

### 7.2 Vigencia del tratamiento
El tratamiento se mantiene mientras:
1. Subsista la finalidad para la que los datos fueron recolectados (típicamente, mientras dure la relación laboral del titular con el empleador titular del cliente).
2. Exista un deber legal de conservación, en cuyo caso el dato se mantiene aún después de finalizada la relación, conforme a la tabla de retention de la §11 de este documento.

### 7.3 Conservación posterior a la terminación
La terminación de la relación laboral NO implica supresión inmediata. Los datos se conservan según la tabla de retention (§11) y, una vez vencido el plazo, se suprimen o anonimizan conforme a la política técnica de almacenamiento (`governance/08_storage_policy.md`).

---

## 8. Transferencia y transmisión de datos

### 8.1 Encargados del tratamiento (transmisión)

La operación de la plataforma implica la **transmisión** (Decreto 1377/2013 Art. 25) de datos personales a los siguientes encargados, todos vinculados por contrato con cláusulas de protección de datos:

| Encargado | Servicio | Ubicación de servidores |
|---|---|---|
| **Supabase, Inc.** | Base de datos PostgreSQL gestionada y storage de archivos | Estados Unidos / Unión Europea (region elegida por el Responsable; por defecto eu-central-1 cuando aplique) |
| **Resend, Inc.** | Envío de correos transaccionales | Estados Unidos |
| **Wati / Meta Platforms, Inc.** | Mensajería WhatsApp Business | Estados Unidos / Brasil (servidores Meta) |
| **Anthropic, Inc.** | Modelos Claude para procesamiento IA | Estados Unidos |
| **Groq, Inc.** | Modelos Llama (inferencia rápida) para IA | Estados Unidos |
| **Google LLC (Gemini)** | Modelos Gemini para IA | Estados Unidos / Multi-región |
| **n8n GmbH (autohospedaje)** | Orquestación de workflows | Servidor administrado por el operador (Colombia / EE. UU., según despliegue) |
| **GitHub, Inc.** | Repositorio de código (NO almacena datos personales del titular) | Estados Unidos |

### 8.2 Transferencia internacional (Art. 26 y 27 Decreto 1377/2013)

Algunos países donde residen los servidores (EE. UU., región Meta) **no han sido declarados expresamente** como países con nivel adecuado de protección por la SIC. La transferencia internacional se ampara en:

- La **autorización expresa del titular** (ver `legal/autorizacion_tratamiento.md`).
- La **necesidad para la ejecución del contrato** entre el empleador titular del cliente y la consultora (Decreto 1377/2013 Art. 26 literal d).
- **Cláusulas contractuales** con los encargados que replican las obligaciones de la Ley 1581/2012 (estándar SCC / DPA del proveedor cuando aplica).

### 8.3 Cesiones a terceros (transferencia)

Los datos pueden ser **transferidos** (no únicamente transmitidos) en los siguientes casos:

- A la **ARL** del trabajador, en caso de FURAT/FUREL (Resolución 1401/2007).
- Al **Ministerio del Trabajo**, conforme a obligaciones de reporte legal.
- A **EPS** del trabajador, en caso de incapacidad o accidente.
- A **autoridades judiciales o administrativas competentes** mediante orden formal.
- En el **caso de auditorías de SG-SST** ordenadas por Mintrabajo o por la propia empresa (con alcance acotado).

No se realizan otras cesiones a terceros con fines distintos a los enumerados.

---

## 9. Datos sensibles — protección reforzada

Los datos sensibles (§4.4) reciben las siguientes salvaguardas adicionales:

1. **Almacenamiento separado:** los archivos médicos viven en bucket privado `medical_exams_secure` con políticas RLS (Row Level Security) que solo permiten acceso al médico ocupacional autorizado y al administrador de empresa con justificación auditada (D-ERD-04 del ERD).
2. **Cifrado en tránsito y en reposo:** TLS 1.2+ para tránsito; cifrado nativo de Supabase Storage en reposo.
3. **Acceso auditado:** todo acceso a `medical_exams` se registra en `audit_log` con `actor_user_id`, timestamp y motivo. La consulta sin justificación legal puede constituir falta disciplinaria y vulneración del Art. 4 numeral 6 de la Ley 1581/2012 (principio de seguridad).
4. **Retención reforzada:** 20 años post-egreso del trabajador conforme a la Resolución 2346/2007. La supresión solo opera tras este plazo.
5. **Reserva profesional:** la información médica está cobijada por reserva profesional médica (Ley 23/1981 — Código de Ética Médica). El operador IT NO accede al contenido clínico salvo en mantenimientos técnicos justificados con bitácora.

---

## 10. Identificación de bases de datos a registrar en el RNBD ante la SIC

Conforme a la **Circular Externa 002 de 2015** (modificada por Circular Externa 003 de 2018) de la SIC y al Decreto 1074/2015 Art. 2.2.2.26.1.1 y siguientes, el Responsable debe registrar sus bases de datos en el **Registro Nacional de Bases de Datos (RNBD)** cuando la persona jurídica responsable tenga activos totales superiores a 100 000 UVT o sea persona natural.

La plataforma Regis SG-SST opera, para cada cliente Responsable, las siguientes bases de datos lógicas que deben evaluarse para registro:

1. **Trabajadores** (`workers` + `worker_company`) — contiene datos de identificación, contacto y laborales.
2. **Exámenes médicos ocupacionales** (`medical_exams`) — datos sensibles de salud.
3. **Comités SST** (`committees`, `committee_members`) — datos de identificación de integrantes.
4. **Compromisos y actas** (`meeting_actas`, `compromisos`) — datos de identificación.
5. **Reportes ATEL** (`furat_reports`) — datos de identificación + datos sensibles del evento.
6. **Consentimientos Habeas Data** (`consents`) — registro de autorizaciones.
7. **Notificaciones** (`notifications`) — datos de contacto y mensajes.

Cada Responsable cliente decide si la totalidad de estas bases configuran una sola base o varias en el RNBD, conforme a la guía de la SIC. La plataforma facilita la generación del **inventario** y los **manuales de tratamiento** requeridos por el RNBD pero **no realiza el registro** por el cliente — esta es responsabilidad del Responsable.

---

## 11. Tabla de retención por categoría de dato

| Categoría | Retención | Norma de respaldo |
|---|---|---|
| Datos de identificación y contacto del trabajador | Mientras dure la relación laboral + 5 años | Decreto 1072/2015 Art. 2.2.4.6.13 (conservación documental SG-SST). |
| Historia clínica ocupacional / exámenes médicos | **20 años post-egreso del trabajador** | Resolución 2346/2007 (modificada por Resolución 1918/2009 en custodia). |
| FURAT / FUREL | Mientras dure la empresa + 20 años | Resolución 1401/2007 + práctica de litigios laborales. |
| Actas y compromisos de comités | 5 años post-vigencia del comité | Decreto 1072/2015 Art. 2.2.4.6.13. |
| Consentimientos Habeas Data | Vida del titular + 5 años post-revocación | Ley 1581/2012 Art. 12 + Decreto 1377/2013. |
| Audit log | 5 años | Ley 1581/2012 Art. 17 (deber de conservar prueba del tratamiento) + práctica contable. |
| Reportes consolidados de cumplimiento | 5 años | Decreto 1072/2015. |
| Outputs de IA (revisión humana) | 90 días post-revisión, luego compactados | Política técnica de la plataforma (`governance/08_storage_policy.md`). |

---

## 12. Seguridad de la información (Art. 4 numeral 6, Ley 1581/2012)

El Responsable y el Encargado adoptan medidas técnicas, humanas y administrativas razonables para proteger la información:

- Autenticación de usuarios mediante Supabase Auth (OAuth + email/password con políticas robustas).
- Row Level Security (RLS) por `regis_org_id` y `company_id` en todas las tablas con datos del cliente.
- Cifrado TLS 1.2+ en tránsito y cifrado en reposo del proveedor.
- Auditoría inmutable (`audit_log` particionado, append-only).
- Detección de anomalías mediante el Auditor-Agent y el Loop Detector (`governance/07_auditor_agent_spec.md`, `security/02_loop_detector.md`).
- Política formal de almacenamiento (`governance/08_storage_policy.md`).
- Capacitación al personal del Responsable y del Encargado en deberes de confidencialidad.
- Segregación de datos sensibles (bucket separado para `medical_exams`).

En caso de **incidente de seguridad** (Art. 17 literal n, Ley 1581/2012; Circular Externa 008/2014 SIC sobre reporte de violaciones), el Encargado lo notifica al Responsable en máximo **48 horas** desde la detección, y el Responsable lo reporta a la SIC en los términos exigidos.

---

## 13. Modificaciones al aviso

El Responsable se reserva el derecho de modificar este aviso. Los cambios se comunicarán mediante:
- Publicación en la página web del Responsable.
- Notificación por correo electrónico a los titulares activos.
- Actualización de la versión registrada en `consents.version_politica` (los consentimientos previamente otorgados sobre versiones anteriores **no caducan automáticamente**, pero los cambios sustantivos pueden requerir nueva autorización).

Si el cambio implica una **finalidad nueva o un cambio sustantivo de finalidades**, se solicita una autorización nueva al titular conforme al Art. 9 de la Ley 1581/2012.

---

## 14. Datos de contacto del Oficial de Privacidad / responsable de atención

[VERIFICAR — completar al cierre del onboarding]

- **Nombre:** [VERIFICAR]
- **Cargo:** Oficial de Privacidad / Responsable del tratamiento de datos personales
- **Correo:** [VERIFICAR]
- **Teléfono:** [VERIFICAR]
- **Horario de atención:** lunes a viernes, 8:00 a 17:00 (hora Colombia COT)

---

## 15. Autoridad de control

**Superintendencia de Industria y Comercio (SIC)** — Delegatura para la Protección de Datos Personales.
- Página: https://www.sic.gov.co
- Dirección: Carrera 13 No. 27-00, Bogotá D.C., Colombia.
- Correo radicación: contactenos@sic.gov.co

El titular puede acudir a la SIC una vez agotado el trámite ante el Responsable (§5.8).

---

## 16. Aceptación

La permanencia del titular en la plataforma, la firma del documento `legal/autorizacion_tratamiento.md` o la aceptación expresa mediante checkbox en la interfaz web (que se persiste en la tabla `consents` con `version_politica` apuntando a este documento) constituyen prueba del conocimiento de este aviso.

Para el tratamiento de **datos sensibles** (§4.4), la aceptación de este aviso **no es suficiente**: se requiere autorización expresa, previa, informada y específica conforme al `legal/autorizacion_tratamiento.md`.

---

## 17. Cumplimiento de Reglas Inquebrantables (R1–R7) para esta tarea

- **R1:** documento producido en una única tarea consolidada T-F0-030/031/032/039doc.
- **R2:** sin dependencias declaradas (Issue #17 declara ninguna).
- **R3:** este archivo no se autoaprueba; espera veredicto QA-Agent.
- **R5:** no se modifican ADRs ni el ERD; este archivo es nuevo entregable.
- **R7:** decisiones técnicas no especificadas (placeholders `[VERIFICAR]` en lugar de invención de razón social/NIT, mapeo de bases para RNBD, plazo de notificación de incidente 48h alineado a circular SIC) están documentadas explícitamente en cada sección.

---

**Versión:** 1.0
**Vigencia desde:** 2026-04-28
**Próxima revisión obligatoria:** 2027-04-28 (revisión anual recomendada).
