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

Basado en estos hallazgos, redacta el "DOCUMENTO DE PREPARACIÓN Y RESPUESTA ANTE EMERGENCIAS (Decreto 1072 de 2015)".
NO inventes un formato nuevo. Utiliza ESTRICTAMENTE la siguiente plantilla Markdown, rellenando los campos entre corchetes [ ] con la información proporcionada o inferida lógicamente, y expandiendo con vocabulario técnico en SST:

# DOCUMENTO DE PREPARACIÓN Y RESPUESTA ANTE EMERGENCIAS
**Empresa:** ${empresa}
**CIIU:** ${ciiu}
**Fecha de Emisión:** [Generar Fecha de Hoy]
**Marco Legal:** Decreto 1072 de 2015, Libro 2, Parte 2, Título 4, Capítulo 6, Artículo 2.2.4.6.25.

## 1. JUSTIFICACIÓN Y ALCANCE
El presente documento establece las acciones preventivas y correctivas inmediatas identificadas tras la inspección técnica en las instalaciones, con el fin de proteger a los trabajadores, contratistas y visitantes de la empresa **${empresa}**, de acuerdo a su actividad económica (${ciiu}).

## 2. ANÁLISIS DE VULNERABILIDAD Y HALLAZGOS CRÍTICOS
[Enumera en viñetas los hallazgos críticos extraídos de la nota de voz. Usa lenguaje técnico de seguridad industrial. Ejemplo: En lugar de "cables sueltos", usa "Riesgo eléctrico por exposición de cableado sin canalización"].

## 3. PLAN DE ACCIÓN Y PROCEDIMIENTOS OPERATIVOS NORMALIZADOS (PON) INMEDIATOS
| Nivel de Prioridad | Hallazgo/Amenaza | Acción Correctiva Inmediata requerida |
| :--- | :--- | :--- |
| [Alta/Media/Baja] | [Hallazgo 1] | [Solución técnica a implementar] |

## 4. RECOMENDACIONES NORMATIVAS ADICIONALES (ESPECÍFICAS AL CIIU)
[Con base en el sector económico de la empresa (${ciiu}), enumera 3 recomendaciones típicas y obligatorias para prevención de desastres y emergencias (ej. Brigadas, Extintores, Rutas de evacuación)].

## 5. ALERTA DE RIESGO LEGAL
El incumplimiento en la corrección de los hallazgos descritos constituye una vulneración al Artículo 2.2.4.6.25 del Decreto 1072 de 2015 y puede acarrear sanciones administrativas por parte del Ministerio de Trabajo y la Unidad de Gestión Pensional y Parafiscales (UGPP).

Devuelve ÚNICAMENTE la plantilla completada en formato Markdown. No agregues introducciones, saludos ni comentarios fuera de la plantilla.`

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
