import Anthropic from '@anthropic-ai/sdk'

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
1. Transforma las notas informales en lenguaje corporativo, técnico, legal y profesional apropiado para Colombia (Resolución 2013 de 1986 o Resolución 652 de 2012 según aplique).
2. Estructura el acta estrictamente con los siguientes encabezados en Markdown:
   - **Encabezado** (Nombre del comité, Acta No. X, Fecha, Empresa).
   - **Objetivo de la reunión**.
   - **Orden del Día**.
   - **Desarrollo de la Reunión** (Aquí expandes las notas informales con lenguaje técnico).
   - **Compromisos y Tareas** (Extrae las tareas mencionadas, asigna responsables lógicos basados en los asistentes si es posible).
   - **Cierre y Firmas** (Espacio para firmas).

Devuelve ÚNICAMENTE el texto redactado en formato Markdown. No agregues saludos previos ni comentarios posteriores.`

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
    
    throw new Error('Fallo al generar el texto del acta.')
  }
}
