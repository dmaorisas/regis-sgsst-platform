// =========================================================
// Supabase server client (con cookies / sesión)
// =========================================================
// Cliente para Server Components, Server Actions y Route Handlers en
// Next.js 14 App Router. Usa @supabase/ssr (reemplazo oficial de
// @supabase/auth-helpers-nextjs, deprecado a partir de oct 2024).
//
// Lee la sesión del usuario desde cookies y respeta RLS — al revés del
// admin client en `supabase-admin.ts` que usa service_role y bypassa RLS.
//
// IMPORTANTE: este módulo se importa SÓLO desde código server-side
// (page.tsx con `export default async`, route.ts, server actions). Si
// se importa desde un Client Component, Next romperá el build.
//
// Decisión técnica (R7):
//  - Para mantener compat con scripts/tests que también importan
//    `getSupabaseServerClient`, ese nombre se exporta desde
//    `supabase-admin.ts`. Aquí exponemos `createSupabaseServerClient`
//    (con cookies). Cualquier nuevo código server con auth debe usar
//    este, no el admin.
// =========================================================

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createSupabaseServerClient() {
  const cookieStore = cookies()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing — check .env.local',
    )
  }

  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch {
          // `set` puede llamarse desde un Server Component (read-only).
          // El middleware ya refresca la sesión, así que es seguro
          // ignorar el throw aquí.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch {
          // ver comentario arriba
        }
      },
    },
  })
}
