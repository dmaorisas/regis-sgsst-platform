// =========================================================
// Header — barra superior de las páginas autenticadas
// =========================================================
// Muestra logo, nombre del usuario, su rol y el botón de signout.
// Es un Server Component — no necesita estado de cliente.
// =========================================================

import Link from 'next/link'
import type { AuthenticatedUser } from '@/lib/auth/get-user-with-roles'
import type { AccessLevel, ModuleKey } from '@/lib/auth/permissions-config'
import NotificationBell from '@/components/dashboard/NotificationBell'

const ROLE_LABEL: Record<string, string> = {
  regis_admin: 'Admin Regis',
  regis_consultant: 'Consultor Regis',
  client_admin: 'Admin Empresa',
  worker: 'Trabajador',
}

type NavItem = {
  moduleKey: ModuleKey
  href: string
  label: string
  className?: string
}

const EMPRESA_NAV: NavItem[] = [
  { moduleKey: 'dashboard', href: '/dashboard', label: 'Dashboard' },
  { moduleKey: 'medical', href: '/dashboard/medical', label: 'Medico' },
  { moduleKey: 'matrices', href: '/dashboard/matrices', label: 'Matrices GTC-45' },
  { moduleKey: 'actas', href: '/dashboard/actas', label: 'Actas' },
  { moduleKey: 'emergencies', href: '/dashboard/emergencies', label: 'Plan Emergencias' },
  { moduleKey: 'inventory', href: '/dashboard/emergencies/inventory', label: 'Inventario' },
  { moduleKey: 'documents', href: '/dashboard/documents', label: 'Documentos' },
  { moduleKey: 'monthly_logs', href: '/dashboard/monthly-logs', label: 'Bitacora' },
]

const REGIS_NAV: NavItem[] = [
  {
    moduleKey: 'portfolio',
    href: '/regis/dashboard',
    label: 'Cartera',
    className: 'font-semibold text-sky-600 hover:text-sky-800',
  },
  { moduleKey: 'companies', href: '/regis/companies', label: 'Empresas' },
  { moduleKey: 'users', href: '/regis/users', label: 'Usuarios' },
]

function canSee(access: Record<ModuleKey, AccessLevel> | undefined, key: ModuleKey): boolean {
  if (!access) return true
  return access[key] !== 'none'
}

export default function Header({
  user,
  homeHref = '/dashboard',
  moduleAccess,
}: {
  user: AuthenticatedUser
  homeHref?: string
  moduleAccess?: Record<ModuleKey, AccessLevel>
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
            {EMPRESA_NAV.filter((item) => canSee(moduleAccess, item.moduleKey)).map((item) => (
              <Link
                key={item.moduleKey}
                href={item.href}
                className={item.className ?? 'hover:text-sky-600'}
              >
                {item.label}
              </Link>
            ))}
            {user.isRegisStaff && (
              <>
                {REGIS_NAV.filter((item) => canSee(moduleAccess, item.moduleKey)).map((item, i) => (
                  <Link
                    key={item.moduleKey}
                    href={item.href}
                    className={`${i === 0 ? 'ml-4 border-l border-slate-300 pl-4' : ''} ${item.className ?? 'hover:text-sky-600'}`}
                  >
                    {i === 0 ? '<- ' : ''}
                    {item.label}
                  </Link>
                ))}
                {user.roleNames.includes('regis_admin') && (
                  <Link href="/regis/permissions" className="hover:text-sky-600">
                    Permisos
                  </Link>
                )}
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
