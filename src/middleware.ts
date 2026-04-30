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
/** Rutas que un usuario sin consent SÍ puede usar (formulario consent + signout + legal públicos). */
const CONSENT_BYPASS_PREFIXES = ['/auth/consent', '/api/consent', '/api/auth/signout', '/legal']

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

  // ---------------------------------------------------------
  // Habeas Data (T-F15-007): si hay sesión y el usuario no aceptó
  // el consent `general`, forzamos /auth/consent. Solo aplicamos
  // sobre rutas protegidas — las páginas legales y el endpoint de
  // accept se exceptúan para evitar loops.
  // ---------------------------------------------------------
  if (user && isProtected) {
    const isBypass = CONSENT_BYPASS_PREFIXES.some((p) => path === p || path.startsWith(p + '/'))
    if (!isBypass) {
      const hasConsent = await userHasGeneralConsent(supabase, user.id, user.email ?? '')
      if (!hasConsent) {
        const redirect = req.nextUrl.clone()
        redirect.pathname = '/auth/consent'
        redirect.search = ''
        return NextResponse.redirect(redirect)
      }
    }
  }

  return response
}

/**
 * Verifica si el usuario actual aceptó el consent `general` y NO lo
 * revocó. Resuelve `auth_uid` → `public.users.id` por email (es el
 * mismo email en ambas tablas tras `ensure_user_synced`). Si la
 * consulta falla, devolvemos TRUE (degradado seguro: preferimos no
 * bloquear al usuario en caso de error transitorio que poner falsos
 * positivos al modal).
 */
async function userHasGeneralConsent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  authUid: string,
  email: string,
): Promise<boolean> {
  try {
    // Resolver app_user_id vía RPC ensure_user_synced (idempotente).
    const { data: appUserId } = await supabase.rpc('ensure_user_synced', {
      p_auth_uid: authUid,
      p_email: email,
      p_nombre_completo: null,
    })
    if (!appUserId) return true

    const { data, error } = await supabase
      .from('consents')
      .select('id')
      .eq('user_id', appUserId)
      .eq('consent_type', 'general')
      .eq('accepted', true)
      .is('revoked_at', null)
      .limit(1)

    if (error) return true
    return Array.isArray(data) && data.length > 0
  } catch {
    // Cualquier excepción en Edge runtime → no bloqueamos.
    return true
  }
}

export const config = {
  // Excluir activos estáticos y endpoints internos.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
