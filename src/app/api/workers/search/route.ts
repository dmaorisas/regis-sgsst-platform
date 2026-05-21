import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const userWithRoles = await getUserWithRoles()
    if (!userWithRoles) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'Falta companyId' }, { status: 400 })
    }

    if (!userWithRoles.isRegisStaff && !userWithRoles.companyIds.includes(companyId)) {
      return NextResponse.json({ error: 'No autorizado para esta empresa' }, { status: 403 })
    }

    // Auth already validated above — use service role to bypass RLS for this read
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } },
    )

    let query = supabaseAdmin
      .from('worker_company')
      .select('workers!inner(id, nombres, apellidos, cedula)')
      .eq('company_id', companyId)
      .eq('is_active', true)

    if (q) {
      query = query.or(`cedula.ilike.%${q}%,nombres.ilike.%${q}%,apellidos.ilike.%${q}%`, {
        foreignTable: 'workers',
      })
    }

    const { data, error } = await query.limit(20)

    if (error) throw error

    const results = (data || []).map((row) => row.workers).flat()

    return NextResponse.json({ workers: results })
  } catch (error: unknown) {
    console.error('Error in workers/search API:', error)
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
