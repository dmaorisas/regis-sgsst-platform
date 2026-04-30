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
        <Link href={homeHref} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-sm font-bold text-white">
            R
          </div>
          <span className="text-base font-semibold text-slate-900">Regis SG-SST</span>
        </Link>

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
