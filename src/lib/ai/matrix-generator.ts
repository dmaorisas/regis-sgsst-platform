import Anthropic from '@anthropic-ai/sdk'

export class MatrixGenerator {
  private anthropic: Anthropic

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }

  async generateMatrixForIndustry(companyName: string, industryDescription: string) {
    const prompt = `Actúa como un Consultor Senior en Seguridad y Salud en el Trabajo de Colombia, experto en la norma GTC-45.
    
Necesito que generes una matriz básica de identificación de peligros y valoración de riesgos para la siguiente empresa:
- Nombre: ${companyName}
- Actividad Económica / Código CIIU: ${industryDescription}

REGLAS CRÍTICAS (Mitigación de Riesgos Legales):
1. Solo puedes usar las clasificaciones de peligros oficiales de la GTC-45 (Biológico, Físico, Químico, Psicosocial, Biomecánico, Condiciones de Seguridad, Fenómenos Naturales).
2. Genera entre 5 y 8 peligros críticos y reales que apliquen a esta industria. No inventes cosas irreales.
3. El output DEBE ser un JSON válido que contenga un arreglo llamado "matriz", donde cada objeto tiene esta estructura exacta:
   - "proceso": string
   - "zona": string
   - "actividad": string
   - "peligro_clasificacion": string (debe ser una de las oficiales)
   - "peligro_descripcion": string
   - "efectos_posibles": string
   - "nivel_riesgo_inicial": string (Alto, Medio, o Bajo)
   - "medida_intervencion_sugerida": string

Retorna ÚNICAMENTE el objeto JSON sin markdown, sin texto extra.`

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 4000,
      system: 'Eres una API que solo devuelve JSON válido. No incluyes markdown ni saludos.',
      messages: [
        { role: 'user', content: prompt }
      ]
    })

    try {
      const content = response.content[0]?.type === 'text' ? response.content[0].text : '{}'
      const parsed = JSON.parse(content)
      return parsed.matriz || []
    } catch (e) {
      console.error('Error parsing Claude JSON:', e)
      throw new Error('La IA no devolvió un JSON válido para la matriz.')
    }
  }
}
