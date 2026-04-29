# Diccionario de Prompts Base — Plataforma Regis SG-SST

> **Tarea:** T-F0-031 (nivel QA estricto por impacto en módulos IA)
> **Issue:** [#17](https://github.com/dmaorisas/regis-sgsst-platform/issues/17)
> **Propósito:** Templates parametrizados de prompts que los módulos F2–F5 invocan a través del router LLM (`governance/06_llm_routing_config.md`). Cada prompt incluye variables, output schema (Zod-compatible), política de citation obligatoria, manejo de baja confianza y reglas anti-alucinación.
> **Política transversal:** ningún output va al dato real sin pasar el schema y la validación humana cuando `confidence_per_field < 0.85`. Los outputs por debajo del umbral entran a `ai_outputs_pending_review`.

---

## Convenciones globales

### Formato de variables
Las variables siguen sintaxis Mustache: `{{variable_name}}`. Se interpolan en el texto del prompt **antes** de llamar al provider (Claude / Groq / Gemini). El router elige modelo según complejidad declarada por cada prompt.

### Schema de output
Cada prompt declara su schema en pseudo-Zod (TypeScript) que el módulo Node aplica con `safeParse` antes de persistir. Esto se conoce como capa 1 de anti-alucinación (`prompts/01_operador_agent_system.md`, sección "Anti-alucinación").

### Política de citation (capa 2)
Cuando el prompt extrae datos de un PDF/audio, debe incluir el campo `citation` con el **texto literal** que respaldó la extracción (`source_text` y `page_or_timestamp`). Sin citation, el output **no se persiste** (se rechaza en capa 1).

### Política anti-invención (capa 4)
Si el modelo no encuentra un dato, debe devolver `null` (NO inventar valor plausible). Adicionalmente, devuelve `confidence_per_field` con un escalar `[0,1]` por cada campo. El módulo aplica:

| `confidence_per_field` | Acción |
|---|---|
| `>= 0.85` | Persiste directamente. |
| `>= 0.60 y < 0.85` | Persiste pero marca `requires_review = true`; entra a `ai_outputs_pending_review`. |
| `< 0.60` | NO persiste. Solo entra a `ai_outputs_pending_review` para validación humana. |
| `null` (no se intentó) | Tratado como `0.0`. |

### Política de fallback (capa 3)
Si la primera invocación produce un output que falla `safeParse`, se reintenta una vez con instrucción reforzada: `"El output anterior no respetó el schema. Reintenta y respeta exactamente la estructura JSON pedida."` Si falla de nuevo, se genera `flag_concern` (no se inventa).

### Variables comunes
| Variable | Tipo | Descripción |
|---|---|---|
| `{{run_id}}` | UUID | Identificador único de la ejecución; se persiste en `ai_usage.id`. |
| `{{company_id}}` | UUID | Empresa cliente (multi-tenancy). |
| `{{regis_org_id}}` | UUID | Consultora administradora. |
| `{{language}}` | string | Por defecto `"es-CO"` (español Colombia). |

### System message común
Todos los prompts heredan el siguiente preámbulo (que el router prepende automáticamente):

```text
Eres un asistente especializado en SG-SST (Sistema de Gestión de Seguridad y Salud en el Trabajo) bajo regulación colombiana (Decreto 1072/2015, Resolución 0312/2019, GTC-45). Operas dentro de la plataforma Regis. Reglas inquebrantables:
1. Si un dato no está claro o no se encuentra, responde `null`. NUNCA inventes valores plausibles.
2. Toda extracción debe acompañarse de la cita textual (citation) que la respalda.
3. Tu output DEBE ser JSON válido que respete exactamente el schema indicado en el prompt. Sin texto adicional fuera del JSON.
4. Si tienes baja confianza en un campo, expresa `confidence_per_field` < 1.0; no infles tu confianza.
5. Idioma de salida: español Colombia (es-CO) salvo indicación contraria.
```

---

## 1) `extract_medical_exam_pdf`

**Propósito:** Extrae datos estructurados de un PDF de examen médico ocupacional (pre-ocupacional, periódico, post-incapacidad, post-ocupacional, reubicación) con citation obligatoria al texto fuente.

**Routing recomendado:** complejidad `media` → Claude Sonnet (precisión > velocidad). Ver `governance/06_llm_routing_config.md`.

**Persiste en:** `medical_exams` [ERD]. Bucket privado, retención 20 años (Resolución 2346/2007).

### Variables

| Variable | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `{{pdf_text}}` | string | sí | Texto OCR/extracción del PDF. Si el PDF es escaneado debe pasar por OCR antes. |
| `{{worker_hint_document_number}}` | string | no | Número de documento esperado (si se conoce); si no coincide con el extraído, baja la confianza. |
| `{{run_id}}` | UUID | sí | Identificador del run (se persiste en `medical_exams.extracted_by_ai_run_id`). |
| `{{language}}` | string | no (default `"es-CO"`) | — |

### Texto del prompt

```text
Eres un extractor de datos médico-ocupacionales. Recibes el texto extraído de un PDF de examen médico ocupacional emitido por un médico con licencia SST en Colombia. Tu tarea: devolver un JSON estructurado con los datos del examen.

CONTEXTO LEGAL:
- Resolución 2346/2007 (Mintrabajo) regula los exámenes médicos ocupacionales.
- Tipos válidos de examen: "ingreso" (pre-ocupacional), "periodico", "post_incapacidad", "egreso" (post-ocupacional), "reubicacion".
- Conceptos válidos de aptitud: "apto", "apto_con_restricciones", "no_apto", "aplazado".
- Si encuentras un valor que no coincida con estos enumerados, mapea a la categoría más cercana y baja la confianza.

REGLAS:
1. Si un dato no está claro o no se encuentra, devuelve `null` para ese campo. NO inventes.
2. Para cada campo extraído, incluye en `citations[campo]` el texto literal del PDF que respalda la extracción y la página aproximada (o `null` si no se pudo determinar).
3. `confidence_per_field` debe ser un escalar [0,1] reflejando tu certeza por campo.
4. Si la cédula extraída NO coincide con `worker_hint_document_number` (cuando viene), `confidence_per_field.numero_documento` <= 0.5.
5. Si no detectas un PDF de examen médico ocupacional (parece ser otro documento), devuelve `error: "not_a_medical_exam"` y null en todos los campos.

ENTRADA:
worker_hint_document_number: {{worker_hint_document_number}}
language: {{language}}

TEXTO DEL PDF:
"""
{{pdf_text}}
"""

Devuelve EXCLUSIVAMENTE el JSON descrito en el schema. Sin texto adicional.
```

### Output schema (Zod-compatible)

```ts
import { z } from "zod";

export const ExtractMedicalExamOutput = z.object({
  error: z.enum(["not_a_medical_exam"]).nullable(),
  data: z.object({
    nombres: z.string().nullable(),
    apellidos: z.string().nullable(),
    tipo_documento: z.enum(["CC", "CE", "TI", "PA", "PEP"]).nullable(),
    numero_documento: z.string().regex(/^[0-9]{4,15}$/).nullable(),
    fecha_examen: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    tipo_examen: z.enum([
      "ingreso",
      "periodico",
      "post_incapacidad",
      "egreso",
      "reubicacion",
    ]).nullable(),
    concepto_aptitud: z.enum([
      "apto",
      "apto_con_restricciones",
      "no_apto",
      "aplazado",
    ]).nullable(),
    restricciones: z.array(z.string()).default([]),
    recomendaciones: z.array(z.string()).default([]),
    medico_nombre: z.string().nullable(),
    medico_licencia_sst: z.string().nullable(),
    ips_o_consultorio: z.string().nullable(),
  }),
  confidence_per_field: z.object({
    nombres: z.number().min(0).max(1),
    apellidos: z.number().min(0).max(1),
    tipo_documento: z.number().min(0).max(1),
    numero_documento: z.number().min(0).max(1),
    fecha_examen: z.number().min(0).max(1),
    tipo_examen: z.number().min(0).max(1),
    concepto_aptitud: z.number().min(0).max(1),
    restricciones: z.number().min(0).max(1),
    recomendaciones: z.number().min(0).max(1),
    medico_nombre: z.number().min(0).max(1),
    medico_licencia_sst: z.number().min(0).max(1),
    ips_o_consultorio: z.number().min(0).max(1),
  }),
  citations: z.record(
    z.string(),
    z.object({
      source_text: z.string(),
      page_or_section: z.string().nullable(),
    }).nullable(),
  ),
  overall_confidence: z.number().min(0).max(1),
  notes: z.string().nullable(),
});

export type ExtractMedicalExamOutput = z.infer<typeof ExtractMedicalExamOutput>;
```

### Manejo de baja confianza
- Si `overall_confidence < 0.60` → no persiste; entra a `ai_outputs_pending_review` con estado `pending_human_review`.
- Si cualquier `confidence_per_field` <0.60 sobre los campos críticos (`numero_documento`, `concepto_aptitud`, `fecha_examen`) → `requires_review = true` aunque overall sea alto.
- Si `error == "not_a_medical_exam"` → notifica al usuario que subió el archivo; NO crea registro en `medical_exams`.

### Anti-alucinación específica
- El campo `numero_documento` debe pasar regex de cédula colombiana (`^[0-9]{4,15}$`) y ser **literal** del PDF; no se permite "completar dígitos faltantes".
- `restricciones` y `recomendaciones` deben ser strings literales; si el modelo intenta resumirlas, baja `confidence_per_field` a 0.7 máximo.
- `citations[campo]` es obligatoria para todo campo no-null. Si el modelo persiste un valor sin citation → el módulo Node lo descarta y baja `overall_confidence` a 0.

---

## 2) `enrich_risk_matrix_from_ciiu`

**Propósito:** Dado un CIIU y descripción de empresa, sugiere peligros adicionales no contemplados en la matriz IPER existente, con referencia obligatoria a GTC-45 y, cuando sea posible, al manual ARL aplicable.

**Routing recomendado:** complejidad `media-alta` → Claude Sonnet. Para sugerencias rápidas con poca novedad, Groq Llama acepta como fallback.

**Persiste en:** propuesta de adición a `risk_matrices.peligros` JSONB. NO se aplica automáticamente: el consultor decide qué incorporar.

### Variables

| Variable | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `{{ciiu_codigo}}` | string | sí | Código CIIU Rev. 4 (4 dígitos). |
| `{{ciiu_descripcion}}` | string | sí | Descripción oficial del CIIU. |
| `{{empresa_descripcion}}` | string | sí | Descripción libre de procesos/operaciones de la empresa (1–3 párrafos). |
| `{{centro_descripcion}}` | string | no | Descripción del centro específico (si la valoración es por centro). |
| `{{peligros_existentes}}` | json | sí | Array de peligros ya identificados en la matriz vigente (formato `{categoria, nombre}`). El modelo debe **excluir** duplicados. |
| `{{n_max_sugerencias}}` | int | no (default `15`) | Tope de peligros a sugerir. |

### Texto del prompt

```text
Eres un especialista en SG-SST que aplica la Guía Técnica Colombiana GTC-45/2012 (ICONTEC) para identificación de peligros y valoración de riesgos. Recibes el CIIU de una empresa, su descripción operacional y la lista de peligros ya identificados. Tu tarea: SUGERIR peligros adicionales típicos no contemplados todavía, citando la fuente normativa o técnica.

CONTEXTO METODOLÓGICO:
- GTC-45 define 8 categorías: "fisico", "quimico", "biologico", "ergonomico", "psicosocial", "mecanico", "electrico", "locativo".
- Distingue PELIGRO (fuente con potencial de daño, ej: "ruido continuo >85 dB") de RIESGO (probabilidad × consecuencia). Tú sugieres PELIGROS, no riesgos valorados.
- Para cada peligro sugerido debes proponer controles ordenados por jerarquía GTC-45: eliminación → sustitución → controles ingenieriles → controles administrativos → EPP.
- Fuentes adicionales aceptadas: GATISO (Mintrabajo), manuales ARL Sura/Positiva/Bolívar/Colmena, Resolución 2400/1979.

REGLAS:
1. NO repitas peligros ya presentes en `peligros_existentes` (compara por (categoria, nombre) con normalización a minúsculas).
2. Cada peligro sugerido DEBE incluir `reference` con la fuente normativa o técnica (ej: "GTC-45/2012 Anexo A, ítem físico - ruido"; "Resolución 2400/1979 Art. 88").
3. Si la descripción de la empresa es ambigua y no permite afirmar la presencia del peligro, devuelve menos sugerencias antes que inventar.
4. NO inventes referencias normativas. Si no estás seguro de una fuente exacta, usa "GTC-45/2012 (categoría general)" y baja la confianza.
5. Como máximo {{n_max_sugerencias}} sugerencias.

ENTRADA:
ciiu_codigo: {{ciiu_codigo}}
ciiu_descripcion: {{ciiu_descripcion}}
empresa_descripcion:
"""
{{empresa_descripcion}}
"""
centro_descripcion: {{centro_descripcion}}
peligros_existentes (JSON):
{{peligros_existentes}}

Devuelve EXCLUSIVAMENTE el JSON del schema. Sin texto adicional.
```

### Output schema (Zod-compatible)

```ts
import { z } from "zod";

const HazardCategory = z.enum([
  "fisico",
  "quimico",
  "biologico",
  "ergonomico",
  "psicosocial",
  "mecanico",
  "electrico",
  "locativo",
]);

export const EnrichedHazard = z.object({
  category: HazardCategory,
  name: z.string().min(3).max(140),
  source: z.string().nullable(), // qué genera el peligro (ej: "máquinas rotativas")
  possible_effects: z.array(z.string()).min(1),
  suggested_controls: z.array(
    z.object({
      level: z.enum([
        "eliminacion",
        "sustitucion",
        "ingenieril",
        "administrativo",
        "epp",
      ]),
      description: z.string(),
    }),
  ).min(1),
  reference: z.string(), // OBLIGATORIO; ej "GTC-45/2012 Anexo A"
  rationale: z.string(), // 1-2 frases explicando por qué se sugiere para este CIIU/empresa
  confidence: z.number().min(0).max(1),
});

export const EnrichRiskMatrixOutput = z.object({
  ciiu_codigo: z.string(),
  suggestions: z.array(EnrichedHazard),
  excluded_because_already_present: z.array(
    z.object({
      category: HazardCategory,
      name: z.string(),
    }),
  ).default([]),
  notes: z.string().nullable(),
});

export type EnrichRiskMatrixOutput = z.infer<typeof EnrichRiskMatrixOutput>;
```

### Manejo de baja confianza
- Sugerencias con `confidence < 0.60` se filtran automáticamente del output mostrado al consultor (pero se preservan en `ai_outputs_pending_review` para análisis).
- Si más del 50 % de sugerencias quedan filtradas, se marca el run con `requires_review` para que un consultor revise el prompt.

### Anti-alucinación específica
- `reference` no puede ser `null` ni cadena vacía. Si lo está → schema rechaza el peligro completo.
- El módulo Node valida que `reference` contenga una de las fuentes aceptadas (`GTC-45`, `Resolución`, `Decreto`, `GATISO`, manual ARL conocido). Si no, marca `confidence` *= 0.5 antes de aplicar el filtro.
- `suggested_controls` debe incluir al menos un nivel distinto de "epp" (la GTC-45 desaconseja basar el control únicamente en EPP).

---

## 3) `generate_acta_from_topics`

**Propósito:** Dado integrantes asistentes, orden del día y puntos tratados, genera un acta formal completa de comité (COPASST, Convivencia, Brigada). Tono formal SG-SST colombiano. Extrae compromisos como entidades estructuradas.

**Routing recomendado:** complejidad `media` → Claude Sonnet (calidad de redacción > velocidad). Groq Llama acepta como fallback.

**Persiste en:** `meeting_actas.contenido_md` y, separadamente, `compromisos[]` por cada compromiso identificado.

### Variables

| Variable | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `{{committee_type}}` | enum | sí | `"copasst" | "convivencia" | "brigada" | "vigia_sst"` |
| `{{committee_name}}` | string | sí | Nombre formal del comité (ej: "COPASST Empresa X — Centro Bogotá"). |
| `{{fecha}}` | date `YYYY-MM-DD` | sí | Fecha de la reunión. |
| `{{hora_inicio}}` | string `HH:MM` | sí | — |
| `{{hora_fin}}` | string `HH:MM` | no | — |
| `{{lugar}}` | string | sí | Ubicación o medio (presencial/virtual). |
| `{{integrantes_asistentes}}` | json | sí | Array de `{nombres, apellidos, rol, representacion}`. |
| `{{integrantes_ausentes}}` | json | no | Array idéntico para los ausentes con justificación. |
| `{{orden_del_dia}}` | string[] | sí | Lista de puntos del orden del día. |
| `{{puntos_tratados}}` | json | sí | Array de `{punto, descripcion_libre}` con lo discutido en cada punto. |

### Texto del prompt

```text
Eres un asistente que redacta actas formales de comités SG-SST en Colombia (COPASST, Comité de Convivencia, Brigada de Emergencias, Vigía SST). Recibes la información de la reunión y tu tarea es generar:
(a) un documento de acta en Markdown formal, y
(b) la lista estructurada de compromisos derivados.

CONTEXTO LEGAL:
- COPASST: Resolución 2013/1986 Art. 11 (actas obligatorias mensuales).
- Comité de Convivencia: Resolución 1356/2012 (actas trimestrales).
- Brigada: Decreto 1072/2015 Art. 2.2.4.6.25.
- Tono formal, lenguaje técnico SG-SST colombiano. Evita anglicismos.

ESTRUCTURA OBLIGATORIA DEL ACTA (Markdown):
1. Encabezado con: nombre del comité, número de acta (`{{numero_secuencial}}` lo asignará el sistema; deja "{{numero_acta}}" como placeholder), fecha, hora inicio y fin, lugar.
2. Lista de asistentes (con representación: empleador / trabajadores) y ausentes con justificación.
3. Verificación de quórum (mínimo 50% +1 para COPASST; reglas específicas por tipo).
4. Aprobación del orden del día.
5. Desarrollo por punto del orden del día (subtítulos por punto).
6. Compromisos: tabla con responsable, descripción, fecha objetivo.
7. Cierre con hora y firmas (deja líneas para firmas).

REGLAS:
1. NO inventes asistentes ni temas no declarados.
2. NO inventes compromisos: solo extrae los que aparezcan literalmente en `puntos_tratados`. Si un punto no genera compromiso, no fuerces uno.
3. Cuando un punto sea ambiguo respecto a responsable o fecha del compromiso, usa `null` y anótalo en `notes`.
4. Verificación de quórum: calcula presentes / total y declara si se cumple según tipo de comité (COPASST mínimo 50%+1 de los principales).

ENTRADA:
committee_type: {{committee_type}}
committee_name: {{committee_name}}
fecha: {{fecha}}
hora_inicio: {{hora_inicio}}
hora_fin: {{hora_fin}}
lugar: {{lugar}}
integrantes_asistentes (JSON): {{integrantes_asistentes}}
integrantes_ausentes (JSON): {{integrantes_ausentes}}
orden_del_dia: {{orden_del_dia}}
puntos_tratados (JSON): {{puntos_tratados}}

Devuelve EXCLUSIVAMENTE el JSON descrito en el schema. El campo `acta_markdown` contiene el documento completo en Markdown.
```

### Output schema (Zod-compatible)

```ts
import { z } from "zod";

const CommitteeType = z.enum(["copasst", "convivencia", "brigada", "vigia_sst"]);

export const ActaCompromiso = z.object({
  descripcion: z.string().min(5),
  responsable_nombre: z.string().nullable(),
  responsable_documento: z.string().nullable(),
  fecha_objetivo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  punto_origen: z.string(), // referencia al punto del orden del día
  notes: z.string().nullable(),
});

export const GenerateActaOutput = z.object({
  committee_type: CommitteeType,
  acta_markdown: z.string().min(200),
  quorum: z.object({
    presentes: z.number().int().nonnegative(),
    total: z.number().int().positive(),
    porcentaje: z.number().min(0).max(1),
    cumple: z.boolean(),
    regla_aplicada: z.string(), // ej "COPASST: 50%+1 de principales"
  }),
  compromisos: z.array(ActaCompromiso),
  warnings: z.array(z.string()).default([]),
  overall_confidence: z.number().min(0).max(1),
});

export type GenerateActaOutput = z.infer<typeof GenerateActaOutput>;
```

### Manejo de baja confianza
- Si `quorum.cumple == false` → el acta se genera pero el módulo notifica al organizador que la sesión no es deliberante; el acta queda en estado `borrador_sin_quorum`.
- Si algún compromiso queda con `responsable_nombre == null` y `fecha_objetivo == null`, se anexa al acta con marca `[REQUIERE COMPLEMENTAR]` y entra en `compromisos` con status `incompleto` (no se notifica recordatorio hasta que se complete).

### Anti-alucinación específica
- El acta_markdown NO debe contener nombres no presentes en `integrantes_asistentes` o `integrantes_ausentes`. Validación post-hoc del módulo Node: tokeniza nombres del markdown y verifica subset.
- Compromisos sin `punto_origen` válido (que no exista en `orden_del_dia`) son rechazados.
- Si el modelo escribe "se acordó..." sin existir respaldo en `puntos_tratados`, baja `overall_confidence` y agrega warning.

---

## 4) `structure_emergency_plan_from_audio`

**Propósito:** Dado el audio transcrito de una visita presencial al centro de trabajo, estructura un Plan de Emergencias preliminar con amenazas identificadas, brigadistas mencionados, recursos disponibles y vulnerabilidades. Marca como `requires_consultor_input` los elementos críticos no cubiertos por la transcripción.

**Routing recomendado:** complejidad `alta` → Claude Sonnet (síntesis estructurada de input largo). NO usar Groq por latencia/costo de outputs largos.

**Persiste en:** `emergency_plans` [ERD] como `version='preliminar'` con `contenido_md`, `brigadas`, y campos JSONB. El consultor debe revisarlo antes de marcarlo `version='aprobado'`.

### Variables

| Variable | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `{{transcript}}` | string | sí | Transcripción completa del audio (puede ser larga; se trunca en cliente si excede contexto). |
| `{{centro_nombre}}` | string | sí | Nombre del centro de trabajo. |
| `{{centro_direccion}}` | string | no | — |
| `{{ciiu_centro}}` | string | no | CIIU del centro (alimenta sugerencia de amenazas típicas). |
| `{{ciudad}}` | string | no | Determina algunas amenazas naturales (sismicidad, inundación). |
| `{{n_trabajadores}}` | int | no | — |
| `{{peligros_conocidos}}` | json | no | Array de peligros ya identificados (de la matriz IPER) para correlacionar amenazas. |

### Texto del prompt

```text
Eres un especialista en gestión del riesgo de desastres aplicada al SG-SST en Colombia. Recibes la transcripción de una visita presencial a un centro de trabajo y tu tarea es estructurar un Plan de Emergencias preliminar conforme a Decreto 1072/2015 Art. 2.2.4.6.25 y Resolución 0312/2019 Estándar 5.1.1.

ELEMENTOS A IDENTIFICAR:
1. Amenazas (naturales, antrópicas no intencionales, antrópicas intencionales, tecnológicas).
2. Vulnerabilidades por amenaza (físicas, organizacionales, humanas).
3. Brigadistas mencionados (nombre, rol, certificación si se menciona).
4. Recursos disponibles (extintores, botiquines, camillas, equipos de comunicación, rutas señalizadas, puntos de encuentro).
5. Procedimientos mencionados (evacuación, primeros auxilios, atención de incendios).
6. Capacitación reportada (simulacros, fechas, asistencia).
7. Brechas detectadas (lo que el visitador notó como faltante o deficiente).

REGLAS CRÍTICAS:
1. La transcripción puede ser incompleta o coloquial. Si un elemento crítico (rutas de evacuación, número de extintores, brigadistas mínimos para el tamaño del centro) NO se menciona, NO lo inventes. Marca el elemento en `requires_consultor_input` con justificación.
2. NO transcribas literalmente la conversación al plan. Extrae y estructura.
3. Para cada amenaza/recurso/brigadista, incluye `citation.transcript_excerpt` con la frase literal que respalda. Si el plan menciona algo sin respaldo en la transcripción, baja la confianza global.
4. Brigadistas: solo lista los que se mencionen explícitamente. NO infiera por nombre genérico.
5. Para Colombia, si no se menciona, asume que sismicidad y vendaval son amenazas a evaluar siempre (pero márcalas en `requires_consultor_input` para validación local).
6. Si la transcripción menciona menos de 1 brigadista o ningún recurso de extinción → eleva `requires_consultor_input` con prioridad "critica".

ENTRADA:
centro_nombre: {{centro_nombre}}
centro_direccion: {{centro_direccion}}
ciiu_centro: {{ciiu_centro}}
ciudad: {{ciudad}}
n_trabajadores: {{n_trabajadores}}
peligros_conocidos (JSON): {{peligros_conocidos}}

TRANSCRIPT:
"""
{{transcript}}
"""

Devuelve EXCLUSIVAMENTE el JSON descrito en el schema. El campo `plan_markdown` contiene el plan completo en Markdown estructurado.
```

### Output schema (Zod-compatible)

```ts
import { z } from "zod";

const ThreatType = z.enum([
  "natural",
  "antropica_no_intencional",
  "antropica_intencional",
  "tecnologica",
]);

const Citation = z.object({
  transcript_excerpt: z.string(),
  approximate_timestamp: z.string().nullable(), // si la transcripción tiene timestamps
});

export const Threat = z.object({
  type: ThreatType,
  name: z.string(),
  description: z.string(),
  vulnerabilities: z.array(z.object({
    kind: z.enum(["fisica", "organizacional", "humana"]),
    description: z.string(),
  })),
  citation: Citation.nullable(),
  confidence: z.number().min(0).max(1),
});

export const Brigadier = z.object({
  full_name: z.string(),
  role: z.enum(["coordinador", "primeros_auxilios", "evacuacion", "control_incendios", "otro"]),
  certifications_mentioned: z.array(z.string()).default([]),
  citation: Citation,
  confidence: z.number().min(0).max(1),
});

export const Resource = z.object({
  type: z.enum([
    "extintor",
    "botiquin",
    "camilla",
    "alarma",
    "señalizacion",
    "ruta_evacuacion",
    "punto_encuentro",
    "comunicacion",
    "otro",
  ]),
  description: z.string(),
  quantity: z.number().int().nullable(),
  state: z.enum(["bueno", "regular", "deficiente", "no_evaluado"]).default("no_evaluado"),
  citation: Citation.nullable(),
  confidence: z.number().min(0).max(1),
});

export const RequiresConsultorInput = z.object({
  topic: z.string(),
  reason: z.string(),
  priority: z.enum(["baja", "media", "alta", "critica"]),
});

export const StructureEmergencyPlanOutput = z.object({
  centro_nombre: z.string(),
  plan_markdown: z.string().min(300),
  threats: z.array(Threat),
  brigadiers: z.array(Brigadier),
  resources: z.array(Resource),
  procedures_mentioned: z.array(z.object({
    name: z.string(),
    summary: z.string(),
    citation: Citation,
  })).default([]),
  drills_mentioned: z.array(z.object({
    type: z.string(),
    date_or_period: z.string().nullable(),
    citation: Citation,
  })).default([]),
  gaps_detected: z.array(z.string()).default([]),
  requires_consultor_input: z.array(RequiresConsultorInput),
  overall_confidence: z.number().min(0).max(1),
  notes: z.string().nullable(),
});

export type StructureEmergencyPlanOutput = z.infer<typeof StructureEmergencyPlanOutput>;
```

### Manejo de baja confianza
- El plan SIEMPRE se marca `version='preliminar'` independiente de la confianza. La aprobación a `version='aprobado'` requiere acción explícita del consultor.
- Si `requires_consultor_input` contiene cualquier ítem con `priority='critica'`, el módulo bloquea el cierre del plan hasta que ese ítem sea atendido.
- Si `overall_confidence < 0.50` → el plan no se persiste como Markdown; en su lugar, se devuelve al usuario un mensaje "La transcripción es insuficiente para estructurar el plan; complemente con visita adicional o información del consultor".

### Anti-alucinación específica
- Cualquier brigadista, recurso o amenaza listado sin `citation.transcript_excerpt` (o cuyo excerpt no se encuentre como substring de `transcript`) es descartado por el módulo Node antes de persistir.
- Las amenazas "sismicidad" y "vendaval" añadidas por defecto para Colombia llevan `citation: null` y `confidence <= 0.40`; aparecen automáticamente en `requires_consultor_input`.
- El campo `quantity` para extintores/botiquines NO se infiere por proporción al `n_trabajadores`. Si la transcripción no lo menciona, queda `null`.

---

## Tabla resumen de prompts

| ID | Variables clave | Output principal | Routing | Anti-alucinación crítica |
|---|---|---|---|---|
| `extract_medical_exam_pdf` | `pdf_text`, `worker_hint_document_number` | `medical_exams` | media → Claude Sonnet | `numero_documento` regex; citations por campo; null si no se halla. |
| `enrich_risk_matrix_from_ciiu` | `ciiu_codigo`, `empresa_descripcion`, `peligros_existentes` | sugerencias de `risk_matrices.peligros` | media-alta → Claude Sonnet | `reference` obligatorio (GTC-45/Decreto/Resolución/manual ARL). |
| `generate_acta_from_topics` | `committee_type`, `puntos_tratados`, `integrantes_asistentes` | `meeting_actas` + `compromisos[]` | media → Claude Sonnet | Solo nombres declarados; compromisos solo desde `puntos_tratados`. |
| `structure_emergency_plan_from_audio` | `transcript`, `centro_nombre`, `ciudad` | `emergency_plans` v=preliminar | alta → Claude Sonnet | citations por amenaza/brigadista/recurso; `requires_consultor_input`. |

---

## Versionado de prompts

Cada prompt en este archivo se considera **versión 1.0**. Cambios futuros incrementan la versión menor (1.1, 1.2…) y deben:
1. Documentarse en `docs/prompts/CHANGELOG.md` (a crear cuando exista el primer cambio).
2. Persistir el `prompt_version` en `ai_usage.metadata` para reconstruir comportamiento histórico.
3. Pasar QA estricto (este archivo es nivel QA estricto por impacto en módulos IA).

---

## Cumplimiento de Reglas Inquebrantables (R1–R7) para esta tarea

- **R1:** este documento es parte de la tarea consolidada T-F0-030/031/032/039doc; única tarea en progreso bajo Operador-Agent.
- **R2:** sin dependencias bloqueantes (Issue #17 declara ninguna).
- **R3:** este archivo no se autoaprueba; espera veredicto QA-Agent (nivel estricto).
- **R5:** no se modifican specs ni ADRs; este archivo es nuevo entregable.
- **R7:** decisiones técnicas no especificadas (ej.: umbral 0.85/0.60, jerarquía de controles GTC-45, política de versionado) están documentadas explícitamente arriba.

---

**Última actualización:** 2026-04-28 — versión inicial T-F0-031.
