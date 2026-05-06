import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { MedicalExtractor } from '@/lib/ai/medical-extractor'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch (error) {
              // Ignore if we are rendering a component
            }
          },
        },
      }
    )

    // Check Authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const workerId = formData.get('worker_id') as string | null
    const companyId = formData.get('company_id') as string | null
    const type = formData.get('type') as string | null
    
    if (!file || !workerId || !companyId || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Upload to Supabase Storage (medical_exams_secure bucket)
    const fileExt = file.name.split('.').pop()
    const fileName = `${companyId}/${workerId}/${Date.now()}.${fileExt}`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('medical_exams_secure')
      .upload(fileName, file)

    if (uploadError) {
      // Si el bucket no existe en local, simulamos subida para continuar
      console.warn('Storage upload error (might be missing bucket):', uploadError)
    }

    const filePath = uploadData?.path || fileName

    // 2. Convert PDF to Base64 for Claude
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // 3. Extract using Claude
    // Usamos el Service Role para tener acceso total a ai_usage y Claude
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    )
    
    const extractor = MedicalExtractor.create(supabaseAdmin)
    const extractionResult = await extractor.extractFromPdf(base64)

    // 4. Save to Database
    const { data: examData, error: examError } = await supabase
      .from('medical_exams')
      .insert({
        worker_id: workerId,
        company_id: companyId,
        file_path_storage: filePath,
        exam_date: new Date().toISOString().split('T')[0],
        type: type,
      })
      .select()
      .single()

    if (examError) {
      throw new Error(`Error insertando examen: ${examError.message}`)
    }

    if (extractionResult.recommendations.length > 0) {
      const recommendationsToInsert = extractionResult.recommendations.map(r => ({
        exam_id: examData.id,
        recommendation_text: r.text,
        type: r.type,
        duration_days: r.duration_days
      }))

      const { error: recError } = await supabase
        .from('medical_recommendations')
        .insert(recommendationsToInsert)

      if (recError) {
         console.error('Error insertando recomendaciones:', recError)
      }
    }

    return NextResponse.json({ 
      success: true, 
      exam: examData,
      extracted: extractionResult.recommendations 
    })

  } catch (error: any) {
    console.error('Upload Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 })
  }
}
