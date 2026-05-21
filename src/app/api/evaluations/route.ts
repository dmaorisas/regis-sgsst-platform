import { NextRequest, NextResponse } from 'next/server'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'

const VALID_STATUSES = ['cumple', 'no_cumple', 'no_aplica', 'pendiente'] as const

export async function POST(req: NextRequest) {
  const user = await getUserWithRoles()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { centro_id, standard_id, status } = body as Record<string, string>

  if (!centro_id || !standard_id || !status) {
    return NextResponse.json(
      { error: 'Faltan campos requeridos: centro_id, standard_id, status' },
      { status: 400 },
    )
  }
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  const admin = getSupabaseAdminClient()

  const { data: centro } = await admin
    .from('centros_de_trabajo')
    .select('company_id')
    .eq('id', centro_id)
    .single()

  if (!centro) {
    return NextResponse.json({ error: 'Centro no encontrado' }, { status: 404 })
  }

  const companyId = centro.company_id as string
  if (!user.isRegisStaff && !user.companyIds.includes(companyId)) {
    return NextResponse.json({ error: 'Sin acceso a esta empresa' }, { status: 403 })
  }

  const { error } = await admin.from('standard_evaluations').upsert(
    {
      centro_id,
      company_id: companyId,
      standard_id,
      status,
      evaluator_id: user.app_user_id,
      evaluated_at: new Date().toISOString(),
      deleted_at: null,
    },
    { onConflict: 'centro_id,standard_id' },
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
