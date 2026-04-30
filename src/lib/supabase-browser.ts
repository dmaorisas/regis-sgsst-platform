// =========================================================
// Supabase browser client (sesión vía cookies + window)
// =========================================================
// Cliente para Client Components ('use client'). Usa @supabase/ssr para
// que la sesión se lea de las mismas cookies que el server client.
//
// IMPORTANTE: solo usar las claves NEXT_PUBLIC_* aquí. Cualquier otra
// envar quedaría expuesta al bundle del cliente.
// =========================================================

import { createBrowserClient } from '@supabase/ssr'

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing — el código corre en el navegador y necesita las claves públicas.',
    )
  }
  return createBrowserClient(url, key)
}
