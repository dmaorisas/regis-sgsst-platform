import Anthropic from '@anthropic-ai/sdk'
import { GroqFallbackClient } from './groq-client'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export interface MonthlyLogData {
  completed_summary: string
  pending_summary: string
  next_month_plan: string
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
    // 1. Obtener cliente Supabase (usamos cookies() si no se pasa uno)
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

    // 2. Extraer rangos de fecha del mes
    const [yearStr, monthStr] = month.split('-')
    const year = parseInt(yearStr || '0', 10)
    const monthIndex = parseInt(monthStr || '1', 10) - 1 // 0-indexed

    const startOfMonth = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0))
    const endOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59))

    const startIso = startOfMonth.toISOString()
    const endIso = endOfMonth.toISOString()

    // 3. Consultar datos de la empresa
    const { data: company } = await supabase
      .from('companies')
      .select('razon_social, nit, ciiu_principal')
      .eq('id', companyId)
      .single()

    const companyName = company?.razon_social || 'Empresa Cliente'
    const companyCiiu = company?.ciiu_principal || 'No especificado'

    // 4. Consultar documentos cargados/modificados en el mes
    const { data: docs } = await supabase
      .from('documents')
      .select('id, status, created_at, document_types(nombre)')
      .eq('company_id', companyId)
      .gte('created_at', startIso)
      .lte('created_at', endIso)

    // 5. Consultar evaluaciones de estándares
    const { data: evals } = await supabase
      .from('standard_evaluations')
      .select('status, standards_0312(code, name)')
      .eq('company_id', companyId)

    // 6. Consultar inventario de equipos de emergencias
    const { data: equipment } = await supabase
      .from('emergency_equipment')
      .select('tipo, codigo_interno, estado, fecha_vencimiento')
      .eq('company_id', companyId)

    // 7. Preparar contexto de hechos para la IA
    const docFacts =
      (docs || [])
        .map((d: unknown) => {
          const doc = d as Record<string, unknown>
          const docType = doc.document_types as Record<string, string> | undefined
          return `- ${docType?.nombre || 'Documento sin tipo'} (Estado: ${doc.status}, Creado: ${(doc.created_at as string).slice(0, 10)})`
        })
        .join('\n') || '- Ninguno cargado este mes.'

    const compliantEvals = (evals || []).filter(
      (e: unknown) => (e as Record<string, unknown>).status === 'cumple',
    )
    const pendingEvals = (evals || []).filter(
      (e: unknown) =>
        (e as Record<string, unknown>).status === 'no_cumple' ||
        (e as Record<string, unknown>).status === 'pendiente',
    )

    const evalFacts = `
- Estándares que CUMPLEN: ${compliantEvals.length}
- Estándares PENDIENTES o NO CUMPLEN: ${pendingEvals.length}
${pendingEvals
  .slice(0, 10)
  .map(
    (e: unknown) =>
      `  * [${(e as Record<string, Record<string, string>>).standards_0312?.code}] ${(e as Record<string, Record<string, string>>).standards_0312?.name}`,
  )
  .join('\n')}
${pendingEvals.length > 10 ? '  * ... y otros más' : ''}
    `.trim()

    const expiredEquip = (equipment || []).filter(
      (eq: unknown) =>
        (eq as Record<string, unknown>).estado === 'vencido' ||
        (eq as Record<string, unknown>).estado === 'alerta_vencimiento',
    )
    const equipFacts =
      (expiredEquip || [])
        .map((eq: unknown) => {
          const e = eq as Record<string, unknown>
          return `- ${e.tipo} (Cód: ${e.codigo_interno}, Estado: ${e.estado}, Vence: ${e.fecha_vencimiento})`
        })
        .join('\n') || '- Todos los equipos al día o sin alertas vigentes.'

    const systemPrompt = `Eres un Consultor Senior de Seguridad y Salud en el Trabajo (SST) en Colombia (Decreto 1072 de 2015 y Resolución 0312 de 2019).
Debes responder ESTRICTAMENTE con un objeto JSON que contenga exactamente tres claves con formato de texto en Markdown profesional, formal y corporativo:
{
  "completed_summary": "resumen estructurado en Markdown de lo completado en el mes",
  "pending_summary": "resumen estructurado en Markdown de lo pendiente o fallido en el mes",
  "next_month_plan": "plan de acción estructurado en Markdown para el siguiente mes"
}
Evita introducciones o comentarios extra en tu respuesta. El JSON debe ser válido.`

    const userPrompt = `Genera la bitácora mensual de SST para el mes de ${month} de la empresa ${companyName} (CIIU: ${companyCiiu}).
    
Aquí tienes los datos registrados en el sistema durante este periodo:

1. DOCUMENTOS CARGADOS Y SU ESTADO:
${docFacts}

2. EVALUACIÓN DE ESTÁNDARES MÍNIMOS (RESUMEN):
${evalFacts}

3. ESTADO DE EQUIPOS DE EMERGENCIA CRÍTICOS (ALERTA/VENCIMIENTO):
${equipFacts}

Por favor, redacta el resumen formalmente de acuerdo a este contexto. Si hay pocos datos, rellena con recomendaciones SST de buenas prácticas corporativas correspondientes al avance esperado.`

    // 8. Invocar IA o usar fallback
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
        // Limpiar posibles bloques markdown del JSON
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
        'Error al invocar IA para bitácora mensual, usando fallback local estructurado:',
        e,
      )
    }

    // 9. Fallback local estructurado e inteligente por código
    return this.generateLocalFallback(companyName, month, docs || [], evals || [], expiredEquip)
  }

  private generateLocalFallback(
    companyName: string,
    month: string,
    docs: unknown[],
    evals: unknown[],
    expiredEquip: unknown[],
  ): MonthlyLogData {
    const approvedDocs = docs.filter((d) => (d as Record<string, unknown>).status === 'approved')
    const pendingDocs = docs.filter(
      (d) =>
        (d as Record<string, unknown>).status === 'pending' ||
        (d as Record<string, unknown>).status === 'in_review',
    )

    const compliantCount = evals.filter(
      (e) => (e as Record<string, unknown>).status === 'cumple',
    ).length
    const pendingEvals = evals.filter(
      (e) =>
        (e as Record<string, unknown>).status === 'no_cumple' ||
        (e as Record<string, unknown>).status === 'pendiente',
    )

    let completed_summary = `### Avances y Cumplimiento de ${month}\n\n`
    if (approvedDocs.length > 0) {
      completed_summary += `Se han aprobado y archivado exitosamente **${approvedDocs.length}** documentos del SG-SST:\n`
      approvedDocs.forEach((d) => {
        const docType = (d as Record<string, unknown>).document_types as
          | Record<string, string>
          | undefined
        completed_summary += `- **${docType?.nombre || 'Documento'}** (Cargado formalmente)\n`
      })
    } else {
      completed_summary += `- No se registraron aprobaciones de documentos nuevos en la plataforma durante este periodo.\n`
    }
    completed_summary += `- El diagnóstico de estándares mínimos registra un total de **${compliantCount}** requisitos en estado conforme ("Cumple").\n`

    let pending_summary = `### Requisitos Pendientes y Alertas de ${month}\n\n`
    if (pendingDocs.length > 0) {
      pending_summary += `Se encuentran en revisión o pendientes de firma **${pendingDocs.length}** documentos:\n`
      pendingDocs.forEach((d) => {
        const doc = d as Record<string, unknown>
        const docType = doc.document_types as Record<string, string> | undefined
        pending_summary += `- **${docType?.nombre || 'Documento'}** (Estado actual: *${doc.status}*)\n`
      })
    }
    if (expiredEquip.length > 0) {
      pending_summary += `⚠️ **Equipos de emergencia con novedad de vencimiento:**\n`
      expiredEquip.forEach((eq) => {
        const e = eq as Record<string, string>
        pending_summary += `- **${e.tipo}** (Código: ${e.codigo_interno}) - Estado: **${e.estado.toUpperCase()}** (Vencimiento: ${e.fecha_vencimiento})\n`
      })
    } else {
      pending_summary += `- Todos los extintores y camillas de primeros auxilios inspeccionados están al día.\n`
    }
    if (pendingEvals.length > 0) {
      pending_summary += `- Quedan pendientes **${pendingEvals.length}** estándares de la autoevaluación (Res. 0312 de 2019).\n`
    }

    let next_month_plan = `### Cronograma y Acciones para el Siguiente Periodo\n\n`
    next_month_plan += `1. **Prioridad 1:** Gestionar la recarga o mantenimiento de los equipos de emergencia en estado de alerta o vencimiento.\n`
    if (pendingDocs.length > 0) {
      next_month_plan += `2. **Aprobación documental:** Completar el flujo de revisión para los documentos cargados en estado pendiente.\n`
    }
    if (pendingEvals.length > 0) {
      next_month_plan += `3. **Plan de trabajo:** Iniciar la formulación de evidencias para los estándares prioritarios del SG-SST:\n`
      pendingEvals.slice(0, 3).forEach((e) => {
        const ev = (e as Record<string, unknown>).standards_0312 as
          | Record<string, string>
          | undefined
        next_month_plan += `   - [${ev?.code}] *${ev?.name}*\n`
      })
    }

    return {
      completed_summary,
      pending_summary,
      next_month_plan,
    }
  }
}
