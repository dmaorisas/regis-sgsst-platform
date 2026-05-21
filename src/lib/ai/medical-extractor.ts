import { createLLMProvider, type LLMProvider } from '@/lib/ai/llm-provider'
import { extractTextFromPdfBase64 } from '@/lib/pdf/extract-text'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createLogger } from '@/lib/logger'

const log = createLogger({ module: 'ai:medical-extractor' })

export type RecommendationType = 'recomendacion' | 'restriccion' | 'reubicacion'

export interface ExtractedRecommendation {
  text: string
  type: RecommendationType
  duration_days: number | null
}

/** All fields extracted from a medical exam, aligned to GTH-F-56 template. */
export interface ExtractedExamFields {
  fecha: string | null
  nombre_trabajador: string | null
  cedula: string | null
  eps: string | null
  cargo: string | null
  edad: number | null
  peso: string | null
  fecha_nacimiento: string | null
  dependencia: string | null
  en_tratamiento_medico: string | null
  sede: string | null
  tipo_vinculacion_laboral: string | null
  nombre_jefe_inmediato: string | null
  diagnostico: string | null
  tipo_tratamiento: string | null
  funciones_cargo: string | null
  recomendaciones_medico_laborales: string | null
  observaciones: string | null
  compromiso_funcionario: string | null
  compromiso_entidad: string | null
}

export interface MedicalExtractionResult {
  fields: ExtractedExamFields
  recommendations: ExtractedRecommendation[]
}

const SYSTEM_PROMPT = `Eres un medico laboral experto trabajando para Regis Colombia (SGSST).
Tu tarea es leer examenes medicos ocupacionales y extraer TODOS los campos necesarios para completar el formato GTH-F-56 "Seguimiento a Recomendaciones Medico Laborales".

INSTRUCCIONES ESTRICTAS:
1. Extrae UNICAMENTE los campos listados abajo del texto proporcionado.
2. Si un campo NO se encuentra en el texto, usa null. NUNCA inventes informacion.
3. Responde SOLO con el JSON, sin explicaciones, sin markdown.
4. Nombres de personas en MAYUSCULAS tal como aparecen.
5. Cedulas: solo digitos, sin puntos ni guiones.
6. Fechas: normalizar a formato YYYY-MM-DD.
7. El campo "diagnostico" debe capturar TODO el texto del diagnostico sin resumir.
8. El campo "tipo_tratamiento" incluye medicamentos, terapias, controles mencionados.
9. El campo "recomendaciones_medico_laborales" captura las recomendaciones del medico para el entorno laboral como texto completo.

DEBES responder UNICAMENTE con un JSON valido con esta estructura exacta:
{
  "fields": {
    "fecha": "fecha del examen YYYY-MM-DD o null",
    "nombre_trabajador": "nombre completo del paciente o null",
    "cedula": "solo digitos o null",
    "eps": "entidad prestadora de salud o null",
    "cargo": "cargo del trabajador o null",
    "edad": 30,
    "peso": "75 kg o null",
    "fecha_nacimiento": "YYYY-MM-DD o null",
    "dependencia": "area o dependencia o null",
    "en_tratamiento_medico": "SI o NO o null",
    "sede": "sede o null",
    "tipo_vinculacion_laboral": "tipo de vinculacion o null",
    "nombre_jefe_inmediato": "nombre del jefe o null",
    "diagnostico": "texto completo del diagnostico o null",
    "tipo_tratamiento": "descripcion del tratamiento o null",
    "funciones_cargo": "funciones del cargo o null",
    "recomendaciones_medico_laborales": "texto completo de recomendaciones laborales o null",
    "observaciones": "observaciones adicionales o null",
    "compromiso_funcionario": "compromisos del trabajador o null",
    "compromiso_entidad": "compromisos de la entidad o null"
  },
  "recommendations": [
    {
      "text": "Evitar levantamiento de cargas mayores a 10kg",
      "type": "restriccion",
      "duration_days": 30
    }
  ]
}

Para "recommendations":
- Valores validos para "type": "recomendacion", "restriccion", "reubicacion"
- Para "duration_days": usa null si es permanente o no se especifica.
- Extrae TODAS las recomendaciones, restricciones y reubicaciones como items individuales.
- Si no hay items, usa un array vacio [].`

export class MedicalExtractor {
  constructor(private readonly llm: LLMProvider) {}

  static create(supabaseAdmin: SupabaseClient): MedicalExtractor {
    const llm = createLLMProvider(supabaseAdmin)
    return new MedicalExtractor(llm)
  }

  async extractFromPdf(pdfBase64: string): Promise<MedicalExtractionResult> {
    log.info({ base64Length: pdfBase64.length }, 'starting PDF extraction')

    const textContent = await extractTextFromPdfBase64(pdfBase64)

    if (!textContent || textContent.trim().length < 20) {
      throw new Error(
        'El PDF no contiene texto extraible. Si es un documento escaneado, intente con una version digital.',
      )
    }

    log.info({ textLength: textContent.length }, 'sending to LLM for analysis')

    const response = await this.llm.chat({
      agent_id: 'medical_extractor_agent',
      module: 'medical_exams',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Texto extraido del examen medico ocupacional:\n\n${textContent}\n\nExtrae todos los campos y recomendaciones. Devuelve estrictamente el JSON solicitado.`,
        },
      ],
      temperature: 0,
    })

    log.info({ provider: response.provider, model: response.model }, 'LLM response received')

    try {
      const jsonMatch = response.text.match(/\{[\s\S]*\}/)
      const jsonString = jsonMatch ? jsonMatch[0] : response.text
      const parsed = JSON.parse(jsonString)

      const emptyFields: ExtractedExamFields = {
        fecha: null,
        nombre_trabajador: null,
        cedula: null,
        eps: null,
        cargo: null,
        edad: null,
        peso: null,
        fecha_nacimiento: null,
        dependencia: null,
        en_tratamiento_medico: null,
        sede: null,
        tipo_vinculacion_laboral: null,
        nombre_jefe_inmediato: null,
        diagnostico: null,
        tipo_tratamiento: null,
        funciones_cargo: null,
        recomendaciones_medico_laborales: null,
        observaciones: null,
        compromiso_funcionario: null,
        compromiso_entidad: null,
      }

      return {
        fields: { ...emptyFields, ...(parsed.fields || {}) },
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      }
    } catch (error) {
      throw new Error(
        `Error parseando JSON de ${response.provider}: ${response.text.slice(0, 200)}. Err: ${error}`,
      )
    }
  }
}
