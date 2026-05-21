import { getBoss } from '@/lib/pg-boss'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import { getNotificationService } from '@/lib/notifications/service'
import { createLogger } from '@/lib/logger'

const log = createLogger({ module: 'jobs:check_equipment_expiry' })

let registered = false

/**
 * Registra el worker para verificar vencimientos de equipos de emergencia
 * y lo programa para que corra diariamente.
 */
export async function registerEquipmentExpiryWorker(): Promise<void> {
  if (registered) return

  try {
    const boss = await getBoss()

    // 1. Registrar el worker
    await boss.work('check_equipment_expiry', async () => {
      await runEquipmentExpiryCheck()
    })

    // 2. Programar el cron job para ejecutarse todos los días a las 8:00 AM
    await boss.schedule('check_equipment_expiry', '0 8 * * *')

    registered = true
    log.info('check_equipment_expiry worker registered and scheduled successfully')
  } catch (e) {
    log.error({ err: e }, 'failed to register check_equipment_expiry worker')
  }
}

/**
 * Lógica principal del cron job:
 * Consulta equipos cerca de vencer (<= 30 días) o vencidos, actualiza su estado,
 * y encola notificaciones por correo para los consultores asignados (máximo una vez cada 7 días).
 */
export async function runEquipmentExpiryCheck(): Promise<void> {
  const supabase = getSupabaseAdminClient()
  const notificationService = getNotificationService()

  const today = new Date()
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(today.getDate() + 30)

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(today.getDate() - 7)

  const expiryLimitStr = thirtyDaysFromNow.toISOString().slice(0, 10)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString()

  log.info({ expiryLimit: expiryLimitStr }, 'starting equipment expiry check')

  // Obtener equipos próximos a vencer o vencidos (por revision o vida util)
  const { data: equipments, error: eqErr } = await supabase
    .from('emergency_equipment')
    .select(
      `
      id,
      tipo,
      codigo_interno,
      fecha_vencimiento,
      fecha_vencimiento_vida_util,
      company_id,
      companies(razon_social),
      centro_id,
      centros_de_trabajo(nombre)
    `,
    )
    .or(`fecha_vencimiento.lte.${expiryLimitStr},fecha_vencimiento_vida_util.lte.${expiryLimitStr}`)

  if (eqErr) {
    log.error({ err: eqErr }, 'failed to fetch equipment for expiry check')
    throw eqErr
  }

  if (!equipments || equipments.length === 0) {
    log.info('no equipment near expiration found')
    return
  }

  for (const eq of equipments) {
    const reviewExpiry = new Date(eq.fecha_vencimiento)
    const vidaUtilExpiry = eq.fecha_vencimiento_vida_util
      ? new Date(eq.fecha_vencimiento_vida_util)
      : null
    const earliestExpiry =
      vidaUtilExpiry && vidaUtilExpiry < reviewExpiry ? vidaUtilExpiry : reviewExpiry
    const isOverdue = earliestExpiry <= today
    const newStatus = isOverdue ? 'vencido' : 'alerta_vencimiento'

    // 1. Actualizar el estado en la base de datos
    const { error: updErr } = await supabase
      .from('emergency_equipment')
      .update({ estado: newStatus })
      .eq('id', eq.id)

    if (updErr) {
      log.error({ err: updErr, equipment_id: eq.id }, 'failed to update equipment status')
      continue
    }

    // 2. Evitar spam: Verificar si ya se envió un correo de alerta en los últimos 7 días
    const { data: sentNotifs, error: notifErr } = await supabase
      .from('notifications')
      .select('id')
      .eq('template', 'equipment_expiry')
      .gte('created_at', sevenDaysAgoStr)
      .contains('payload', { equipment_id: eq.id })

    if (notifErr) {
      log.error({ err: notifErr, equipment_id: eq.id }, 'failed to check existing notifications')
      continue
    }

    if (sentNotifs && sentNotifs.length > 0) {
      log.debug({ equipment_id: eq.id }, 'notification already sent recently, skipping email')
      continue
    }

    // 3. Buscar consultores y administradores Regis asignados a la empresa o globales
    const { data: roles, error: roleErr } = await supabase
      .from('user_company_role')
      .select(
        `
        user_id,
        users(id, nombre, email),
        roles(nombre)
      `,
      )
      .eq('is_active', true)
      .or(`company_id.eq.${eq.company_id},company_id.is.null`)

    if (roleErr) {
      log.error(
        { err: roleErr, company_id: eq.company_id },
        'failed to fetch user roles for company',
      )
      continue
    }

    // Filtrar usuarios con rol de consultor o administrador Regis
    const consultants = (roles || [])
      .filter(
        (r: unknown) =>
          (r as Record<string, Record<string, string>>).roles?.nombre === 'regis_consultant' ||
          (r as Record<string, Record<string, string>>).roles?.nombre === 'regis_admin',
      )
      .map((r: unknown) => (r as Record<string, unknown>).users)
      .filter(Boolean)

    // Eliminar duplicados
    const uniqueConsultants = Array.from(
      new Map(consultants.map((c: unknown) => [(c as Record<string, unknown>).id, c])).values(),
    )

    if (uniqueConsultants.length === 0) {
      log.warn({ company_id: eq.company_id }, 'no active consultant/admin found for company')
      continue
    }

    // 4. Encolar notificación por correo
    const daysLeft = Math.ceil(
      (new Date(eq.fecha_vencimiento).getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    )
    const companyName =
      (eq.companies as unknown as Record<string, unknown>)?.razon_social || 'Empresa Cliente'
    const centroName =
      (eq.centros_de_trabajo as unknown as Record<string, unknown>)?.nombre || 'Sede Principal'

    for (const consultant of uniqueConsultants) {
      const user = consultant as Record<string, unknown>
      try {
        await notificationService.notify({
          recipient_id: user.id as string,
          channel: 'email',
          template: 'equipment_expiry',
          payload: {
            equipment_id: eq.id,
            consultant_name: user.nombre as string,
            company_name: companyName,
            centro_name: centroName,
            equipment_type: eq.tipo,
            equipment_code: eq.codigo_interno,
            expiry_date: eq.fecha_vencimiento,
            days_left: daysLeft,
            action_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000'}/dashboard/emergencies/inventory`,
          },
        })
        log.info(
          { equipment_id: eq.id, consultant_email: user.email },
          'expiry notification queued successfully',
        )
      } catch (e) {
        log.error(
          { err: e, equipment_id: eq.id, consultant_id: user.id },
          'failed to queue expiry notification',
        )
      }
    }
  }
}
