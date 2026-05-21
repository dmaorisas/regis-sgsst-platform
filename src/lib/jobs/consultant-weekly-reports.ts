import { getBoss } from '@/lib/pg-boss'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import { getNotificationService } from '@/lib/notifications/service'
import { createLogger } from '@/lib/logger'

const log = createLogger({ module: 'jobs:consultant_weekly_reports' })

let registeredPending = false
let registeredSummary = false

/**
 * Retorna el lunes de la semana actual a las 00:00:00
 */
export function getMondayOfThisWeek(): Date {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday
}

/**
 * Registra el worker para el reporte semanal de pendientes de los lunes
 */
export async function registerConsultantWeeklyPendingWorker(): Promise<void> {
  if (registeredPending) return

  try {
    const boss = await getBoss()

    await boss.work('consultant_weekly_pending', async () => {
      await runConsultantWeeklyPending()
    })

    // Programar para ejecutarse todos los lunes a las 8:00 AM
    await boss.schedule('consultant_weekly_pending', '0 8 * * 1')

    registeredPending = true
    log.info('consultant_weekly_pending worker registered and scheduled successfully')
  } catch (e) {
    log.error({ err: e }, 'failed to register consultant_weekly_pending worker')
  }
}

/**
 * Registra el worker para el balance semanal de los viernes
 */
export async function registerConsultantWeeklySummaryWorker(): Promise<void> {
  if (registeredSummary) return

  try {
    const boss = await getBoss()

    await boss.work('consultant_weekly_summary', async () => {
      await runConsultantWeeklySummary()
    })

    // Programar para ejecutarse todos los viernes a las 5:00 PM
    await boss.schedule('consultant_weekly_summary', '0 17 * * 5')

    registeredSummary = true
    log.info('consultant_weekly_summary worker registered and scheduled successfully')
  } catch (e) {
    log.error({ err: e }, 'failed to register consultant_weekly_summary worker')
  }
}

/**
 * Obtiene la lista de consultores/administradores Regis y sus empresas asignadas
 */
async function getConsultantsWithCompanies() {
  const supabase = getSupabaseAdminClient()

  // Buscar todos los roles de consultor o admin activos
  const { data: rolesData, error: rolesErr } = await supabase
    .from('user_company_role')
    .select(
      `
      user_id,
      company_id,
      regis_org_id,
      users:users!user_company_role_user_id_fkey (
        id,
        nombre_completo,
        email
      ),
      roles (
        nombre
      )
    `,
    )
    .eq('is_active', true)

  if (rolesErr) {
    log.error({ err: rolesErr }, 'failed to fetch user company roles')
    throw rolesErr
  }

  const activeRoles = (rolesData || []).filter((r: unknown) => {
    const role = r as Record<string, unknown>
    const roles = role.roles as Record<string, string> | undefined
    return (
      role.users && roles && (roles.nombre === 'regis_consultant' || roles.nombre === 'regis_admin')
    )
  })

  const userMap = new Map<
    string,
    {
      user: { id: string; nombre: string; email: string }
      companyIds: Set<string>
      globalOrgs: Set<string>
    }
  >()

  for (const role of activeRoles) {
    const userId = role.user_id
    const user = role.users
    if (!user) continue

    if (!userMap.has(userId)) {
      userMap.set(userId, {
        user: { id: user.id, nombre: user.nombre_completo as string, email: user.email as string },
        companyIds: new Set<string>(),
        globalOrgs: new Set<string>(),
      })
    }

    const entry = userMap.get(userId)!
    if (role.company_id) {
      entry.companyIds.add(role.company_id)
    } else if (role.regis_org_id) {
      entry.globalOrgs.add(role.regis_org_id)
    }
  }

  const result: Array<{
    user: { id: string; nombre: string; email: string }
    companies: Array<{ id: string; razon_social: string }>
  }> = []

  for (const entry of userMap.values()) {
    const finalCompanies: Array<{ id: string; razon_social: string }> = []

    // Si tiene acceso global a alguna organización, traer todas sus empresas
    if (entry.globalOrgs.size > 0) {
      const { data: orgCompanies } = await supabase
        .from('companies')
        .select('id, razon_social')
        .in('regis_org_id', Array.from(entry.globalOrgs))
      if (orgCompanies) {
        for (const c of orgCompanies) {
          if (!finalCompanies.some((fc) => fc.id === c.id)) {
            finalCompanies.push({ id: c.id, razon_social: c.razon_social as string })
          }
        }
      }
    }

    // Traer empresas específicas asignadas
    const remainingIds = Array.from(entry.companyIds).filter(
      (id) => !finalCompanies.some((fc) => fc.id === id),
    )
    if (remainingIds.length > 0) {
      const { data: specificCompanies } = await supabase
        .from('companies')
        .select('id, razon_social')
        .in('id', remainingIds)
      if (specificCompanies) {
        for (const c of specificCompanies) {
          finalCompanies.push({ id: c.id, razon_social: c.razon_social as string })
        }
      }
    }

    if (finalCompanies.length > 0) {
      result.push({
        user: entry.user,
        companies: finalCompanies,
      })
    }
  }

  return result
}

/**
 * Lógica del Lunes: Reporte de Pendientes
 */
export async function runConsultantWeeklyPending(): Promise<void> {
  log.info('starting runConsultantWeeklyPending')
  const supabase = getSupabaseAdminClient()
  const notificationService = getNotificationService()

  const consultants = await getConsultantsWithCompanies()
  log.info({ count: consultants.length }, 'consultants with assigned companies found')

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000'
  const dashboardUrl = `${baseUrl}/regis/dashboard`

  for (const { user, companies } of consultants) {
    log.info(
      { consultant: user.email, companyCount: companies.length },
      'processing monday pending report',
    )

    const rowsHtml: string[] = []

    for (const company of companies) {
      // 1. Estándares pendientes o no cumple
      const { count: pendingStandards } = await supabase
        .from('standard_evaluations')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .in('status', ['pendiente', 'no_cumple'])

      // 2. Documentos pendientes o en revisión
      const { count: pendingDocs } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .in('status', ['pending', 'in_review'])

      // 3. Equipos de emergencia vencidos o en alerta
      const { count: warningEquipments } = await supabase
        .from('emergency_equipment')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .in('estado', ['vencido', 'alerta_vencimiento'])

      const stds = pendingStandards ?? 0
      const docs = pendingDocs ?? 0
      const eqps = warningEquipments ?? 0

      // Si no tiene ningún pendiente, mostrar un badge verde impecable
      const stdsBadge =
        stds > 0
          ? `<span style="display:inline-block; padding:4px 10px; background-color:#fef3c7; color:#d97706; border-radius:12px; font-weight:600; font-size:12px">${stds} pendientes</span>`
          : `<span style="display:inline-block; padding:4px 10px; background-color:#dcfce7; color:#15803d; border-radius:12px; font-weight:600; font-size:12px">Al día</span>`

      const docsBadge =
        docs > 0
          ? `<span style="display:inline-block; padding:4px 10px; background-color:#e0f2fe; color:#0369a1; border-radius:12px; font-weight:600; font-size:12px">${docs} revisiones</span>`
          : `<span style="display:inline-block; padding:4px 10px; background-color:#dcfce7; color:#15803d; border-radius:12px; font-weight:600; font-size:12px">Al día</span>`

      const eqpsBadge =
        eqps > 0
          ? `<span style="display:inline-block; padding:4px 10px; background-color:#fee2e2; color:#dc2626; border-radius:12px; font-weight:600; font-size:12px">${eqps} alertas</span>`
          : `<span style="display:inline-block; padding:4px 10px; background-color:#dcfce7; color:#15803d; border-radius:12px; font-weight:600; font-size:12px">Al día</span>`

      rowsHtml.push(`
        <tr style="border-bottom: 1px solid #f1f5f9">
          <td style="padding: 14px 12px; font-size: 14px; font-weight: 500; color: #1e293b">${company.razon_social}</td>
          <td style="padding: 14px 12px; text-align: center">${stdsBadge}</td>
          <td style="padding: 14px 12px; text-align: center">${docsBadge}</td>
          <td style="padding: 14px 12px; text-align: center">${eqpsBadge}</td>
        </tr>
      `)
    }

    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0">
            <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600; color: #475569">Empresa Cliente</th>
            <th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 600; color: #475569">Autoevaluación</th>
            <th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 600; color: #475569">Gestión Documental</th>
            <th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 600; color: #475569">Equipos Emergencia</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml.join('')}
        </tbody>
      </table>
    `

    try {
      await notificationService.notify({
        recipient_id: user.id,
        channel: 'email',
        template: 'consultant_weekly_pending',
        payload: {
          consultant_name: user.nombre,
          companies_table_html: tableHtml,
          dashboard_url: dashboardUrl,
        },
      })
      log.info({ consultant_email: user.email }, 'monday pending report queued successfully')
    } catch (e) {
      log.error({ err: e, consultant_id: user.id }, 'failed to queue monday pending report')
    }
  }
}

/**
 * Lógica del Viernes: Balance Semanal
 */
export async function runConsultantWeeklySummary(): Promise<void> {
  log.info('starting runConsultantWeeklySummary')
  const supabase = getSupabaseAdminClient()
  const notificationService = getNotificationService()

  const consultants = await getConsultantsWithCompanies()
  log.info({ count: consultants.length }, 'consultants with assigned companies found')

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000'
  const dashboardUrl = `${baseUrl}/regis/dashboard`

  const monday = getMondayOfThisWeek()
  const mondayStr = monday.toISOString()

  for (const { user, companies } of consultants) {
    log.info(
      { consultant: user.email, companyCount: companies.length },
      'processing friday summary balance',
    )

    const rowsHtml: string[] = []

    for (const company of companies) {
      // --- COMPLETADOS EN LA SEMANA (DESDE EL LUNES A LAS 00:00) ---

      // 1. Estándares completados (cumple o no_aplica) y actualizados en la semana
      const { count: completedStandards } = await supabase
        .from('standard_evaluations')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .in('status', ['cumple', 'no_aplica'])
        .gte('updated_at', mondayStr)

      // 2. Documentos aprobados en la semana
      const { count: completedDocs } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .eq('status', 'approved')
        .gte('approved_at', mondayStr)

      // --- ABIERTOS / PENDIENTES ACTUALES ---

      // 3. Estándares que siguen pendientes o no cumple
      const { count: openStandards } = await supabase
        .from('standard_evaluations')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .in('status', ['pendiente', 'no_cumple'])

      // 4. Documentos por revisar (pending o in_review)
      const { count: openDocs } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .in('status', ['pending', 'in_review'])

      // 5. Equipos en alerta o vencidos
      const { count: openEquipments } = await supabase
        .from('emergency_equipment')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .in('estado', ['vencido', 'alerta_vencimiento'])

      const compStd = completedStandards ?? 0
      const compDoc = completedDocs ?? 0
      const openStd = openStandards ?? 0
      const openDoc = openDocs ?? 0
      const openEqp = openEquipments ?? 0

      // Badges para completados (verde si > 0, gris si 0)
      const compStdBadge =
        compStd > 0
          ? `<span style="color:#16a34a; font-weight:700">+${compStd}</span>`
          : `<span style="color:#94a3b8">-</span>`

      const compDocBadge =
        compDoc > 0
          ? `<span style="color:#16a34a; font-weight:700">+${compDoc}</span>`
          : `<span style="color:#94a3b8">-</span>`

      // Badges para abiertos (color según el caso)
      const openStdBadge =
        openStd > 0
          ? `<span style="display:inline-block; padding:2px 8px; background-color:#fef3c7; color:#d97706; border-radius:10px; font-weight:600; font-size:12px">${openStd}</span>`
          : `<span style="color:#16a34a; font-weight:600">✓</span>`

      const openDocBadge =
        openDoc > 0
          ? `<span style="display:inline-block; padding:2px 8px; background-color:#e0f2fe; color:#0369a1; border-radius:10px; font-weight:600; font-size:12px">${openDoc}</span>`
          : `<span style="color:#16a34a; font-weight:600">✓</span>`

      const openEqpBadge =
        openEqp > 0
          ? `<span style="display:inline-block; padding:2px 8px; background-color:#fee2e2; color:#dc2626; border-radius:10px; font-weight:600; font-size:12px">${openEqp}</span>`
          : `<span style="color:#16a34a; font-weight:600">✓</span>`

      rowsHtml.push(`
        <tr style="border-bottom: 1px solid #f1f5f9">
          <td style="padding: 14px 12px; font-size: 14px; font-weight: 500; color: #1e293b">${company.razon_social}</td>
          <td style="padding: 14px 12px; text-align: center; border-left: 1px solid #f1f5f9">${compStdBadge}</td>
          <td style="padding: 14px 12px; text-align: center; border-right: 1px solid #f1f5f9">${compDocBadge}</td>
          <td style="padding: 14px 12px; text-align: center">${openStdBadge}</td>
          <td style="padding: 14px 12px; text-align: center">${openDocBadge}</td>
          <td style="padding: 14px 12px; text-align: center">${openEqpBadge}</td>
        </tr>
      `)
    }

    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0">
            <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600; color: #475569" rowspan="2">Empresa Cliente</th>
            <th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 600; color: #16a34a; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0" colspan="2">Completado esta semana</th>
            <th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 600; color: #d97706" colspan="3">Abierto / Pendiente</th>
          </tr>
          <tr style="background-color: #f8fafc; border-bottom: 1.5px solid #e2e8f0">
            <th style="padding: 8px; text-align: center; font-size: 11px; font-weight: 600; color: #64748b; border-left: 1px solid #e2e8f0">Estándares</th>
            <th style="padding: 8px; text-align: center; font-size: 11px; font-weight: 600; color: #64748b; border-right: 1px solid #e2e8f0">Docs Aprobados</th>
            <th style="padding: 8px; text-align: center; font-size: 11px; font-weight: 600; color: #64748b">Estándares</th>
            <th style="padding: 8px; text-align: center; font-size: 11px; font-weight: 600; color: #64748b">Docs</th>
            <th style="padding: 8px; text-align: center; font-size: 11px; font-weight: 600; color: #64748b">Equipos</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml.join('')}
        </tbody>
      </table>
    `

    try {
      await notificationService.notify({
        recipient_id: user.id,
        channel: 'email',
        template: 'consultant_weekly_summary',
        payload: {
          consultant_name: user.nombre,
          companies_table_html: tableHtml,
          dashboard_url: dashboardUrl,
        },
      })
      log.info({ consultant_email: user.email }, 'friday summary report queued successfully')
    } catch (e) {
      log.error({ err: e, consultant_id: user.id }, 'failed to queue friday summary report')
    }
  }
}
