// =========================================================
// pg-boss worker: send_email (T-F15-005)
// =========================================================
// Procesa los jobs encolados por NotificationService cuando el
// canal es 'email'. Usa Resend; si Resend devuelve error o lanza,
// el worker re-lanza para que pg-boss aplique reintentos según
// la política por defecto de la cola.
//
// Decisión técnica (R7):
//  - Renderizamos el template aquí (lazy) en vez de en el caller,
//    para que un cambio en plantilla no obligue a re-encolar.
//  - El status final ('sent' / 'failed') queda persistido en la
//    misma tabla `notifications`. La razón de fallo se guarda en
//    `failure_reason` para auditoría.
//  - Si `RESEND_API_KEY` no existe, no levantamos worker — útil
//    en CI/tests.
// =========================================================

import { Resend } from 'resend'
import { getBoss } from '@/lib/pg-boss'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import { renderTemplate, type TemplateName } from '@/lib/notifications/templates'
import { createLogger } from '@/lib/logger'
import type { SendEmailJobData } from '@/lib/notifications/service'
import type { Job } from 'pg-boss'

const log = createLogger({ module: 'jobs:send_email' })

const KNOWN_TEMPLATES: TemplateName[] = [
  'welcome',
  'score_alert',
  'pm_snapshot',
  'equipment_expiry',
  'consultant_weekly_pending',
  'consultant_weekly_summary',
]

let registered = false

/**
 * Registra el worker en pg-boss. Idempotente: llamar varias veces
 * en el mismo proceso no duplica handlers (pg-boss .work() permite
 * múltiples consumidores, pero no necesitamos eso aquí).
 */
export async function registerSendEmailWorker(): Promise<void> {
  if (registered) {
    log.debug('worker already registered')
    return
  }

  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !fromEmail) {
    log.warn(
      { hasApiKey: Boolean(apiKey), hasFromEmail: Boolean(fromEmail) },
      'RESEND_API_KEY / RESEND_FROM_EMAIL missing — skipping worker registration',
    )
    return
  }

  const resend = new Resend(apiKey)
  const supabase = getSupabaseAdminClient()
  const boss = await getBoss()

  // pg-boss v12: .work(name, handler) recibe Job[] (batch). Procesamos uno a uno.
  await boss.work<SendEmailJobData>(
    'send_email',
    async (jobs: Job<SendEmailJobData>[] | Job<SendEmailJobData>) => {
      const list = Array.isArray(jobs) ? jobs : [jobs]
      for (const job of list) {
        await handleEmailJob(job, resend, fromEmail, supabase)
      }
    },
  )

  registered = true
  log.info('send_email worker registered')
}

async function handleEmailJob(
  job: Job<SendEmailJobData>,
  resend: Resend,
  fromEmail: string,
  supabase: ReturnType<typeof getSupabaseAdminClient>,
): Promise<void> {
  const { notification_id, to, template, payload } = job.data
  const childLog = log.child({ job_id: job.id, notification_id, template })

  if (!KNOWN_TEMPLATES.includes(template as TemplateName)) {
    const reason = `unknown template: ${template}`
    childLog.error(reason)
    await markFailed(supabase, notification_id, reason)
    throw new Error(reason)
  }

  let rendered: { subject: string; html: string }
  try {
    rendered = renderTemplate(template as TemplateName, payload as never)
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'render failed'
    childLog.error({ err: e }, 'template render failed')
    await markFailed(supabase, notification_id, reason)
    throw e
  }

  const { error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject: rendered.subject,
    html: rendered.html,
  })

  if (error) {
    childLog.error({ err: error }, 'resend rejected email')
    await markFailed(supabase, notification_id, error.message ?? 'resend error')
    throw new Error(error.message ?? 'resend error')
  }

  await supabase
    .from('notifications')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', notification_id)

  childLog.info('email sent')
}

async function markFailed(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  notification_id: string,
  reason: string,
): Promise<void> {
  await supabase
    .from('notifications')
    .update({ status: 'failed', failure_reason: reason.slice(0, 500) })
    .eq('id', notification_id)
}
