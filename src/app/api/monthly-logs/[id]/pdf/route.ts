import { NextRequest, NextResponse } from 'next/server'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import { generateBitacoraPdf } from '@/lib/pdf/generate-bitacora-pdf'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserWithRoles()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()

    const { data: log, error } = await supabase
      .from('monthly_logs')
      .select('*, companies(razon_social)')
      .eq('id', params.id)
      .single()

    if (error || !log) {
      return NextResponse.json({ error: 'Bitacora no encontrada' }, { status: 404 })
    }

    if (!user.isRegisStaff && !user.companyIds.includes(log.company_id)) {
      return NextResponse.json({ error: 'Sin acceso a esta empresa' }, { status: 403 })
    }

    const companyName =
      (log.companies as { razon_social: string } | null)?.razon_social || 'Empresa'

    const pdfBytes = await generateBitacoraPdf({
      companyName,
      month: log.month,
      completedSummary: log.completed_summary,
      pendingSummary: log.pending_summary,
      nextMonthPlan: log.next_month_plan,
    })

    const filename = `bitacora-sgsst-${log.month}.pdf`

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBytes.length),
      },
    })
  } catch (error: unknown) {
    console.error('Error generando PDF de bitacora:', error)
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
