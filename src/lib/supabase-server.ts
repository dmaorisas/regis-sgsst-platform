// =========================================================
// Supabase server client (service_role)
// =========================================================
// Cliente "admin" para uso server-side. Bypassa RLS, usa la service role
// key. Solo debe importarse desde Infrastructure / Application layers,
// NUNCA desde Domain ni desde código que se envíe al navegador.
//
// Carga .env.local explícitamente — algunos contextos (vitest, scripts
// node) no lo hacen automáticamente.
// =========================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'
import path from 'node:path'

loadEnv({ path: path.resolve(process.cwd(), '.env.local') })

let cached: SupabaseClient | null = null

export function getSupabaseServerClient(): SupabaseClient {
  if (cached) return cached

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing — check .env.local')
  }

  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return cached
}
