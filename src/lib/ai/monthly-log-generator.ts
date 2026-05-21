import Anthropic from '@anthropic-ai/sdk'
import { GroqFallbackClient } from './groq-client'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export interface MonthlyLogData {
  completed_summary: string
  pending_summary: string
  next_month_plan: string
}

interface DocumentRow {
  id: string
  status: string
  created_at: string
  valid_from: string | null
  valid_until: string | null
  approved_at: string | null
  document_types: { codigo: string; nombre: string } | null
}

interface FrequencyRow {
  document_type: string
  document_name: string
  frequency: string
  frequency_value: number | null
  frequency_unit: string | null
}

interface EvalRow {
  status: string
  standards_0312: { standard_number: string; name: string } | null
}

interface EquipmentRow {
  tipo: string
  codigo_interno: string
  estado: string
  fecha_vencimiento: string | null
}

export class MonthlyLogGenerator {
  private anthropic?: Anthropic

  constructor() {
    const key = process.env.ANTHROPIC_API_KEY
    if (key) {
      this.anthropic = new Anthropic({ apiKey: key })
    }
  }

  async generate(
    companyId: string,
    month: string,
    supabaseClient?: unknown,
  ): Promise<MonthlyLogData> {
    let supabase: ReturnType<typeof createServerClient>
    if (supabaseClient) {
      supabase = supabaseClient as ReturnType<typeof createServerClient>
    } else {
      const cookieStore = cookies()
      supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll() } },
      )
    }

    const [yearStr, monthStr] = month.split('-')
    const year = parseInt(yearStr || '0', 10)
    const monthIndex = parseInt(monthStr || '1', 10) - 1

    const startOfMonth = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0))
    const endOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59))
    const startOfNextMonth = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0))
    const endOfNextMonth = new Date(Date.UTC(year, monthIndex + 2, 0, 23, 59, 59))

    const startIso = startOfMonth.toISOString()
    const endIso = endOfMonth.toISOString()

    const { data: company } = await supabase
      .from('companies')
      .select('razon_social, nit, ciiu_principal')
      .eq('id', companyId)
      .single()

    const companyName = company?.razon_social || 'Empresa Cliente'
    const companyCiiu = company?.ciiu_principal || 'No especificado'

    // Documents approved/created this month
    const { data: docsThisMonth } = await supabase
      .from('documents')
      .select(
        'id, status, created_at, valid_from, valid_until, approved_at, document_types(codigo, nombre)',
      )
      .eq('company_id', companyId)
      .gte('created_at', startIso)
      .lte('created_at', endIso)

    // All active documents for the company (latest per type)
    const { data: allDocs } = await supabase
      .from('documents')
      .select(
        'id, status, created_at, valid_from, valid_until, approved_at, document_types(codigo, nombre)',
      )
      .eq('company_id', companyId)
      .in('status', ['approved', 'pending', 'in_review'])
      .order('created_at', { ascending: false })

    // Document frequencies catalog
    const { data: frequencies } = await supabase
      .from('document_frequencies')
      .select('document_type, document_name, frequency, frequency_value, frequency_unit')

    const { data: evals } = await supabase
      .from('standard_evaluations')
      .select('status, standards_0312(standard_number, name)')
      .eq('company_id', companyId)

    const { data: equipment } = await supabase
      .from('emergency_equipment')
      .select('tipo, codigo_interno, estado, fecha_vencimiento')
      .eq('company_id', companyId)

    const docs = (docsThisMonth || []) as DocumentRow[]
    const allDocsList = (allDocs || []) as DocumentRow[]
    const freqs = (frequencies || []) as FrequencyRow[]
    const evalsList = (evals || []) as EvalRow[]
    const equipList = (equipment || []) as EquipmentRow[]

    const completedFacts = this.buildCompletedFacts(docs)
    const { pendingFacts, upcomingFacts } = this.buildPendingAndUpcomingFacts(
      allDocsList,
      freqs,
      endOfMonth,
      startOfNextMonth,
      endOfNextMonth,
    )
    const evalFacts = this.buildEvalFacts(evalsList)
    const equipFacts = this.buildEquipmentFacts(equipList)

    const systemPrompt = `Eres un Consultor Senior de Seguridad y Salud en el Trabajo (SST) en Colombia (Decreto 1072 de 2015 y Resolucion 0312 de 2019).
Debes responder ESTRICTAMENTE con un objeto JSON que contenga exactamente tres claves con formato de texto en Markdown profesional, formal y corporativo:
{
  "completed_summary": "resumen estructurado en Markdown de lo completado y los logros del mes",
  "pending_summary": "resumen estructurado en Markdown de lo pendiente, vencido o no entregado a la fecha",
  "next_month_plan": "plan de accion estructurado en Markdown para el siguiente mes, incluyendo documentos que vencen pronto y actividades programadas"
}

Reglas de redaccion:
- Usa lenguaje formal y corporativo. No uses emojis ni simbolos decorativos.
- Estructura con encabezados Markdown (###), listas (- item) y negritas (**texto**).
- Se conciso pero completo. Cada seccion debe tener entre 3 y 10 puntos relevantes.
- Cuando haya pocos datos, complementa con recomendaciones SST de buenas practicas.
- Evita introducciones genericas. Ve directo al contenido factual.
El JSON debe ser valido.`

    const userPrompt = `Genera la bitacora mensual de SST para el mes de ${month} de la empresa ${companyName} (CIIU: ${companyCiiu}).

Datos registrados en el sistema:

1. DOCUMENTOS COMPLETADOS EN EL PERIODO:
${completedFacts}

2. DOCUMENTOS PENDIENTES O VENCIDOS (ya deberian haberse entregado/renovado):
${pendingFacts}

3. DOCUMENTOS QUE VENCEN O SE DEBEN RENOVAR EL PROXIMO MES (planificacion):
${upcomingFacts}

4. EVALUACION DE ESTANDARES MINIMOS (Res. 0312/2019):
${evalFacts}

5. ESTADO DE EQUIPOS DE EMERGENCIA:
${equipFacts}

Redacta el informe contrastando lo completado vs. lo esperado segun el plan de trabajo. Para documentos que aun no vencen pero venceran pronto, incluyelos en el plan del siguiente mes como tareas de planificacion, no como pendientes.`

    try {
      let resultText = ''

      if (this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: 'claude-3-5-sonnet-20240620',
          max_tokens: 2500,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          temperature: 0,
        })

        if (response.content[0]?.type === 'text') {
          resultText = response.content[0].text
        }
      } else if (process.env.GROQ_API_KEY) {
        const groq = new GroqFallbackClient()
        resultText = await groq.generateText(systemPrompt, userPrompt)
      }

      if (resultText) {
        const jsonMatch = resultText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          if (parsed.completed_summary && parsed.pending_summary && parsed.next_month_plan) {
            return parsed as MonthlyLogData
          }
        }
      }
    } catch (e) {
      console.error(
        'Error al invocar IA para bitacora mensual, usando fallback local estructurado:',
        e,
      )
    }

    return this.generateLocalFallback(
      companyName,
      month,
      docs,
      allDocsList,
      freqs,
      evalsList,
      equipList,
      endOfMonth,
      startOfNextMonth,
      endOfNextMonth,
    )
  }

  private buildCompletedFacts(docs: DocumentRow[]): string {
    const approved = docs.filter((d) => d.status === 'approved')
    const uploaded = docs.filter((d) => d.status !== 'approved')

    if (approved.length === 0 && uploaded.length === 0) {
      return '- No se registraron documentos nuevos en el periodo.'
    }

    const lines: string[] = []
    if (approved.length > 0) {
      lines.push(`Documentos aprobados (${approved.length}):`)
      for (const d of approved) {
        const name = d.document_types?.nombre || 'Documento sin tipo'
        const validUntil = d.valid_until ? ` (Vigente hasta: ${d.valid_until.slice(0, 10)})` : ''
        lines.push(`- ${name}${validUntil}`)
      }
    }
    if (uploaded.length > 0) {
      lines.push(`Documentos cargados en revision (${uploaded.length}):`)
      for (const d of uploaded) {
        const name = d.document_types?.nombre || 'Documento sin tipo'
        lines.push(`- ${name} (Estado: ${d.status})`)
      }
    }
    return lines.join('\n')
  }

  private buildPendingAndUpcomingFacts(
    allDocs: DocumentRow[],
    freqs: FrequencyRow[],
    endOfMonth: Date,
    startOfNextMonth: Date,
    endOfNextMonth: Date,
  ): { pendingFacts: string; upcomingFacts: string } {
    const pending: string[] = []
    const upcoming: string[] = []

    const latestByType = new Map<string, DocumentRow>()
    for (const doc of allDocs) {
      const code = doc.document_types?.codigo
      if (code && !latestByType.has(code)) {
        latestByType.set(code, doc)
      }
    }

    for (const doc of allDocs) {
      const code = doc.document_types?.codigo
      if (!code) continue
      if (latestByType.get(code)?.id !== doc.id) continue

      const name = doc.document_types?.nombre || code
      if (!doc.valid_until) continue

      const validUntil = new Date(doc.valid_until)

      if (validUntil < endOfMonth && doc.status === 'approved') {
        pending.push(
          `- ${name}: vencio el ${doc.valid_until.slice(0, 10)}. Requiere renovacion inmediata.`,
        )
      } else if (validUntil >= startOfNextMonth && validUntil <= endOfNextMonth) {
        upcoming.push(`- ${name}: vence el ${doc.valid_until.slice(0, 10)}. Programar renovacion.`)
      }
    }

    const recurringFreqs = freqs.filter(
      (f) =>
        f.frequency !== 'on_event' && f.frequency !== 'one_time' && f.frequency !== 'as_needed',
    )

    for (const freq of recurringFreqs) {
      const hasDoc = Array.from(latestByType.values()).some((d) => {
        const docCode = d.document_types?.codigo || ''
        return this.codesMatch(docCode, freq.document_type)
      })

      if (!hasDoc && freq.frequency_value) {
        if (freq.frequency === 'monthly') {
          pending.push(
            `- ${freq.document_name}: documento de frecuencia mensual sin registro en la plataforma.`,
          )
        } else if (freq.frequency === 'quarterly' || freq.frequency === 'semiannual') {
          upcoming.push(
            `- ${freq.document_name} (frecuencia: ${freq.frequency}): sin registro en la plataforma. Verificar si corresponde al periodo.`,
          )
        }
      }
    }

    return {
      pendingFacts:
        pending.length > 0
          ? pending.join('\n')
          : '- No se detectaron documentos vencidos o pendientes.',
      upcomingFacts:
        upcoming.length > 0
          ? upcoming.join('\n')
          : '- No se identificaron documentos con vencimiento proximo.',
    }
  }

  private codesMatch(docCode: string, freqType: string): boolean {
    const normalize = (s: string) => s.toLowerCase().replace(/[_\s-]/g, '')
    const a = normalize(docCode)
    const b = normalize(freqType)
    return a === b || a.includes(b) || b.includes(a)
  }

  private buildEvalFacts(evals: EvalRow[]): string {
    const compliant = evals.filter((e) => e.status === 'cumple')
    const nonCompliant = evals.filter((e) => e.status === 'no_cumple' || e.status === 'pendiente')

    const lines = [
      `- Estandares que CUMPLEN: ${compliant.length}`,
      `- Estandares PENDIENTES o NO CUMPLEN: ${nonCompliant.length}`,
    ]

    if (nonCompliant.length > 0) {
      lines.push('Detalle de estandares pendientes (primeros 10):')
      for (const e of nonCompliant.slice(0, 10)) {
        lines.push(`  * [${e.standards_0312?.standard_number}] ${e.standards_0312?.name}`)
      }
      if (nonCompliant.length > 10) {
        lines.push(`  * ... y ${nonCompliant.length - 10} mas`)
      }
    }

    return lines.join('\n')
  }

  private buildEquipmentFacts(equipment: EquipmentRow[]): string {
    const expired = equipment.filter(
      (eq) => eq.estado === 'vencido' || eq.estado === 'alerta_vencimiento',
    )

    if (expired.length === 0) {
      return '- Todos los equipos de emergencia al dia o sin alertas vigentes.'
    }

    return expired
      .map(
        (e) =>
          `- ${e.tipo} (Cod: ${e.codigo_interno}, Estado: ${e.estado}, Vence: ${e.fecha_vencimiento || 'N/A'})`,
      )
      .join('\n')
  }

  private generateLocalFallback(
    companyName: string,
    month: string,
    docsThisMonth: DocumentRow[],
    allDocs: DocumentRow[],
    freqs: FrequencyRow[],
    evals: EvalRow[],
    equipment: EquipmentRow[],
    endOfMonth: Date,
    startOfNextMonth: Date,
    endOfNextMonth: Date,
  ): MonthlyLogData {
    const approved = docsThisMonth.filter((d) => d.status === 'approved')
    const pendingDocs = docsThisMonth.filter(
      (d) => d.status === 'pending' || d.status === 'in_review',
    )
    const compliantCount = evals.filter((e) => e.status === 'cumple').length
    const pendingEvals = evals.filter((e) => e.status === 'no_cumple' || e.status === 'pendiente')
    const expiredEquip = equipment.filter(
      (eq) => eq.estado === 'vencido' || eq.estado === 'alerta_vencimiento',
    )

    let completed_summary = `### Avances y Cumplimiento - ${month}\n\n`
    if (approved.length > 0) {
      completed_summary += `Se aprobaron **${approved.length}** documentos del SG-SST:\n`
      for (const d of approved) {
        completed_summary += `- **${d.document_types?.nombre || 'Documento'}**\n`
      }
    } else {
      completed_summary += `- No se registraron aprobaciones de documentos nuevos en el periodo.\n`
    }
    completed_summary += `- El diagnostico de estandares minimos registra **${compliantCount}** requisitos en estado conforme.\n`

    let pending_summary = `### Requisitos Pendientes y Alertas - ${month}\n\n`

    const { pendingFacts, upcomingFacts: _upcoming } = this.buildPendingAndUpcomingFacts(
      allDocs,
      freqs,
      endOfMonth,
      startOfNextMonth,
      endOfNextMonth,
    )

    if (pendingDocs.length > 0) {
      pending_summary += `Documentos en revision o pendientes de firma (**${pendingDocs.length}**):\n`
      for (const d of pendingDocs) {
        pending_summary += `- **${d.document_types?.nombre || 'Documento'}** (Estado: *${d.status}*)\n`
      }
    }

    pending_summary += `\n${pendingFacts}\n`

    if (expiredEquip.length > 0) {
      pending_summary += `\n**Equipos de emergencia con novedad:**\n`
      for (const e of expiredEquip) {
        pending_summary += `- **${e.tipo}** (Codigo: ${e.codigo_interno}) - Estado: **${(e.estado ?? '').toUpperCase()}** (Vencimiento: ${e.fecha_vencimiento || 'N/A'})\n`
      }
    }
    if (pendingEvals.length > 0) {
      pending_summary += `- Quedan pendientes **${pendingEvals.length}** estandares de la autoevaluacion (Res. 0312/2019).\n`
    }

    let next_month_plan = `### Plan de Accion - Siguiente Periodo\n\n`

    const latestByType = new Map<string, DocumentRow>()
    for (const doc of allDocs) {
      const code = doc.document_types?.codigo
      if (code && !latestByType.has(code)) {
        latestByType.set(code, doc)
      }
    }

    const upcomingDocs: string[] = []
    for (const doc of Array.from(latestByType.values())) {
      if (!doc.valid_until) continue
      const validUntil = new Date(doc.valid_until)
      if (validUntil >= startOfNextMonth && validUntil <= endOfNextMonth) {
        upcomingDocs.push(
          `- **${doc.document_types?.nombre}**: vence el ${doc.valid_until.slice(0, 10)}. Programar renovacion.`,
        )
      }
    }

    if (upcomingDocs.length > 0) {
      next_month_plan += `**Documentos con vencimiento proximo:**\n`
      next_month_plan += upcomingDocs.join('\n') + '\n\n'
    }

    next_month_plan += `1. **Prioridad 1:** Gestionar la recarga o mantenimiento de equipos de emergencia en estado de alerta o vencimiento.\n`
    if (pendingDocs.length > 0) {
      next_month_plan += `2. **Aprobacion documental:** Completar el flujo de revision para los documentos en estado pendiente.\n`
    }
    if (pendingEvals.length > 0) {
      next_month_plan += `3. **Plan de trabajo:** Formular evidencias para los estandares prioritarios:\n`
      for (const e of pendingEvals.slice(0, 3)) {
        next_month_plan += `   - [${e.standards_0312?.standard_number}] *${e.standards_0312?.name}*\n`
      }
    }

    return { completed_summary, pending_summary, next_month_plan }
  }
}
