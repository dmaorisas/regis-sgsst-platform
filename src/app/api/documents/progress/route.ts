import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const HARDCODED_DEFAULTS = [
  {
    document_type_code: 'politica_sgsst',
    weight: 20,
    is_required: true,
    justification: 'Obligatorio Res. 0312, base del sistema',
    sort_order: 1,
  },
  {
    document_type_code: 'actas_recursos',
    weight: 15,
    is_required: true,
    justification: 'Estandar 1.1.1 - Asignacion de recursos',
    sort_order: 2,
  },
  {
    document_type_code: 'plan_capacitacion',
    weight: 15,
    is_required: true,
    justification: 'Estandar 2.6.1',
    sort_order: 3,
  },
  {
    document_type_code: 'cronograma_anual',
    weight: 15,
    is_required: true,
    justification: 'Estandar 2.8.1',
    sort_order: 4,
  },
  {
    document_type_code: 'pila',
    weight: 15,
    is_required: true,
    justification: 'Estandar 1.2.1 - Pago Seguridad Social',
    sort_order: 5,
  },
  {
    document_type_code: 'examen_medico_ingreso',
    weight: 10,
    is_required: true,
    justification: 'Estandar 3.1.1-3.1.4',
    sort_order: 6,
  },
  {
    document_type_code: 'otros',
    weight: 10,
    is_required: false,
    justification: 'Documentos complementarios',
    sort_order: 7,
  },
]

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const companyId = req.nextUrl.searchParams.get('company_id')
    if (!companyId) {
      return NextResponse.json({ error: 'Falta company_id' }, { status: 400 })
    }

    let weights: Array<{
      document_type_code: string
      weight: number
      is_required: boolean
      justification: string | null
      sort_order: number
    }> | null = null

    const { data: companyWeights } = await supabase
      .from('document_weight_config')
      .select('document_type_code, weight, is_required, justification, sort_order')
      .eq('company_id', companyId)
      .order('sort_order')

    if (companyWeights && companyWeights.length > 0) {
      weights = companyWeights
    }

    if (!weights) {
      const { data: globalWeights } = await supabase
        .from('document_weight_config')
        .select('document_type_code, weight, is_required, justification, sort_order')
        .is('company_id', null)
        .order('sort_order')

      if (globalWeights && globalWeights.length > 0) {
        weights = globalWeights
      }
    }

    if (!weights || weights.length === 0) {
      weights = HARDCODED_DEFAULTS
    }

    const { data: docTypes } = await supabase.from('document_types').select('id, codigo, nombre')

    const docTypeMap = new Map(
      (docTypes ?? []).map((dt: { id: string; codigo: string; nombre: string }) => [dt.codigo, dt]),
    )

    const { data: documents } = await supabase
      .from('documents')
      .select('id, document_type_id, status, created_at')
      .eq('company_id', companyId)
      .is('deleted_at', null)

    const docsByTypeId = new Map<string, number>()
    for (const doc of documents ?? []) {
      const count = docsByTypeId.get(doc.document_type_id) ?? 0
      docsByTypeId.set(doc.document_type_id, count + 1)
    }

    let totalWeightSum = 0
    let earnedWeightSum = 0

    const categories = weights.map((w) => {
      const dt = docTypeMap.get(w.document_type_code)
      const typeId = dt?.id
      const uploadedCount = typeId ? (docsByTypeId.get(typeId) ?? 0) : 0
      const hasDocument = uploadedCount > 0
      const earned = hasDocument ? Number(w.weight) : 0

      totalWeightSum += Number(w.weight)
      earnedWeightSum += earned

      return {
        document_type_code: w.document_type_code,
        document_type_name: dt?.nombre ?? w.document_type_code,
        weight: Number(w.weight),
        is_required: w.is_required,
        justification: w.justification,
        sort_order: w.sort_order,
        uploaded_count: uploadedCount,
        has_document: hasDocument,
        earned_weight: earned,
      }
    })

    const percentage =
      totalWeightSum > 0 ? Math.min(100, Math.round((earnedWeightSum / totalWeightSum) * 100)) : 0

    return NextResponse.json({
      percentage,
      total_weight_sum: totalWeightSum,
      earned_weight_sum: earnedWeightSum,
      categories,
      total_documents: (documents ?? []).length,
    })
  } catch (error: unknown) {
    console.error('Error en progress:', error)
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
