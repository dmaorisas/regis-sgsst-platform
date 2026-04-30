// =========================================================
// Middleware — refresca sesión Supabase + guard de rutas
// =========================================================
// Tarea: T-F1-018 / T-F1-019
// Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/24
//
// Responsabilidades:
//   1) Refrescar el access_token en cada request (lo hace
//      supabase.auth.getUser bajo @supabase/ssr).
//   2) Bloquear `/dashboard/*` y `/regis/*` si no hay sesión → /login.
//   3) Si ya hay sesión y el usuario va a /login → redirigir a la
//      home apropiada según rol.
//
// Decisión técnica (R7): el guard fino por rol (regis_admin para /regis/*)
// se hace en cada page Server Component leyendo `getUserWithRoles()` —
// el middleware sólo gatekeeper de "auth/no-auth" porque no tiene acceso
// fácil a la tabla `user_company_role` desde Edge sin duplicar lógica.
// =========================================================

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PREFIXES = ['/dashboard', '/regis']
const AUTH_PREFIXES = ['/login']

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({ request: { headers: req.headers } })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY
  if (!url || !key) {
    // Sin envars no podemos validar la sesión — dejamos pasar para no
    // generar 500s (la propia página fallará luego con un mensaje claro).
    return response
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        req.cookies.set({ name, value, ...options })
        response = NextResponse.next({ request: { headers: req.headers } })
        response.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        req.cookies.set({ name, value: '', ...options })
        response = NextResponse.next({ request: { headers: req.headers } })
        response.cookies.set({ name, value: '', ...options })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = req.nextUrl.pathname
  const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(p + '/'))
  const isAuthPage = AUTH_PREFIXES.some((p) => path === p || path.startsWith(p + '/'))

  if (!user && isProtected) {
    const redirect = req.nextUrl.clone()
    redirect.pathname = '/login'
    redirect.searchParams.set('next', path)
    return NextResponse.redirect(redirect)
  }

  if (user && isAuthPage) {
    const redirect = req.nextUrl.clone()
    redirect.pathname = '/dashboard'
    redirect.search = ''
    return NextResponse.redirect(redirect)
  }

  return response
}

export const config = {
  // Excluir activos estáticos y endpoints internos.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
