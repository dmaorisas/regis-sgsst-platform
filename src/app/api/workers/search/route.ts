import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )

    // Check auth
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

    // Buscar en worker_company
    let query = supabase
      .from('worker_company')
      .select('workers!inner(id, nombres, apellidos, cedula)')
      .eq('company_id', companyId)
      .eq('is_active', true)

    if (q) {
      // Búsqueda por cédula, nombres o apellidos
      // Supabase supports standard ilike on nested relationships but it's easier to do an OR
      // Note: PostgREST requires a specific syntax for OR filtering on foreign tables.
      // A safer approach if the foreign table OR is tricky is to use an RPC or search the workers table directly if RLS allows.
      // Since workers is a separate table, we can just fetch all matching workers and then filter by company_id.
      // For simplicity, we'll search the workers directly using the relationship.
      query = query.or(`cedula.ilike.%${q}%,nombres.ilike.%${q}%,apellidos.ilike.%${q}%`, { foreignTable: 'workers' })
    }

    // Límite para evitar colapso
    const { data, error } = await query.limit(20)

    if (error) throw error

    // Formatear salida
    const results = (data || []).map(row => row.workers).flat()

    return NextResponse.json({ workers: results })
  } catch (error: any) {
    console.error('Error in workers/search API:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
