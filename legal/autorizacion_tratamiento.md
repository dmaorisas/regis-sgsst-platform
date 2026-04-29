# Autorización para el Tratamiento de Datos Personales

> **Tarea:** T-F0-032
> **Issue:** [#17](https://github.com/dmaorisas/regis-sgsst-platform/issues/17)
> **Marco normativo:** Ley estatutaria 1581 de 2012 (Arts. 6, 8, 9 y 10), Decreto 1377 de 2013 (Arts. 5, 6, 7, 9, 10, 11, 12, 13 y 14), Resolución 2346 de 2007 (datos sensibles de salud ocupacional), Constitución Política Art. 15, Ley 1010 de 2006, Ley estatutaria 1266 de 2008.
> **Documento complementario obligatorio:** `legal/aviso_privacidad.md` (versión 1.0).
> **Versión documento:** 1.0
> **Fecha vigencia:** 2026-04-28
> **Destinatarios:** trabajadores del empleador titular del cliente que opera la plataforma Regis SG-SST.

---

## 1. Identificación del titular del dato (a completar por el titular)

| Campo | Valor |
|---|---|
| Nombres y apellidos completos | _________________________________________ |
| Tipo de documento | ☐ CC ☐ CE ☐ TI ☐ PA ☐ PEP |
| Número de documento | _________________________________________ |
| Fecha de nacimiento | __/__/____ |
| Cargo actual | _________________________________________ |
| Centro de trabajo | _________________________________________ |
| Empresa empleadora | _________________________________________ |
| Correo electrónico personal | _________________________________________ |
| Teléfono de contacto | _________________________________________ |

> **Aceptación digital:** cuando esta autorización se otorga mediante interfaz web (checkbox), el sistema persiste en la tabla `consents` los siguientes campos de evidencia: `worker_id`, `company_id`, `consent_type`, `version_politica` (apuntando a la versión 1.0 de este documento), `aceptado_at`, `ip_address` (cuando aplica), `user_agent` (cuando aplica). El registro es inmutable (no se borra; la revocación se registra como `revocado_at`).

---

## 2. Identificación del Responsable del tratamiento

[VERIFICAR — los siguientes campos se completan al cierre del onboarding del cliente y deben ser idénticos a los del `legal/aviso_privacidad.md` §1.]

| Campo | Valor |
|---|---|
| Razón social del Responsable | [VERIFICAR] |
| NIT | [VERIFICAR] |
| Domicilio | [VERIFICAR] |
| Correo electrónico (Habeas Data) | [VERIFICAR] |
| Página web del Aviso de Privacidad | [VERIFICAR] |

**Encargado del tratamiento (operador tecnológico):** [Grupo Dmaori S.A.S. / razón social del operador — placeholder]. Opera la plataforma Regis SG-SST como Encargado conforme al Art. 3 literal d de la Ley 1581/2012.

---

## 3. Declaración previa y voluntaria del titular

Yo, identificado como aparece al pie de este documento, manifiesto que:

1. He sido **informado de manera previa, expresa, completa y comprensible** sobre el tratamiento de mis datos personales, conforme al Art. 9 de la Ley 1581/2012.
2. He recibido o tenido acceso al **Aviso de Privacidad** (`legal/aviso_privacidad.md` versión 1.0) y entiendo:
   - La identidad del Responsable.
   - Las finalidades específicas del tratamiento.
   - Que el suministro de datos es **voluntario**, salvo cuando la ley lo exija (datos requeridos por la legislación SG-SST).
   - Mis derechos como titular (acceso, rectificación, actualización, supresión, revocatoria, oposición y consulta — Art. 8 ibídem).
   - El mecanismo y plazos para ejercer mis derechos (10 días hábiles para consulta, 15 días hábiles para reclamo; prorrogables conforme al Art. 14 y 15 de la Ley 1581/2012).
   - Que puedo acudir a la **Superintendencia de Industria y Comercio** una vez agotado el trámite ante el Responsable (Art. 16 ibídem).
3. He resuelto las dudas que tenía sobre el tratamiento ANTES de otorgar esta autorización.

---

## 4. Autorización general (Ley 1581/2012 Art. 6 — datos no sensibles)

Otorgo mi **autorización previa, expresa e informada** al Responsable y a su Encargado para que recolecten, almacenen, usen, circulen, supriman, transmitan y transfieran mis datos personales no sensibles (categorías §4.1, §4.2, §4.3 y §4.6 del Aviso de Privacidad) con las finalidades descritas en la sección 3 de dicho Aviso, en particular:

- ☐ Cumplimiento del Sistema de Gestión de Seguridad y Salud en el Trabajo (Decreto 1072/2015, Resolución 0312/2019).
- ☐ Conformación y operación del COPASST, Comité de Convivencia, Brigada de Emergencias o Vigía SST cuando aplique.
- ☐ Notificaciones y recordatorios automáticos por correo electrónico, WhatsApp Business y/o SMS.
- ☐ Generación de reportes de cumplimiento para mi empleador y la consultora SG-SST contratada.
- ☐ Auditoría y trazabilidad de accesos a mis datos.

**Marca de aceptación general:**

> ☐ **Sí, autorizo** el tratamiento de mis datos personales no sensibles en los términos descritos.

---

## 5. Autorización expresa para datos sensibles (Ley 1581/2012 Art. 6 + Resolución 2346/2007)

> **Aviso especial — Art. 6 Ley 1581/2012:** "El Tratamiento de los datos sensibles está prohibido, excepto cuando: a) El Titular haya dado su autorización **explícita** a dicho Tratamiento, salvo en los casos que por ley no sea requerido el otorgamiento de dicha autorización; b) El Tratamiento sea necesario para salvaguardar el interés vital del Titular y este se encuentre física o jurídicamente incapacitado…"

Los **datos sensibles** que serán tratados con motivo de mi participación en el SG-SST son los descritos en la §4.4 del Aviso de Privacidad e incluyen, sin limitarse a:

- **Datos de salud:** conceptos de aptitud médico-ocupacional emitidos por médico con licencia SST (apto, apto con restricciones, no apto, aplazado), restricciones, recomendaciones, antecedentes ocupacionales relevantes, diagnósticos relacionados con enfermedades laborales, información derivada de exámenes médicos ocupacionales (ingreso, periódicos, post-incapacidad, egreso, reubicación) conforme a la **Resolución 2346 de 2007**.
- **Datos derivados de reportes ATEL** (FURAT, FUREL e investigación de accidente/EL) cuando aplique a mi caso.

Reconozco que el suministro de datos sensibles es **facultativo** y que no estoy obligado a autorizar su tratamiento. Sin embargo, entiendo que **algunos datos sensibles son legalmente exigidos** para el desempeño de mi cargo y para el cumplimiento del SG-SST por parte de mi empleador, conforme a:

- **Resolución 2346/2007** Arts. 4 a 11 (obligación de exámenes médicos ocupacionales).
- **Decreto 1072/2015** Art. 2.2.4.6.7 (evaluaciones médicas ocupacionales).
- **Ley 1562/2012** y **Resolución 1401/2007** (reporte e investigación de AT/EL).

**Marca de aceptación expresa para datos sensibles:**

> ☐ **Sí, autorizo de manera expresa, previa, informada y específica** el tratamiento de mis datos sensibles de salud ocupacional con las finalidades descritas en el Aviso de Privacidad y en esta autorización.

> ☐ Reconozco que la autorización para datos sensibles es **distinta y adicional** a la autorización general (§4) y que puedo revocarla independientemente.

---

## 6. Autorización para envío de comunicaciones por canales electrónicos

Autorizo expresamente al Responsable y a su Encargado para que me contacten a través de los siguientes canales con las finalidades de §4 y §5 (cuando aplique):

- ☐ Correo electrónico — dirección suministrada en §1.
- ☐ WhatsApp Business (Wati) — al número telefónico suministrado en §1.
- ☐ SMS — al número telefónico suministrado en §1.
- ☐ Llamada telefónica — al número suministrado en §1.

Entiendo que estos canales se utilizan para recordatorios de exámenes médicos, vencimientos documentales, capacitaciones, simulacros, citaciones a comités y notificaciones operativas del SG-SST, **no para fines comerciales o publicitarios**.

---

## 7. Autorización para transferencia y transmisión internacional

Reconozco y autorizo la **transmisión** y, cuando aplique, **transferencia** de mis datos a los encargados listados en §8 del Aviso de Privacidad, incluyendo Estados Unidos, Unión Europea y otras jurisdicciones donde residan los servidores de los proveedores SaaS (Supabase, Resend, Wati/Meta, Anthropic, Groq, Google).

Comprendo que algunos países pueden no haber sido declarados con nivel adecuado de protección por la SIC y que la transmisión se ampara en:
- Mi autorización expresa (Decreto 1377/2013 Art. 26 literal a).
- La necesidad para la ejecución del contrato del empleador con la consultora SG-SST (Decreto 1377/2013 Art. 26 literal d).
- Cláusulas contractuales de los encargados que replican las obligaciones de la Ley 1581/2012.

> ☐ **Sí, autorizo** la transferencia y transmisión internacional de mis datos en los términos descritos.

---

## 8. Autorización para procesamiento mediante Inteligencia Artificial

Reconozco que la plataforma Regis SG-SST utiliza modelos de Inteligencia Artificial (Claude de Anthropic, Llama vía Groq, Gemini de Google) para tareas de extracción estructurada de información de documentos (por ejemplo, datos contenidos en PDFs de exámenes médicos ocupacionales, transcripciones de visitas a centros de trabajo). Las salvaguardas aplicables son:

1. Los outputs de IA pasan por **validación de schema** antes de persistirse (capa anti-alucinación 1).
2. Cuando la confianza del modelo es inferior al 85% en un campo crítico, el output se envía a **revisión humana** antes de persistirse (capa 4).
3. Si el modelo no encuentra un dato, devuelve `null` (no inventa).
4. Toda extracción se acompaña de **citation** al texto fuente (capa 2).
5. Los proveedores de IA están vinculados por sus respectivas políticas de privacidad y términos de servicio empresariales que prohíben el uso de los datos para entrenamiento sin autorización.

> ☐ **Sí, autorizo** el procesamiento de mis datos mediante los modelos de IA descritos para las finalidades del SG-SST.

---

## 9. Vigencia y revocatoria

### 9.1 Vigencia
Esta autorización rige desde la fecha de su otorgamiento y permanece vigente:
- **Datos no sensibles:** mientras dure la finalidad (típicamente, mientras subsista la relación laboral del titular con su empleador) y los plazos de conservación legal posteriores (Aviso de Privacidad §11).
- **Datos sensibles (salud):** mientras dure la relación laboral + 20 años post-egreso conforme a la Resolución 2346/2007.

### 9.2 Revocatoria
Puedo revocar esta autorización **en cualquier momento** mediante comunicación al correo o canal indicado en §6 del Aviso de Privacidad. La revocatoria se atiende en máximo **15 días hábiles** (Art. 15 Ley 1581/2012, prorrogables 8 días hábiles más).

**Limitaciones a la revocatoria** (Decreto 1377/2013 Art. 9):
- La revocatoria no procede cuando exista un **deber legal o contractual** de conservar los datos. En particular:
  - La historia clínica ocupacional debe conservarse 20 años post-egreso (Resolución 2346/2007), lapso durante el cual la revocatoria opera limitadamente: el dato no se utiliza para nuevas finalidades, pero se conserva por mandato legal.
  - Los reportes ATEL ya enviados a la ARL/EPS/Mintrabajo no pueden retirarse de las bases de esas entidades por la revocatoria del titular ante el Responsable.
- La revocatoria parcial es admisible: por ejemplo, revocar el envío por WhatsApp pero mantener el envío por correo.

### 9.3 Efecto de la revocatoria
Una vez recibida la revocatoria, el Responsable detiene el tratamiento para las finalidades cuya autorización dependía exclusivamente del consentimiento. Los datos cuyo tratamiento se ampara en obligación legal continúan tratándose conforme al deber legal específico, con la trazabilidad correspondiente.

---

## 10. Tratamiento de datos de menores (Decreto 1377/2013 Art. 12)

Si el titular es menor de edad (caso excepcional de menor trabajador autorizado conforme al Código Sustantivo del Trabajo y Ley 1098/2006), esta autorización debe ser **otorgada por el representante legal**, previa consideración del interés superior del niño y del respeto de sus derechos fundamentales. La firma del representante legal y la copia de su documento de identidad son requisitos indispensables.

> En la operación estándar de la plataforma, NO se admiten titulares menores de edad. Esta sección queda como salvaguarda para escenarios excepcionales legalmente válidos.

---

## 11. Derechos del titular (recordatorio)

Conforme al Art. 8 de la Ley 1581/2012 y al §5 del Aviso de Privacidad, en cualquier momento puedo:

- **Conocer** los datos que sobre mí reposen (consulta).
- **Actualizar y rectificar** datos inexactos.
- **Solicitar la supresión** de datos cuya finalidad haya cesado.
- **Solicitar prueba** de esta autorización.
- **Oponerme** al tratamiento cuando no se base en causal legal habilitante distinta del consentimiento.
- **Revocar** esta autorización conforme a §9.2.
- **Presentar quejas** ante la SIC tras agotar el trámite ante el Responsable (Art. 16 ibídem).

Mecanismo: ver §6 del Aviso de Privacidad.

---

## 12. Constancia y firma

Declaro que he leído íntegramente este documento y el Aviso de Privacidad referenciado, que comprendo su contenido y que otorgo mi autorización de manera **libre, voluntaria, previa, expresa, informada y específica** según corresponda a cada finalidad y categoría de datos.

| Campo | Valor |
|---|---|
| Lugar | __________________________ |
| Fecha | __/__/____ |
| Firma del titular | _________________________________________ |
| Documento del titular | _________________________________________ |

**En caso de menor de edad — datos del representante legal:**

| Campo | Valor |
|---|---|
| Nombres y apellidos del representante legal | _________________________________________ |
| Tipo y número de documento | _________________________________________ |
| Parentesco / vínculo | _________________________________________ |
| Firma del representante legal | _________________________________________ |

---

## 13. Versión digital — checkbox de aceptación en interfaz web

Cuando esta autorización se otorga digitalmente, la interfaz web presenta los siguientes elementos al titular y registra cada uno como un evento independiente en la tabla `consents`:

| `consent_type` | Texto del checkbox | Categoría Ley 1581 |
|---|---|---|
| `general_data` | "Autorizo el tratamiento de mis datos personales no sensibles para las finalidades descritas en el Aviso de Privacidad y esta Autorización." | Art. 6 (autorización general). |
| `sensitive_health` | "Autorizo de manera expresa el tratamiento de mis datos sensibles de salud ocupacional conforme a la Resolución 2346/2007 y esta Autorización." | Art. 6 literal a (autorización explícita para datos sensibles). |
| `electronic_channels` | "Autorizo recibir comunicaciones del SG-SST por correo electrónico, WhatsApp Business y/o SMS al teléfono y correo registrados." | Art. 9 (canal). |
| `international_transfer` | "Autorizo la transmisión y transferencia internacional de mis datos a los proveedores listados en el Aviso de Privacidad." | Art. 26 Decreto 1377/2013. |
| `ai_processing` | "Autorizo el procesamiento de mis datos mediante modelos de Inteligencia Artificial con las salvaguardas descritas." | Tratamiento automatizado, principio de finalidad y veracidad (Art. 4 Ley 1581/2012). |

Cada checkbox se marca de forma **independiente** (no está pre-marcado por defecto, conforme a la jurisprudencia de la SIC sobre autorizaciones unequivocas). El registro digital persiste:

- `worker_id` (FK a `workers`).
- `company_id` (FK a `companies`).
- `consent_type` (cada uno de los anteriores).
- `version_politica` (apuntando a "aviso_privacidad_v1.0" y "autorizacion_v1.0").
- `aceptado_at` (timestamptz).
- `ip_address` y `user_agent` cuando se obtienen por interfaz web.
- `revocado_at` (null hasta revocación).

---

## 14. Reserva especial de datos médicos

Comprendo que los datos médicos suministrados estarán cobijados por **reserva profesional médica** (Ley 23 de 1981 — Código de Ética Médica, Arts. 33 a 38) y que únicamente personal autorizado del proceso SG-SST tendrá acceso a ellos. El operador tecnológico (Encargado) garantiza que su personal técnico **no accede al contenido clínico** salvo en mantenimientos justificados y con bitácora.

---

## 15. Cumplimiento de Reglas Inquebrantables (R1–R7) para esta tarea

- **R1:** documento producido en una única tarea consolidada T-F0-030/031/032/039doc.
- **R2:** sin dependencias declaradas (Issue #17 declara ninguna).
- **R3:** este archivo no se autoaprueba; espera veredicto QA-Agent.
- **R5:** no se modifican ADRs ni el ERD; este archivo es nuevo entregable.
- **R7:** decisiones técnicas no especificadas (separación en 5 `consent_type` independientes; persistencia de IP y user_agent solo cuando se obtienen por web; mantener placeholders `[VERIFICAR]` en lugar de inventar razón social/NIT) están documentadas explícitamente arriba.

---

**Versión:** 1.0
**Vigencia desde:** 2026-04-28
**Próxima revisión obligatoria:** 2027-04-28 (revisión anual recomendada).
**Documento complementario:** `legal/aviso_privacidad.md` v1.0.
