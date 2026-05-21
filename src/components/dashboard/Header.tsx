// =========================================================
// Header — barra superior de las páginas autenticadas
// =========================================================
// Muestra logo, nombre del usuario, su rol y el botón de signout.
// Es un Server Component — no necesita estado de cliente.
// =========================================================

import Link from 'next/link'
import type { AuthenticatedUser } from '@/lib/auth/get-user-with-roles'
import NotificationBell from '@/components/dashboard/NotificationBell'

const ROLE_LABEL: Record<string, string> = {
  regis_admin: 'Admin Regis',
  regis_consultant: 'Consultor Regis',
  client_admin: 'Admin Empresa',
  worker: 'Trabajador',
}

export default function Header({
  user,
  homeHref = '/dashboard',
}: {
  user: AuthenticatedUser
  homeHref?: string
}) {
  const primaryRole = user.roleNames[0] ?? 'worker'
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href={homeHref} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-sm font-bold text-white">
              R
            </div>
            <span className="hidden text-base font-semibold text-slate-900 sm:block">
              Regis SG-SST
            </span>
          </Link>

          <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
            <Link href="/dashboard" className="hover:text-sky-600">
              Dashboard
            </Link>
            <Link href="/dashboard/medical" className="hover:text-sky-600">
              Médico
            </Link>
            <Link href="/dashboard/matrices" className="hover:text-sky-600">
              Matrices GTC-45
            </Link>
            <Link href="/dashboard/actas" className="hover:text-sky-600">
              Actas
            </Link>
            <Link href="/dashboard/emergencies" className="hover:text-sky-600">
              Plan Emergencias
            </Link>
            <Link href="/dashboard/emergencies/inventory" className="hover:text-sky-600">
              Inventario
            </Link>
            <Link href="/dashboard/documents" className="hover:text-sky-600">
              Documentos
            </Link>
            <Link href="/dashboard/monthly-logs" className="hover:text-sky-600">
              Bitácora
            </Link>
            {user.isRegisStaff && (
              <Link
                href="/regis/dashboard"
                className="ml-4 border-l border-slate-300 pl-4 font-semibold text-sky-600 hover:text-sky-800"
              >
                ← Volver a Cartera
              </Link>
            )}
            {user.roleNames.includes('regis_admin') && (
              <>
                <Link
                  href="/regis/companies"
                  className="ml-4 border-l border-slate-300 pl-4 hover:text-sky-600"
                >
                  Empresas
                </Link>
                <Link
                  href="/regis/users"
                  className="ml-4 border-l border-slate-300 pl-4 hover:text-sky-600"
                >
                  Usuarios
                </Link>
              </>
            )}
            <Link href="/admin/pila-demo" className="ml-4 text-amber-600 hover:text-sky-600">
              Demo PILA
            </Link>
            <Link
              href="/dashboard/demo-automatizaciones"
              className="text-emerald-600 hover:text-emerald-800"
            >
              Automatizaciones
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-sm font-medium leading-tight text-slate-900">
              {user.nombre_completo}
            </div>
            <div className="text-xs leading-tight text-slate-500">
              {ROLE_LABEL[primaryRole] ?? primaryRole}
            </div>
          </div>
          {/* T-F15-004: bell icon con count de no-leídas */}
          <NotificationBell user={user} />
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
