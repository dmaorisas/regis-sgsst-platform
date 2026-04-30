// =========================================================
// NotificationService (T-F15-004 + T-F15-005 + T-F15-006)
// =========================================================
// Punto único de entrega para in-app, email, whatsapp y sms.
//
// Flujo:
//   notify({ recipient_id, channel, template, payload })
//     1. Inserta fila en `public.notifications` con status='pending'
//     2. Según `channel`:
//        - in_app    → status='sent' inmediatamente; UI consulta
//        - email     → encola job pg-boss `send_email`
//        - whatsapp  → marca status='pending' (stub no envía)
//        - sms       → marca status='pending' (stub no envía)
//     3. Devuelve { id, status }.
//
// Decisión técnica (R7):
//  - Persistimos SIEMPRE primero; el envío real sucede asíncrono o
//    fuera de este servicio. Esto garantiza que no perdemos el
//    rastro auditable aunque pg-boss esté caído.
//  - El servicio NO renderiza templates: le pasa el payload entero
//    al worker de email para que renderice tarde y permita reintento.
//  - in_app marca 'sent' (no 'pending') porque el contrato es:
//    pending = aún no entregado al canal; sent = entregado / visible.
//    Para in_app, "entregado" = registrado en DB (la UI lo lee).
// =========================================================

import { SupabaseClient } from '@supabase/supabase-js'
import { getBoss } from '@/lib/pg-boss'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import { createLogger } from '@/lib/logger'

const log = createLogger({ module: 'notifications' })

export type NotificationChannel = 'in_app' | 'email' | 'whatsapp' | 'sms'

export type NotifyParams = {
  recipient_id: string
  channel: NotificationChannel
  template: string
  payload: Record<string, unknown>
}

export type NotificationRow = {
  id: string
  recipient_id: string
  channel: NotificationChannel
  template: string
  payload: Record<string, unknown>
  status: 'pending' | 'sent' | 'failed' | 'read'
  sent_at: string | null
  read_at: string | null
  failure_reason: string | null
  created_at: string
  updated_at: string
}

export type NotifyResult = { id: string; status: NotificationRow['status'] }

/** Payload que el worker `send_email` espera en `job.data`. */
export type SendEmailJobData = {
  notification_id: string
  to: string
  template: string
  payload: Record<string, unknown>
}

export class NotificationService {
  constructor(private readonly supabase: SupabaseClient) {}

  async notify(params: NotifyParams): Promise<NotifyResult> {
    const initialStatus: NotificationRow['status'] =
      params.channel === 'in_app' ? 'sent' : 'pending'

    const { data, error } = await this.supabase
      .from('notifications')
      .insert({
        recipient_id: params.recipient_id,
        channel: params.channel,
        template: params.template,
        payload: params.payload,
        status: initialStatus,
        sent_at: initialStatus === 'sent' ? new Date().toISOString() : null,
      })
      .select('id, status')
      .single()

    if (error || !data) {
      log.error({ err: error, params }, 'failed to insert notification row')
      throw new Error(`notifications insert failed: ${error?.message ?? 'unknown'}`)
    }

    const id = data.id as string

    if (params.channel === 'email') {
      // Resolver email del destinatario
      const { data: userRow, error: uErr } = await this.supabase
        .from('users')
        .select('email')
        .eq('id', params.recipient_id)
        .single()
      if (uErr || !userRow?.email) {
        log.error({ recipient_id: params.recipient_id, err: uErr }, 'recipient email not found')
        await this.markFailed(id, 'recipient email missing')
        return { id, status: 'failed' }
      }

      try {
        const boss = await getBoss()
        const jobData: SendEmailJobData = {
          notification_id: id,
          to: userRow.email as string,
          template: params.template,
          payload: params.payload,
        }
        await boss.send('send_email', jobData)
        log.info({ id, template: params.template }, 'email job enqueued')
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown'
        log.error({ id, err: e }, 'failed to enqueue email job')
        await this.markFailed(id, `enqueue failed: ${msg}`)
        return { id, status: 'failed' }
      }
    } else if (params.channel === 'whatsapp' || params.channel === 'sms') {
      log.info({ id, channel: params.channel }, 'channel is stubbed; left as pending')
    } else {
      // in_app — ya quedó marcado 'sent' arriba.
      log.debug({ id, recipient_id: params.recipient_id }, 'in-app notification stored')
    }

    return { id, status: initialStatus }
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('notifications')
      .update({ status: 'read', read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('recipient_id', userId)
    if (error) {
      log.error({ err: error, notificationId }, 'markAsRead failed')
      throw new Error(`mark-as-read failed: ${error.message}`)
    }
  }

  async listUnreadForUser(userId: string, limit = 20): Promise<NotificationRow[]> {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .in('status', ['pending', 'sent'])
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) {
      log.error({ err: error, userId }, 'listUnreadForUser failed')
      throw new Error(`list-unread failed: ${error.message}`)
    }
    return (data ?? []) as unknown as NotificationRow[]
  }

  async countUnreadForUser(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .in('status', ['pending', 'sent'])
    if (error) {
      log.error({ err: error, userId }, 'countUnreadForUser failed')
      return 0
    }
    return count ?? 0
  }

  private async markFailed(id: string, reason: string): Promise<void> {
    await this.supabase
      .from('notifications')
      .update({ status: 'failed', failure_reason: reason })
      .eq('id', id)
  }
}

// ---------- singleton helper ----------
let cached: NotificationService | null = null

/**
 * Singleton que usa el admin client (bypassa RLS). Útil desde
 * Server Actions, route handlers y workers de pg-boss.
 *
 * Para llamar desde Server Components con sesión del usuario,
 * instancia `new NotificationService(createSupabaseServerClient())`
 * directamente — RLS aplicará.
 */
export function getNotificationService(): NotificationService {
  if (cached) return cached
  cached = new NotificationService(getSupabaseAdminClient())
  return cached
}
