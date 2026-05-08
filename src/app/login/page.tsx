// =========================================================
// /login — Página de autenticación email + password
// =========================================================
// Tarea: T-F1-018
// Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/24
//
// Decisión (R7): email+password en vez de magic link. Razón: el demo
// del 6-may requiere que el jurado pueda loguearse instantáneamente
// (sin esperar email). Magic link queda declarado en Bucket B
// (post-concurso). Las credenciales de los 6 usuarios test están
// fijadas en `scripts/seed_test_users.ts` y documentadas para QA.
// =========================================================

import LoginForm from './login-form'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Ingreso · Regis SG-SST',
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string }
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-600 font-bold text-white">
            R
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Regis SG-SST</h1>
          <p className="mt-1 text-sm text-slate-600">
            Plataforma de cumplimiento Resolución 0312/2019
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="mb-1 text-lg font-semibold text-slate-900">Ingresar</h2>
          <p className="mb-6 text-sm text-slate-500">
            Usa tu correo corporativo y la contraseña asignada.
          </p>
          <LoginForm next={searchParams.next ?? null} initialError={searchParams.error ?? null} />
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          ¿Problemas para acceder? Contacta a{' '}
          <span className="font-medium text-slate-700">soporte@regiscolombia-demo.local</span>
        </p>

        <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-widest text-slate-400">
          REGIS PLATFORM v2.2-STABLE • 2026
        </p>
      </div>
    </div>
  )
}
