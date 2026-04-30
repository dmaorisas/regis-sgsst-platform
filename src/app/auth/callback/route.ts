// =========================================================
// GET /auth/callback — endpoint OAuth / magic link
// =========================================================
// Tarea: T-F1-018
// Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/24
//
// Reservado para flujos futuros (magic link, OAuth de Google). Para
// el demo del concurso usamos email+password (login-form.tsx) que NO
// pasa por aquí.
//
// Decisión (R7): Lo dejamos creado porque si en Bucket B se activa
// magic link, basta con apuntar `emailRedirectTo` a esta URL — no hay
// que tocar la estructura del proyecto.
// =========================================================

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      const redirect = new URL('/login', request.url)
      redirect.searchParams.set('error', error.message)
      return NextResponse.redirect(redirect)
    }
  }

  return NextResponse.redirect(new URL(next, request.url))
}
