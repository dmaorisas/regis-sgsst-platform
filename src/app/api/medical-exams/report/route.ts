import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { generateGTHF56Report } from '@/lib/pdf/generate-report'
import type { ExtractedExamFields, ExtractedRecommendation } from '@/lib/ai/medical-extractor'

export const maxDuration = 30

/**
 * POST /api/medical-exams/report
 * Body: { fields: ExtractedExamFields, recommendations: ExtractedRecommendation[] }
 * Returns: PDF binary (application/pdf)
 */
export async function POST(req: NextRequest) {
  try {
    // Auth check
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const fields: ExtractedExamFields = body.fields || {}
    const recommendations: ExtractedRecommendation[] = body.recommendations || []

    const pdfBytes = await generateGTHF56Report({ fields, recommendations })

    const workerName = (fields.nombre_trabajador || 'trabajador').replace(/\s+/g, '_')
    const fileName = `GTH-F-56_${workerName}_${new Date().toISOString().slice(0, 10)}.pdf`

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(pdfBytes.length),
      },
    })
  } catch (error: unknown) {
    console.error('Report generation error:', error)
    const message = error instanceof Error ? error.message : 'Error generando reporte'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
