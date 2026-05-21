import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { MedicalExtractor } from '@/lib/ai/medical-extractor'

export const maxDuration = 60

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
                cookieStore.set(name, value, options),
              )
            } catch {
              // Ignore if we are rendering a component
            }
          },
        },
      },
    )

    // Check Authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const workerId = formData.get('worker_id') as string | null
    const companyId = formData.get('company_id') as string | null
    const examType = formData.get('type') as string | null

    if (!file || !workerId || !companyId || !examType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Upload to Supabase Storage (medical_exams_secure bucket)
    const fileExt = file.name.split('.').pop()
    const fileName = `${companyId}/${workerId}/${Date.now()}.${fileExt}`

    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } },
    )

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('medical_exams_secure')
      .upload(fileName, file)

    if (uploadError) {
      console.warn('Storage upload warning (bucket may not exist):', uploadError.message)
    }

    const fileUrl = uploadData?.path || fileName

    // 2. Convert PDF to Base64 for AI extraction
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // 3. Extract recommendations using LLM (provider-agnostic)
    const extractor = MedicalExtractor.create(supabaseAdmin)
    const extractionResult = await extractor.extractFromPdf(base64)

    // Separate restrictions from recommendations for DB storage
    const restrictions = extractionResult.recommendations
      .filter((r) => r.type === 'restriccion')
      .map((r) => ({ text: r.text, duration_days: r.duration_days }))

    const recommendations = extractionResult.recommendations
      .filter((r) => r.type === 'recomendacion' || r.type === 'reubicacion')
      .map((r) => ({ text: r.text, type: r.type, duration_days: r.duration_days }))

    // 4. Insert exam record — columns match actual DB schema
    const examFields = extractionResult.fields
    const { data: examData, error: examError } = await supabaseAdmin
      .from('medical_exams')
      .insert({
        worker_id: workerId,
        company_id: companyId,
        exam_type: examType,
        exam_date: examFields.fecha || new Date().toISOString().split('T')[0],
        ips_name: examFields.eps,
        concept: restrictions.length > 0 ? 'apto_con_restricciones' : 'apto',
        file_url: fileUrl,
        restrictions: restrictions.length > 0 ? restrictions : null,
        recommendations: recommendations.length > 0 ? recommendations : null,
        extracted_data: extractionResult,
      })
      .select()
      .single()

    if (examError) {
      throw new Error(`Error insertando examen: ${examError.message}`)
    }

    // 5. Insert individual recommendations into detail table
    if (extractionResult.recommendations.length > 0) {
      const recommendationsToInsert = extractionResult.recommendations.map((r) => ({
        exam_id: examData.id,
        recommendation_text: r.text,
        type: r.type,
        duration_days: r.duration_days,
      }))

      const { error: recError } = await supabaseAdmin
        .from('medical_recommendations')
        .insert(recommendationsToInsert)

      if (recError) {
        console.error('Error insertando recomendaciones:', recError.message)
      }
    }

    return NextResponse.json({
      success: true,
      exam: examData,
      fields: extractionResult.fields,
      extracted: extractionResult.recommendations,
    })
  } catch (error: unknown) {
    console.error('Upload Error:', error)
    const message = error instanceof Error ? error.message : 'Internal Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
