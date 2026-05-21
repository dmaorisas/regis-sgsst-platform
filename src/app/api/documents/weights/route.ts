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

    let weights: Array<{
      id?: string
      document_type_code: string
      weight: number
      is_required: boolean
      justification: string | null
      sort_order: number
      company_id?: string | null
    }> | null = null

    if (companyId) {
      const { data } = await supabase
        .from('document_weight_config')
        .select('*')
        .eq('company_id', companyId)
        .order('sort_order')

      if (data && data.length > 0) {
        weights = data
      }
    }

    if (!weights) {
      const { data } = await supabase
        .from('document_weight_config')
        .select('*')
        .is('company_id', null)
        .order('sort_order')

      if (data && data.length > 0) {
        weights = data
      }
    }

    if (!weights || weights.length === 0) {
      weights = HARDCODED_DEFAULTS.map((d) => ({
        ...d,
        company_id: null,
      }))
    }

    const { data: docTypes } = await supabase.from('document_types').select('codigo, nombre')

    const allDocTypes = (docTypes ?? []).map((dt: { codigo: string; nombre: string }) => ({
      codigo: dt.codigo,
      nombre: dt.nombre,
    }))

    const docTypeNames = new Map(allDocTypes.map((dt) => [dt.codigo, dt.nombre]))

    const usedCodes = new Set(weights.map((w) => w.document_type_code))
    const availableDocTypes = allDocTypes.filter((dt) => !usedCodes.has(dt.codigo))

    const result = weights.map((w) => ({
      ...w,
      document_type_name: docTypeNames.get(w.document_type_code) ?? w.document_type_code,
    }))

    const totalWeight = weights.reduce((sum, w) => sum + Number(w.weight), 0)

    return NextResponse.json({
      weights: result,
      total_weight: totalWeight,
      is_valid: Math.abs(totalWeight - 100) < 0.01,
      is_company_override: weights.length > 0 && (weights[0]?.company_id ?? null) !== null,
      available_doc_types: availableDocTypes,
    })
  } catch (error: unknown) {
    console.error('Error en weights GET:', error)
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const {
      company_id,
      weights,
    }: {
      company_id: string | null
      weights: Array<{
        document_type_code: string
        weight: number
        is_required: boolean
        justification?: string
        sort_order: number
      }>
    } = body

    if (!Array.isArray(weights) || weights.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere al menos un tipo de documento' },
        { status: 400 },
      )
    }

    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0)
    if (Math.abs(totalWeight - 100) > 0.01) {
      return NextResponse.json(
        {
          error: `Los pesos deben sumar exactamente 100%. Suma actual: ${totalWeight.toFixed(2)}%`,
          total_weight: totalWeight,
        },
        { status: 400 },
      )
    }

    for (const w of weights) {
      if (w.weight <= 0 || w.weight > 100) {
        return NextResponse.json(
          {
            error: `Peso invalido para "${w.document_type_code}": ${w.weight}. Debe ser entre 0.01 y 100.`,
          },
          { status: 400 },
        )
      }
    }

    const codes = weights.map((w) => w.document_type_code)
    const uniqueCodes = new Set(codes)
    if (uniqueCodes.size !== codes.length) {
      return NextResponse.json(
        { error: 'Tipos de documento duplicados en la configuracion' },
        { status: 400 },
      )
    }

    if (company_id) {
      await supabase.from('document_weight_config').delete().eq('company_id', company_id)
    } else {
      await supabase.from('document_weight_config').delete().is('company_id', null)
    }

    const rows = weights.map((w) => ({
      company_id: company_id,
      document_type_code: w.document_type_code,
      weight: w.weight,
      is_required: w.is_required,
      justification: w.justification ?? null,
      sort_order: w.sort_order,
    }))

    const { error: insertError } = await supabase.from('document_weight_config').insert(rows)

    if (insertError) {
      return NextResponse.json(
        { error: `Error al guardar configuracion: ${insertError.message}` },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Configuracion de pesos actualizada',
      total_weight: totalWeight,
    })
  } catch (error: unknown) {
    console.error('Error en weights PUT:', error)
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
