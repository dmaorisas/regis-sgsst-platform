import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { EmergencyGenerator } from '@/lib/ai/emergency-generator'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'

export const maxDuration = 60;

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

    const formData = await req.formData()
    const file = formData.get('file') as File
    const companyId = formData.get('companyId') as string

    if (!file || !companyId) {
      return NextResponse.json({ error: 'Falta el archivo o el companyId' }, { status: 400 })
    }

    // Validar seguridad: El usuario debe pertenecer a la empresa o ser Regis Staff
    if (!userWithRoles.isRegisStaff && !userWithRoles.companyIds.includes(companyId)) {
      return NextResponse.json({ error: 'No tienes acceso a esta empresa' }, { status: 403 })
    }

    // Obtener detalles de la empresa bypass RLS
    const adminSupabase = getSupabaseAdminClient()
    const { data: company, error } = await adminSupabase
      .from('companies')
      .select('razon_social, ciiu_principal')
      .eq('id', companyId)
      .single()

    if (error || !company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
    }

    const companyName = company.razon_social
    const ciiu = company.ciiu_principal || 'Actividad general'

    const generator = new EmergencyGenerator()
    
    // 1. Transcripción con Whisper (Groq)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const transcript = await generator.transcribeAudio(buffer, file.name, file.type)

    // 2. Generación de Plan con Claude 3.5
    const planMarkdown = await generator.generateEmergencyPlan(companyName, ciiu, transcript)

    return NextResponse.json({ 
      success: true, 
      transcript: transcript,
      plan: planMarkdown 
    })

  } catch (error: any) {
    console.error('Error procesando emergencia:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
