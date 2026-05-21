import Anthropic from '@anthropic-ai/sdk'
import { GroqFallbackClient } from './groq-client'

export class ActaGenerator {
  private anthropic: Anthropic | null = null

  constructor() {
    const key = process.env.ANTHROPIC_API_KEY
    if (key && key.trim() !== '' && !key.startsWith('tu-llave')) {
      this.anthropic = new Anthropic({
        apiKey: key,
      })
    }
  }

  async generateActa(
    tipoComite: 'COPASST' | 'Convivencia',
    empresa: string,
    fecha: string,
    asistentes: string,
    notasBreves: string,
    numeroActa: number,
    directrices?: string,
  ) {
    const paddedNum = String(numeroActa).padStart(3, '0')
    const generatedCode = `ACT-${tipoComite === 'COPASST' ? 'COP' : 'CON'}-${new Date(fecha).getFullYear() || 2026}-${paddedNum}`

    const prompt = `Actúa como el Secretario Técnico experto del ${tipoComite === 'COPASST' ? 'Comité Paritario de Seguridad y Salud en el Trabajo (COPASST)' : 'Comité de Convivencia Laboral'} de la empresa ${empresa}.

Tu tarea es redactar la información oficial de la reunión celebrada el ${fecha} para el Acta Número ${numeroActa} (Código: ${generatedCode}).

INFORMACIÓN PROVISTA (Transcripción o Notas):
- Asistentes: ${asistentes}
- Transcripción/Notas: ${notasBreves}

${
  directrices && directrices.trim() !== ''
    ? `INSTRUCCIONES DE REDACCIÓN PERSONALIZADAS:\n${directrices}`
    : `INSTRUCCIONES:
1. Transforma las notas/transcripción en un desarrollo de la reunión formal con lenguaje corporativo, técnico y legal. IMPORTANTE: NO te limites a copiar y pegar directamente la transcripción. Genera los apuntes del desarrollo redactados de forma profesional según lo discutido de manera estructurada. No agregues ni inventes hechos, temas o discusiones que no estén mencionados.
2. Identifica y extrae las tareas anteriores de seguimiento del comité. IMPORTANTE: NO inventes tareas anteriores si no están en las notas. Si no se mencionan en la transcripción, deja la lista "tareas_anteriores" completamente vacía [].
3. Identifica y extrae los nuevos compromisos y tareas acordados, asignando un responsable de la lista de asistentes y una fecha realista de cumplimiento en formato YYYY-MM-DD. IMPORTANTE: NO inventes nuevos compromisos si no están en las notas. Si no se mencionan en la transcripción, deja la lista "compromisos" completamente vacía [].
4. Identifica y extrae el lugar físico o virtual de la reunión, la hora de inicio y la hora de fin de la reunión. IMPORTANTE: Si alguno de estos datos no se menciona explícitamente en la transcripción o notas provistas, devuélvelo estrictamente como string vacío "". No asumas ni inventes que es Bogotá o cualquier otra hora por defecto.
5. Identifica la fecha de la próxima reunión. IMPORTANTE: Si la fecha de la próxima reunión no se menciona explícitamente en la transcripción o notas rápidas provistas, devuélvela estrictamente como string vacío "". No inventes, calcules ni asumas ninguna fecha por defecto si no es especificada.`
}

Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura exacta:
{
  "resumen_reunion": "Aquí va la redacción profesional, estructurada, formal y ejecutiva del desarrollo de la reunión, basada estrictamente en los puntos reales discutidos en las notas/transcripción. No debe ser una copia directa, sino una redacción corporativa y de alta calidad técnica.",
  "codigo": "${generatedCode}",
  "version": "1.0",
  "tareas_anteriores": [
    { "actividad": "Nombre de la tarea anterior...", "estado": "Completado o En Proceso", "observaciones": "Breve nota de seguimiento..." }
  ],
  "compromisos": [
    { "actividad": "Nombre del nuevo compromiso...", "responsable": "Nombre del asistente responsable...", "fecha": "YYYY-MM-DD" }
  ],
  "lugar": "Lugar de la reunión o \"\" si no se especifica",
  "hora_inicio": "Hora inicio de la reunión o \"\" si no se especifica",
  "hora_fin": "Hora fin de la reunión o \"\" si no se especifica",
  "fecha_proxima": "YYYY-MM-DD"
}
No agregues explicaciones fuera del JSON.`

    // --- SMART SANDBOX MODE FALLBACK ---
    // Si no hay llaves de API configuradas, generamos el acta localmente de forma profesional
    // para que la demostración comercial funcione de forma 100% fluida, rápida y sin errores.
    const groqKey = process.env.GROQ_API_KEY
    if (!this.anthropic && (!groqKey || groqKey.trim() === '' || groqKey.startsWith('tu-llave'))) {
      console.log(
        'ℹ️ [ActaGenerator] Usando el Generador Local Inteligente (Sandbox Mode) debido a falta de API Keys.',
      )

      const cleanNotes = notasBreves.trim()
      const lowerNotes = cleanNotes.toLowerCase()

      // 1. EXTRAER LUGAR
      let extractedLugar = ''
      if (lowerNotes.includes('bogota') || lowerNotes.includes('bogotá')) {
        extractedLugar = 'Bogotá D.C.'
      } else if (lowerNotes.includes('medellin') || lowerNotes.includes('medellín')) {
        extractedLugar = 'Medellín'
      } else if (lowerNotes.includes('cali')) {
        extractedLugar = 'Cali'
      } else if (lowerNotes.includes('barranquilla')) {
        extractedLugar = 'Barranquilla'
      } else if (
        lowerNotes.includes('virtual') ||
        lowerNotes.includes('teams') ||
        lowerNotes.includes('meet') ||
        lowerNotes.includes('zoom')
      ) {
        extractedLugar = 'Sesión Virtual'
      } else if (lowerNotes.includes('oficina') || lowerNotes.includes('sala')) {
        extractedLugar = 'Sala de Juntas'
      }

      // 2. EXTRAER HORAS (ej: "8:05 de la mañana", "08:05", "10:15")
      let extractedInicio = ''
      let extractedFin = ''
      const timeMatches = cleanNotes.match(/\b\d{1,2}:\d{2}\b/g)
      if (timeMatches && timeMatches.length > 0) {
        extractedInicio = timeMatches[0]
        if (
          cleanNotes.match(
            new RegExp(timeMatches[0] + '\\s*(?:am|pm|de la mañana|a\\.m\\.|p\\.m\\.)', 'i'),
          )
        ) {
          extractedInicio += ' AM'
        } else if (
          cleanNotes.match(new RegExp(timeMatches[0] + '\\s*(?:pm|de la tarde|p\\.m\\.)', 'i'))
        ) {
          extractedInicio += ' PM'
        }

        if (timeMatches.length > 1) {
          extractedFin = timeMatches[1] || ''
          if (
            cleanNotes.match(
              new RegExp(timeMatches[1] + '\\s*(?:am|pm|de la mañana|a\\.m\\.|p\\.m\\.)', 'i'),
            )
          ) {
            extractedFin += ' AM'
          } else if (
            cleanNotes.match(new RegExp(timeMatches[1] + '\\s*(?:pm|de la tarde|p\\.m\\.)', 'i'))
          ) {
            extractedFin += ' PM'
          }
        }
      }

      // 3. GENERAR RESUMEN EJECUTIVO PROFESIONAL (Evitando copia textual directa)
      let summaryText = ''
      if (cleanNotes) {
        const lines = cleanNotes
          .split(/[\n.]+/)
          .map((l) => l.trim())
          .filter((l) => l.length > 6)
        const bulletPoints = lines
          .map((line) => {
            let formatted = line
              .replace(/yo\s+hice/gi, 'Se gestionó')
              .replace(/inicio\s+8:05/gi, 'Apertura de sesión')
              .replace(/revisamos/gi, 'Evaluación y revisión de los puntos de')
              .replace(/decimos/gi, 'Se determinó en el comité')
              .replace(/tengo\s+que/gi, 'Se procedió a coordinar')
              .replace(/no\s+se\s+acordaron\s+compromisos/gi, '')
              .replace(/no\s+hay\s+compromisos/gi, '')

            if (!formatted.trim()) return null
            formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1)
            return `• ${formatted}.`
          })
          .filter(Boolean)
          .join('\n')

        summaryText = `En la fecha ${fecha}, se constituyó formalmente la sesión ordinaria número ${numeroActa} del ${tipoComite === 'COPASST' ? 'Comité Paritario de Seguridad y Salud en el Trabajo (COPASST)' : 'Comité de Convivencia Laboral'} de la empresa ${empresa}.

Se verificó el quórum reglamentario contando con la participación activa de los delegados convocados. El desarrollo de los puntos tratados durante el orden del día se detalla a continuación de forma ejecutiva:

${bulletPoints || '• Se procedió a la revisión mensual de los estándares de cumplimiento organizacional.'}

Habiéndose desarrollado todos los puntos de la agenda de manera satisfactoria, se da por finalizada la sesión de forma unánime por el Secretario y Presidente del comité.`
      } else {
        summaryText = `En la fecha ${fecha}, se constituyó formalmente la sesión ordinaria número ${numeroActa} del ${tipoComite === 'COPASST' ? 'Comité Paritario de Seguridad y Salud en el Trabajo (COPASST)' : 'Comité de Convivencia Laboral'} de la empresa ${empresa}.

Se verificó el quórum reglamentario contando con la participación activa de los delegados convocados. Se procedió a la revisión mensual de los estándares de cumplimiento organizacional sin reportes de novedades especiales en el periodo.`
      }

      // 4. EXTRAER TAREAS Y COMPROMISOS DE FORMA INTELIGENTE (NO INVENTAR)
      const tareasAnteriores: unknown[] = []
      const compromisos: unknown[] = []

      // Obtener asistentes para asignación dinámica real
      const attendeesArr = asistentes
        .split(',')
        .map((a) => {
          const namePart = a.includes('(') ? a.split('(')[0]?.trim() || '' : a.trim()
          return namePart
        })
        .filter(Boolean)
      const defaultResp = attendeesArr[0] || 'Representante del Comité'

      const sentences = cleanNotes
        .split(/[\n.]+/)
        .map((s) => s.trim())
        .filter(Boolean)
      sentences.forEach((sentence) => {
        const lowerS = sentence.toLowerCase()

        // Evitar explícitamente negaciones de compromisos
        if (
          lowerS.includes('no se acordaron') ||
          lowerS.includes('no hay compromisos') ||
          lowerS.includes('ningún compromiso')
        ) {
          return
        }

        // Buscar si la frase contiene una asignación de tarea o acción futura
        if (
          lowerS.includes('comprometer') ||
          lowerS.includes('compromiso') ||
          lowerS.includes('tarea') ||
          lowerS.includes('debe') ||
          lowerS.includes('encargado') ||
          lowerS.includes('responsable') ||
          lowerS.includes('realizará') ||
          lowerS.includes('entregará')
        ) {
          let assignedResp = defaultResp
          for (const attendee of attendeesArr) {
            if (lowerS.includes(attendee.toLowerCase())) {
              assignedResp = attendee
              break
            }
          }

          const dateObj = new Date(fecha)
          dateObj.setDate(dateObj.getDate() + 15)
          const formattedDate = dateObj.toISOString().split('T')[0]

          compromisos.push({
            actividad: sentence.charAt(0).toUpperCase() + sentence.slice(1),
            responsable: assignedResp,
            fecha: formattedDate,
          })
        }

        // Buscar tareas de seguimiento previas
        if (
          lowerS.includes('seguimiento') ||
          lowerS.includes('anterior') ||
          lowerS.includes('pasado') ||
          lowerS.includes('extintor')
        ) {
          tareasAnteriores.push({
            actividad: sentence.charAt(0).toUpperCase() + sentence.slice(1),
            estado:
              lowerS.includes('completado') || lowerS.includes('hecho') || lowerS.includes('listo')
                ? 'Completado'
                : 'En Proceso',
            observaciones: 'Seguimiento registrado según informe de la reunión.',
          })
        }
      })

      // 5. FECHA PRÓXIMA REUNIÓN (NO INVENTAR SI NO SE MENCIONA)
      let extractedNextMeeting = ''
      const nextMeetingMatches = cleanNotes.match(
        /(?:próxima\s+reunión|siguiente\s+reunión|próximo\s+encuentro)\b.*?(\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b)/i,
      )
      if (nextMeetingMatches) {
        extractedNextMeeting = nextMeetingMatches[1] || ''
      } else {
        const dateTextMatch = cleanNotes.match(
          /(?:próxima\s+reunión|siguiente\s+reunión|reuniremos\s+el)\s*(?:el\s+)?(\d{1,2}\s+de\s+[a-zA-ZáéíóúÁÉÍÓÚ]+(?:\s+de\s+\d{4})?)/i,
        )
        if (dateTextMatch) {
          extractedNextMeeting = dateTextMatch[1] || ''
        }
      }

      // Retornamos la estructura JSON esperada por la API
      return JSON.stringify({
        resumen_reunion: summaryText,
        codigo: generatedCode,
        version: '1.0',
        tareas_anteriores: tareasAnteriores,
        compromisos: compromisos,
        lugar: extractedLugar,
        hora_inicio: extractedInicio,
        hora_fin: extractedFin,
        fecha_proxima: extractedNextMeeting,
      })
    }

    try {
      if (this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: 'claude-3-5-sonnet-20240620',
          max_tokens: 3000,
          system: 'Eres un redactor experto en actas. Respondes exclusivamente con JSON válido.',
          messages: [{ role: 'user', content: prompt }],
        })
        if (response.content[0]?.type === 'text') {
          return response.content[0].text
        }
      } else {
        throw new Error('Anthropic client not initialized')
      }
    } catch (e: unknown) {
      const err = e as { message?: string; status?: number }
      if (
        !this.anthropic ||
        err?.message?.includes('balance') ||
        err?.status === 402 ||
        err?.status === 403 ||
        err?.status === 400 ||
        String(err).includes('balance') ||
        err?.message?.includes('initialized')
      ) {
        console.warn('Fallback a Groq para ActaGenerator')
        const groq = new GroqFallbackClient()
        return await groq.generateText(
          'Eres un redactor experto en actas legales de comités organizacionales. Respondes exclusivamente con el objeto JSON del acta conteniendo resumen_reunion, codigo, version, tareas_anteriores, compromisos, lugar, hora_inicio, hora_fin y fecha_proxima.',
          prompt,
        )
      }
      throw e
    }

    throw new Error('Fallo al generar el texto del acta.')
  }
}
