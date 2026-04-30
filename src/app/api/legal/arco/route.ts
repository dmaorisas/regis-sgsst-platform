// =========================================================
// POST /api/legal/arco — recibe solicitudes ARCO públicas
// =========================================================
// Tarea: T-F15-008
// Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/27
//
// Endpoint público (sin auth) que persiste una solicitud ARCO en la
// tabla `arco_requests` y notifica al supervisor por email.
//
// Decisiones técnicas (R7):
//   - Sin auth: el solicitante no necesariamente tiene cuenta.
//   - Validamos email con regex pragmático (no perfecto pero filtra
//     entradas obviamente inválidas).
//   - Calculamos SLA legal con businessDaysBetween (15 días hábiles
//     desde created_at, Decreto 1377 Art. 14).
//   - Persistimos primero; si la notificación falla, la solicitud
//     queda registrada (la auditoría no se pierde por un fallo de
//     Resend). El operador legal verá igual la fila en la cola.
//   - Usamos `getSupabaseAdminClient` (service_role) para bypassar
//     RLS en el INSERT — la política `insert_arco_public` permite
//     INSERT con sesión anónima, pero el bypass es defensivo si el
//     anon key no está cargado en el handler.
// =========================================================

import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import { parseIsoDate, addBusinessDays } from '@/lib/utils/colombian-business-days'
import { createLogger } from '@/lib/logger'

const log = createLogger({ module: 'api:legal:arco' })

const ALLOWED_TIPOS = ['acceso', 'rectificacion', 'cancelacion', 'oposicion', 'revocacion'] as const
type ArcoTipo = (typeof ALLOWED_TIPOS)[number]

type ArcoBody = {
  tipo: ArcoTipo
  email: string
  descripcion: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SLA_BUSINESS_DAYS = 15

function parseBody(input: unknown): ArcoBody | null {
  if (typeof input !== 'object' || input === null) return null
  const obj = input as Record<string, unknown>
  if (typeof obj.tipo !== 'string' || !(ALLOWED_TIPOS as readonly string[]).includes(obj.tipo)) {
    return null
  }
  if (typeof obj.email !== 'string' || !EMAIL_RE.test(obj.email)) return null
  if (typeof obj.descripcion !== 'string' || obj.descripcion.trim().length < 10) return null
  return {
    tipo: obj.tipo as ArcoTipo,
    email: obj.email.trim(),
    descripcion: obj.descripcion.trim(),
  }
}

function extractIp(req: Request): string | null {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) {
    const first = fwd.split(',')[0]
    return first ? first.trim() : null
  }
  const real = req.headers.get('x-real-ip')
  if (real) return real
  return null
}

export async function POST(req: Request): Promise<Response> {
  let body: ArcoBody
  try {
    const json = await req.json()
    const parsed = parseBody(json)
    if (!parsed) {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    }
    body = parsed
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const ip = extractIp(req)
  const userAgent = req.headers.get('user-agent') ?? null
  const supabase = getSupabaseAdminClient()

  const { data: inserted, error: insErr } = await supabase
    .from('arco_requests')
    .insert({
      tipo: body.tipo,
      email: body.email,
      descripcion: body.descripcion,
      ip_address: ip,
      user_agent: userAgent,
    })
    .select('id, created_at')
    .single()

  if (insErr || !inserted) {
    log.error({ err: insErr }, 'arco insert failed')
    return NextResponse.json({ error: 'persist_failed' }, { status: 500 })
  }

  const requestId = inserted.id as string
  const createdAtIso = inserted.created_at as string
  const todayIso = createdAtIso.slice(0, 10)
  const sla = computeSlaDeadline(todayIso)

  // Notificar supervisor — best-effort (no rompemos contrato si falla).
  await notifySupervisor({
    requestId,
    tipo: body.tipo,
    email: body.email,
    descripcion: body.descripcion,
    sla,
  })

  return NextResponse.json({
    ok: true,
    request_id: requestId,
    sla_business_days: SLA_BUSINESS_DAYS,
    sla_deadline: sla,
    message:
      `Tu solicitud de ${body.tipo} fue recibida. Tienes derecho a respuesta en máximo ` +
      `${SLA_BUSINESS_DAYS} días hábiles (Decreto 1377/2013 Art. 14). Plazo legal: ${sla}.`,
  })
}

function computeSlaDeadline(todayIso: string): string {
  try {
    const start = parseIsoDate(todayIso)
    const end = addBusinessDays(start, SLA_BUSINESS_DAYS)
    return end.toISOString().slice(0, 10)
  } catch (e) {
    log.warn({ err: e, todayIso }, 'sla calc failed; falling back to N/A')
    return 'N/A'
  }
}

async function notifySupervisor(params: {
  requestId: string
  tipo: ArcoTipo
  email: string
  descripcion: string
  sla: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  const to = process.env.SUPERVISOR_EMAIL
  if (!apiKey || !from || !to) {
    log.warn({ requestId: params.requestId }, 'resend env missing — skip supervisor email')
    return
  }
  try {
    const resend = new Resend(apiKey)
    const subject = `[Regis ARCO] Nueva solicitud ${params.tipo} (${params.requestId.slice(0, 8)})`
    const html =
      `<h2>Nueva solicitud ARCO</h2>` +
      `<p><strong>ID:</strong> ${escapeHtml(params.requestId)}</p>` +
      `<p><strong>Tipo:</strong> ${escapeHtml(params.tipo)}</p>` +
      `<p><strong>Email solicitante:</strong> ${escapeHtml(params.email)}</p>` +
      `<p><strong>SLA legal:</strong> ${escapeHtml(params.sla)}</p>` +
      `<p><strong>Descripción:</strong></p>` +
      `<blockquote>${escapeHtml(params.descripcion)}</blockquote>` +
      `<p>Atender desde el panel <code>/regis/arco</code>.</p>`
    const { error } = await resend.emails.send({ from, to, subject, html })
    if (error) {
      log.error({ requestId: params.requestId, err: error }, 'resend rejected supervisor email')
    } else {
      log.info({ requestId: params.requestId }, 'supervisor email sent')
    }
  } catch (e) {
    log.error({ err: e, requestId: params.requestId }, 'supervisor email threw')
  }
}

function escapeHtml(v: string): string {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
