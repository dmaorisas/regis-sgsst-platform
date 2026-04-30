// =========================================================
// Supabase admin client (service_role)
// =========================================================
// Cliente "admin" para uso server-side. Bypassa RLS, usa la service role
// key. Solo debe importarse desde Infrastructure / Application layers,
// scripts y tareas n8n / cron, NUNCA desde Domain ni desde código que se
// envíe al navegador.
//
// Reemplaza al antiguo `src/lib/supabase-server.ts` (renombrado al
// introducir Auth: con Bloque 4B `supabase-server.ts` ahora aloja al
// cliente con cookies/sesión via @supabase/ssr).
// =========================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'
import path from 'node:path'

loadEnv({ path: path.resolve(process.cwd(), '.env.local') })

let cached: SupabaseClient | null = null

export function getSupabaseAdminClient(): SupabaseClient {
  if (cached) return cached

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing — check .env.local')
  }

  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return cached
}

/**
 * Backwards-compat alias. Algunas piezas del código (tests, scripts) lo
 * importan con su nombre histórico. Mantenemos para idempotencia mientras
 * migramos llamadas. Nuevos usos → `getSupabaseAdminClient`.
 */
export const getSupabaseServerClient = getSupabaseAdminClient
