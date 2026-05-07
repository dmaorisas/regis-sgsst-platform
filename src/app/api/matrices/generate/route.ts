import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { MatrixGenerator } from '@/lib/ai/matrix-generator'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )

    // Check auth and roles
    const userWithRoles = await getUserWithRoles()
    if (!userWithRoles) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { companyId } = body

    if (!companyId) {
      return NextResponse.json({ error: 'Falta companyId' }, { status: 400 })
    }

    // Validar seguridad: El usuario debe pertenecer a la empresa o ser Regis Staff
    if (!userWithRoles.isRegisStaff && !userWithRoles.companyIds.includes(companyId)) {
      return NextResponse.json({ error: 'No tienes acceso a esta empresa' }, { status: 403 })
    }

    // Obtener detalles de la empresa bypass RLS
    const adminSupabase = getSupabaseAdminClient()
    const { data: company, error } = await adminSupabase
      .from('companies')
      .select('name, razon_social, ciiu_principal')
      .eq('id', companyId)
      .single()

    if (error || !company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
    }

    const companyName = company.razon_social || company.name
    const ciiu = company.ciiu_principal || 'Actividad comercial general'

    // Generar con IA
    const generator = new MatrixGenerator()
    const matrix = await generator.generateMatrixForIndustry(companyName, ciiu)

    return NextResponse.json({ success: true, matrix })

  } catch (error: any) {
    console.error('Error generating matrix:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
