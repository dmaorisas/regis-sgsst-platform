import { ClaudeClient } from '@/lib/ai/claude-client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type Anthropic from '@anthropic-ai/sdk'
// pdf-parse is imported dynamically in the catch block to avoid build-time issues

import { GroqFallbackClient } from './groq-client'

export type RecommendationType = 'recomendacion' | 'restriccion' | 'reubicacion'

export interface ExtractedRecommendation {
  text: string
  type: RecommendationType
  duration_days: number | null
}

export interface MedicalExtractionResult {
  recommendations: ExtractedRecommendation[]
}

export class MedicalExtractor {
  constructor(private readonly claude: ClaudeClient) {}

  static create(supabaseAdmin: SupabaseClient): MedicalExtractor {
    const claude = new ClaudeClient(supabaseAdmin)
    return new MedicalExtractor(claude)
  }

  /**
   * Extrae recomendaciones médicas de un PDF en formato base64.
   */
  async extractFromPdf(pdfBase64: string): Promise<MedicalExtractionResult> {
    const systemPrompt = `Eres un médico laboral experto trabajando para Regis Colombia (SGSST).
Tu tarea es leer exámenes médicos ocupacionales y extraer TODAS las recomendaciones médicas, restricciones laborales o solicitudes de reubicación.
Ignora los resultados de laboratorio normales o anotaciones no relacionadas con restricciones o recomendaciones ocupacionales.

DEBES responder ÚNICAMENTE con un JSON válido con la siguiente estructura exacta:
{
  "recommendations": [
    {
      "text": "Evitar levantamiento de cargas mayores a 10kg",
      "type": "restriccion", // opciones: 'recomendacion', 'restriccion', 'reubicacion'
      "duration_days": 30 // Usa null si es permanente o no se especifica
    }
  ]
}

Si no hay recomendaciones ni restricciones, devuelve: {"recommendations": []}
`

    let response: { content: { type: string; text?: string }[] }

    try {
      response = await this.claude.invoke({
        agent_id: 'medical_extractor_agent',
        module: 'medical_exams',
        complexity_level: 'complex', // Utilizamos complex para asegurar la precisión del análisis de PDFs médicos
        system: systemPrompt,
        // Le pedimos a la API que devuelva JSON
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: pdfBase64,
                },
              },
              {
                type: 'text',
                text: 'Extrae las recomendaciones de este examen médico ocupacional y devuelve el JSON.',
              },
            ],
          },
        ] as Anthropic.MessageParam[],
      })
    } catch (e: unknown) {
      const err = e as { message?: string; status?: number }
      if (
        err?.message?.includes('balance is too low') ||
        err?.status === 402 ||
        err?.status === 403 ||
        err?.status === 400 ||
        String(err).includes('balance')
      ) {
        console.warn(
          'Anthropic API falló por saldo/créditos. Intentando fallback con Groq Llama 3...',
        )

        // 1. Extraer texto del PDF localmente
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse')
        const pdfBuffer = Buffer.from(pdfBase64, 'base64')
        const parsedPdf = await pdfParse(pdfBuffer)
        const textContent = parsedPdf.text

        // 2. Usar Groq para extraer el JSON
        const groq = new GroqFallbackClient()
        const groqResponse = await groq.generateText(
          systemPrompt,
          `Texto extraído del PDF médico:\n\n${textContent}\n\nExtrae las recomendaciones y devuelve estrictamente el JSON solicitado.`,
        )

        try {
          const jsonMatch = groqResponse.match(/\{[\s\S]*\}/)
          const jsonString = jsonMatch ? jsonMatch[0] : groqResponse
          const parsed = JSON.parse(jsonString) as MedicalExtractionResult
          return {
            recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
          }
        } catch (fallbackErr) {
          throw new Error(
            `Error parseando JSON de Groq (Fallback): ${groqResponse.slice(0, 100)}. Err: ${fallbackErr}`,
          )
        }
      }
      throw e // Relanzar si es otro error
    }

    const textContent = response.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('Claude no devolvió contenido de texto')
    }

    const text = textContent.text || ''
    try {
      // Intentar parsear el JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      const jsonString = jsonMatch ? jsonMatch[0] : text
      const parsed = JSON.parse(jsonString) as MedicalExtractionResult

      // Sanitizar el resultado
      return {
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      }
    } catch (error) {
      throw new Error(
        `Error parseando el JSON de Claude: ${text.slice(0, 200)}... Detalles: ${error}`,
      )
    }
  }
}
