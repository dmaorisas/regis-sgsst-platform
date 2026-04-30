// =========================================================
// Auth helper — verificar consents del usuario actual
// =========================================================
// Tarea: T-F15-007
// Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/27
//
// Devuelve la lista de `consent_type` que el usuario AÚN no ha
// aceptado. Si la lista incluye `'general'`, el middleware/UI debe
// forzar el modal Habeas Data antes de permitir cualquier otra
// interacción.
//
// Decisiones técnicas (R7):
//  - Trabajamos sobre `app_user_id` (public.users.id), no auth_uid:
//    `consents.user_id` apunta a public.users.
//  - "Aceptado" = existe fila accepted=true Y revoked_at IS NULL.
//    Si fue revocado, vuelve a aparecer como pendiente y la UI
//    pedirá renovación.
//  - Versión política se persiste pero NO bloquea: si `version_politica`
//    cambia (ej. 1.1) la UI puede pedir reaceptación; eso lo gobierna
//    el caller, este helper solo reporta presencia.
// =========================================================

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createLogger } from '@/lib/logger'

const log = createLogger({ module: 'auth:check-consents' })

export const ALL_CONSENT_TYPES = ['general', 'sensible', 'canales', 'internacional', 'ia'] as const

export type ConsentType = (typeof ALL_CONSENT_TYPES)[number]

export type CheckConsentsResult = {
  app_user_id: string
  accepted: ConsentType[]
  pending: ConsentType[]
  /** TRUE si falta el consent obligatorio mínimo (`general`). */
  blocksLogin: boolean
}

/**
 * Lista los consents pendientes del usuario logueado. Devuelve null
 * si no hay sesión activa.
 */
export async function checkConsentsForCurrentUser(
  appUserId: string,
): Promise<CheckConsentsResult | null> {
  const supabase = createSupabaseServerClient()

  const { data, error } = await supabase
    .from('consents')
    .select('consent_type, accepted, revoked_at')
    .eq('user_id', appUserId)
    .eq('accepted', true)
    .is('revoked_at', null)

  if (error) {
    log.error({ err: error, appUserId }, 'failed to read consents')
    return null
  }

  const accepted = new Set<ConsentType>()
  for (const row of (data ?? []) as Array<{ consent_type: string }>) {
    if ((ALL_CONSENT_TYPES as readonly string[]).includes(row.consent_type)) {
      accepted.add(row.consent_type as ConsentType)
    }
  }

  const acceptedArr = Array.from(accepted)
  const pending = ALL_CONSENT_TYPES.filter((t) => !accepted.has(t))

  return {
    app_user_id: appUserId,
    accepted: acceptedArr,
    pending,
    blocksLogin: !accepted.has('general'),
  }
}
