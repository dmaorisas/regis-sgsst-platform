// =========================================================
// POST /api/consent/accept — registra aceptación Habeas Data
// =========================================================
// Tarea: T-F15-007
// Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/27
//
// Recibe los 5 booleanos del modal de Habeas Data y persiste una
// fila por cada `consent_type` aceptado en `public.consents`.
//
// Decisiones técnicas (R7):
//  - El endpoint requiere sesión: 401 si no hay user.
//  - El consent `general` es obligatorio: si llega `false`, devuelve
//    400. La UI ofrece "Rechazar y salir" que NO llama este endpoint
//    sino que dispara signOut.
//  - El consent `sensible` es obligatorio para `worker`, opcional para
//    el resto. La validación rol-aware se hace aquí leyendo
//    getUserWithRoles().
//  - Persistimos la versión vigente del aviso de privacidad (v1.0,
//    fijada en `legal/aviso_privacidad.md`). Cambios futuros suben la
//    versión y vuelven a pedir aceptación.
//  - Capturamos IP (de x-forwarded-for cuando va detrás de Vercel) y
//    user-agent: ambos son evidencia probatoria del consentimiento.
// =========================================================

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import { ALL_CONSENT_TYPES, type ConsentType } from '@/lib/auth/check-consents'
import { createLogger } from '@/lib/logger'

const log = createLogger({ module: 'api:consent:accept' })

/** Versión vigente del aviso de privacidad. Sincronizada con `legal/aviso_privacidad.md`. */
const POLICY_VERSION = '1.0'

type ConsentBody = {
  general: boolean
  sensible: boolean
  canales: boolean
  internacional: boolean
  ia: boolean
}

function parseBody(input: unknown): ConsentBody | null {
  if (typeof input !== 'object' || input === null) return null
  const obj = input as Record<string, unknown>
  for (const k of ALL_CONSENT_TYPES) {
    if (typeof obj[k] !== 'boolean') return null
  }
  return obj as ConsentBody
}

export async function POST(req: Request): Promise<Response> {
  const user = await getUserWithRoles()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: ConsentBody
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

  if (!body.general) {
    return NextResponse.json({ error: 'general_consent_required' }, { status: 400 })
  }

  // El rol worker debe aceptar 'sensible' por Resolución 2346/2007.
  if (user.roleNames.includes('worker') && !body.sensible) {
    return NextResponse.json({ error: 'sensible_consent_required_for_worker' }, { status: 400 })
  }

  const ip = extractIp(req)
  const userAgent = req.headers.get('user-agent') ?? null
  const now = new Date().toISOString()
  const supabase = createSupabaseServerClient()

  const rows = ALL_CONSENT_TYPES.map((type: ConsentType) => ({
    user_id: user.app_user_id,
    consent_type: type,
    version_politica: POLICY_VERSION,
    accepted: body[type],
    accepted_at: body[type] ? now : null,
    ip_address: ip,
    user_agent: userAgent,
  }))

  const { error } = await supabase.from('consents').insert(rows)
  if (error) {
    log.error({ err: error, userId: user.app_user_id }, 'consents insert failed')
    return NextResponse.json({ error: 'persist_failed' }, { status: 500 })
  }

  log.info({ userId: user.app_user_id, version: POLICY_VERSION }, 'consents accepted')
  return NextResponse.json({ ok: true, policy_version: POLICY_VERSION, accepted_at: now })
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
