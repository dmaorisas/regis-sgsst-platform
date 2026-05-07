import Anthropic from '@anthropic-ai/sdk'
import { GroqFallbackClient } from './groq-client'

export class ActaGenerator {
  private anthropic: Anthropic

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }

  async generateActa(
    tipoComite: 'COPASST' | 'Convivencia',
    empresa: string,
    fecha: string,
    asistentes: string,
    notasBreves: string
  ) {
    const prompt = `Actúa como el Secretario Técnico experto del ${tipoComite === 'COPASST' ? 'Comité Paritario de Seguridad y Salud en el Trabajo (COPASST)' : 'Comité de Convivencia Laboral'} de la empresa ${empresa}.

Tu tarea es redactar el ACTA OFICIAL de la reunión celebrada el ${fecha}.

INFORMACIÓN PROVISTA (Notas informales):
- Asistentes: ${asistentes}
- Notas de la reunión: ${notasBreves}

INSTRUCCIONES:
1. Transforma las notas informales en lenguaje corporativo, técnico, legal y profesional apropiado para Colombia (Resolución 2013 de 1986 para COPASST o Resolución 652 de 2012 para Convivencia).
2. NO inventes un formato nuevo. Utiliza ESTRICTAMENTE la siguiente plantilla Markdown, rellenando los campos entre corchetes [ ] con la información proporcionada o inferida lógicamente:

# ACTA DE REUNIÓN DEL ${tipoComite === 'COPASST' ? 'COMITÉ PARITARIO DE SEGURIDAD Y SALUD EN EL TRABAJO (COPASST)' : 'COMITÉ DE CONVIVENCIA LABORAL'}
**Empresa:** ${empresa}
**Acta No:** [Asigna un número consecutivo aleatorio, ej: 04-2024]
**Fecha:** ${fecha}
**Lugar:** Modalidad Presencial/Virtual - Instalaciones de la Empresa

## 1. ASISTENTES
[Enumera los asistentes provistos: ${asistentes}. Si aplica, indica su rol inferido].

## 2. ORDEN DEL DÍA
1. Verificación de asistencia y quórum.
2. Lectura y aprobación del acta anterior.
3. Desarrollo de temas programados.
4. Proposiciones y varios.
5. Definición de compromisos.

## 3. DESARROLLO DE LA REUNIÓN
**3.1 Verificación del quórum:** Se verificó la asistencia, contando con el quórum reglamentario exigido por la normativa vigente para sesionar de forma válida.
**3.2 Lectura del acta anterior:** Se sometió a lectura y aprobación el acta de la reunión anterior, siendo aprobada por unanimidad de los presentes.
**3.3 Temas tratados y análisis:**
[Aquí debes expandir las notas informales proporcionadas de forma profesional, detallada y técnica. Separa en viñetas o subpuntos los hallazgos principales].

## 4. COMPROMISOS Y TAREAS (PLAN DE ACCIÓN)
| Actividad / Compromiso a ejecutar | Responsable Asignado | Fecha de Cumplimiento |
| :--- | :--- | :--- |
| [Acción concreta extraída de las notas] | [Nombre del asistente asignado] | [Fecha próxima lógica] |

## 5. CIERRE
Agotado el orden del día y sin más temas por tratar, el presidente del comité da por terminada la sesión.

**FIRMAS DE CONSTANCIA:**
[Genera líneas para firma de cada uno de los asistentes mencionados]

Devuelve ÚNICAMENTE la plantilla completada en formato Markdown. No agregues introducciones, saludos ni comentarios fuera del documento.`

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 3000,
        system: 'Eres un redactor experto en actas legales corporativas. Respondes exclusivamente con el texto del acta en formato Markdown.',
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
        console.warn('Fallback a Groq para ActaGenerator')
        const groq = new GroqFallbackClient()
        return await groq.generateText('Eres un redactor experto en actas legales corporativas. Respondes exclusivamente con el texto del acta en formato Markdown.', prompt)
      }
      throw e
    }
    
    throw new Error('Fallo al generar el texto del acta.')
  }
}
