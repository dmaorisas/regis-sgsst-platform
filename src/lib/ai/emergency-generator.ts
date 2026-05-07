import Anthropic from '@anthropic-ai/sdk'
import { GroqFallbackClient } from './groq-client'

export class EmergencyGenerator {
  private anthropic: Anthropic

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }

  async transcribeAudio(audioBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    const groqKey = process.env.GROQ_API_KEY
    if (!groqKey) throw new Error('GROQ_API_KEY no configurada en el servidor.')

    const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType })
    const formData = new FormData()
    formData.append('file', blob, fileName)
    formData.append('model', 'whisper-large-v3-turbo')
    formData.append('language', 'es') // Forzamos español para mejor precisión médica/técnica
    
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
      },
      body: formData
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Error en Whisper Groq: ${errorText}`)
    }

    const data = await response.json()
    return data.text || ''
  }

  async generateEmergencyPlan(
    empresa: string,
    ciiu: string,
    transcript: string
  ) {
    const prompt = `Actúa como un Consultor Experto en Prevención de Desastres y Seguridad y Salud en el Trabajo (SST).

Acabo de realizar una visita técnica a la empresa "${empresa}" (Actividad Económica / CIIU: ${ciiu}). Durante mi visita grabé una nota de voz con los hallazgos.

Aquí está la transcripción de mi nota de voz:
"${transcript}"

Basado en estos hallazgos, redacta un "Plan de Acción de Emergencias (Correcciones Inmediatas)".
Estructura la respuesta estrictamente en Markdown con las siguientes secciones:
1. **Resumen de Hallazgos Críticos** (Lista de lo encontrado en el audio).
2. **Acciones Correctivas Inmediatas** (Qué hacer, nivel de prioridad Alto/Medio/Bajo).
3. **Recomendaciones Normativas Adicionales** (Basado en el CIIU de la empresa, añade un par de recomendaciones típicas de prevención de emergencias para ese sector).
4. **Alerta de Riesgo Legal** (Un breve párrafo sobre por qué no corregir esto puede causar multas ante el Ministerio de Trabajo).

Usa un tono directivo, urgente y altamente profesional. Devuelve ÚNICAMENTE el texto en Markdown.`

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 3000,
        system: 'Eres un redactor experto en planes de emergencia corporativos. Respondes exclusivamente con el texto del plan en formato Markdown.',
        messages: [
          { role: 'user', content: prompt }
        ]
      })

      if (response.content[0]?.type === 'text') {
        return response.content[0].text
      }
    } catch (e: unknown) {
      const err = e as { message?: string; status?: number }
      if (err?.message?.includes('balance') || err?.status === 402 || err?.status === 403 || err?.status === 400 || String(err).includes('balance')) {
        console.warn('Fallback a Groq para EmergencyGenerator')
        const groq = new GroqFallbackClient()
        return await groq.generateText('Eres un redactor experto en planes de emergencia corporativos. Respondes exclusivamente con el texto del plan en formato Markdown.', prompt)
      }
      throw e
    }
    
    throw new Error('Fallo al generar el plan de emergencias.')
  }
}
