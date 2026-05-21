import { createLLMProvider } from './llm-provider'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'

export class MatrixGenerator {
  async generateMatrixForIndustry(companyName: string, industryDescription: string) {
    const systemPrompt =
      'Eres una API que solo devuelve JSON válido. No incluyes markdown ni saludos.'

    const userPrompt = `Actúa como un Consultor Senior en Seguridad y Salud en el Trabajo de Colombia, experto en la norma GTC-45.

Necesito que generes una matriz básica de identificación de peligros y valoración de riesgos para la siguiente empresa:
- Nombre: ${companyName}
- Actividad Económica / Código CIIU: ${industryDescription}

REGLAS CRÍTICAS (Mitigación de Riesgos Legales - Decreto 1072 de 2015):
1. Solo puedes usar las clasificaciones de peligros oficiales de la Guía Técnica Colombiana GTC-45 actualizada (Biológico, Físico, Químico, Psicosocial, Biomecánico, Condiciones de Seguridad, Fenómenos Naturales).
2. Genera entre 5 y 8 peligros críticos y reales que apliquen a esta industria. No inventes cosas irreales.
3. El output DEBE ser un JSON válido que contenga un arreglo llamado "matriz", donde cada objeto tiene esta estructura exacta basada en el anexo de la GTC-45:
   - "proceso": string
   - "zona": string
   - "actividad": string
   - "rutinaria": boolean (true o false)
   - "peligro_clasificacion": string (debe ser una de las 7 clasificaciones oficiales)
   - "peligro_descripcion": string
   - "efectos_posibles": string (ej. Hipoacusia, Estrés laboral, Amputación)
   - "nivel_deficiencia": number (0, 2, 6, 10)
   - "nivel_exposicion": number (1, 2, 3, 4)
   - "nivel_probabilidad": number (Deficiencia * Exposición)
   - "nivel_consecuencia": number (10, 25, 60, 100)
   - "nivel_riesgo_inicial": number (Probabilidad * Consecuencia)
   - "interpretacion_riesgo": string (I, II, III o IV según el nivel de riesgo inicial)
   - "medida_intervencion_sugerida": string (Controles en la fuente, medio o individuo)

Retorna ÚNICAMENTE el objeto JSON sin markdown, sin texto extra.`

    const provider = createLLMProvider(getSupabaseAdminClient())
    const result = await provider.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4000,
      temperature: 0,
      agent_id: 'matrix-gtc45',
      module: 'matrices',
    })

    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/)
      const cleanJson = jsonMatch ? jsonMatch[0] : result.text
      const parsed = JSON.parse(cleanJson)
      return parsed.matriz || []
    } catch (e) {
      console.error('Error parsing AI JSON:', e)
      console.log('Raw response was:', result.text)
      throw new Error('La IA no devolvió un JSON válido para la matriz.')
    }
  }
}
