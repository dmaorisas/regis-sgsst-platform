import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { EmergencyGenerator } from '@/lib/ai/emergency-generator'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )

    // Check auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const companyId = formData.get('companyId') as string

    if (!file || !companyId) {
      return NextResponse.json({ error: 'Falta el archivo o el companyId' }, { status: 400 })
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
