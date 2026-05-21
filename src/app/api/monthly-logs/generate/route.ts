import { NextRequest, NextResponse } from 'next/server'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import { MonthlyLogGenerator } from '@/lib/ai/monthly-log-generator'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const user = await getUserWithRoles()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { companyId, month } = body

    if (!companyId || !month) {
      return NextResponse.json({ error: 'Falta companyId o month (YYYY-MM)' }, { status: 400 })
    }

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'Formato de mes invalido. Use YYYY-MM' }, { status: 400 })
    }

    if (!user.companyIds.includes(companyId) && !user.isRegisStaff) {
      return NextResponse.json({ error: 'No tienes acceso a esta empresa' }, { status: 403 })
    }

    const adminSupabase = getSupabaseAdminClient()
    const generator = new MonthlyLogGenerator()

    const generatedData = await generator.generate(companyId, month, adminSupabase)

    const { data: existing } = await adminSupabase
      .from('monthly_logs')
      .select('id')
      .eq('company_id', companyId)
      .eq('month', month)
      .maybeSingle()

    let result
    if (existing) {
      result = await adminSupabase
        .from('monthly_logs')
        .update({
          completed_summary: generatedData.completed_summary,
          pending_summary: generatedData.pending_summary,
          next_month_plan: generatedData.next_month_plan,
          ia_metadata: {
            regenerated_at: new Date().toISOString(),
            regenerated_by: user.app_user_id,
          },
        })
        .eq('id', existing.id)
        .select()
        .single()
    } else {
      result = await adminSupabase
        .from('monthly_logs')
        .insert({
          company_id: companyId,
          month,
          completed_summary: generatedData.completed_summary,
          pending_summary: generatedData.pending_summary,
          next_month_plan: generatedData.next_month_plan,
          ia_metadata: {
            generated_at: new Date().toISOString(),
            generated_by: user.app_user_id,
          },
        })
        .select()
        .single()
    }

    if (result.error) {
      throw result.error
    }

    return NextResponse.json({
      success: true,
      log: result.data,
    })
  } catch (error: unknown) {
    console.error('Error generando bitacora mensual:', error)
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
