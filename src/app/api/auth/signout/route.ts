// =========================================================
// POST /api/auth/signout — cierra la sesión y redirige a /login
// =========================================================
// Tarea: T-F1-018
// Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/24
//
// Endpoint usado por el botón "Cerrar sesión" del Header. Permite que
// el logout se haga desde un Server Component vía un <form action="">
// (sin necesidad de un Client Component).
// =========================================================

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 })
}

// GET también — algunos clientes (curl, debugging) lo invocan.
export async function GET(request: Request) {
  return POST(request)
}
