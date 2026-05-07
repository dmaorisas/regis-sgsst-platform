import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { ActaGenerator } from '@/lib/ai/acta-generator'
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
    const { companyId, tipoComite, fecha, asistentes, notasBreves } = body

    if (!companyId || !tipoComite || !fecha || !asistentes || !notasBreves) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
    }

    // Validar seguridad: El usuario debe pertenecer a la empresa o ser Regis Staff
    if (!userWithRoles.isRegisStaff && !userWithRoles.companyIds.includes(companyId)) {
      return NextResponse.json({ error: 'No tienes acceso a esta empresa' }, { status: 403 })
    }

    // Obtener la empresa usando Admin client (bypass RLS)
    const adminSupabase = getSupabaseAdminClient()
    const { data: company, error } = await adminSupabase
      .from('companies')
      .select('name, razon_social')
      .eq('id', companyId)
      .single()

    if (error || !company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
    }

    const companyName = company.razon_social || company.name

    // Generar Acta
    const generator = new ActaGenerator()
    const actaMarkdown = await generator.generateActa(tipoComite, companyName, fecha, asistentes, notasBreves)

    return NextResponse.json({ success: true, acta: actaMarkdown })

  } catch (error: any) {
    console.error('Error generating acta:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
