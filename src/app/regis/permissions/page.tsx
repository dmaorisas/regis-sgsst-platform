// ============================================================
// PROTECTED FILE — Do NOT modify without explicit user approval.
// Module: Permissions (Role-based access control configuration)
// See: memory/protection_permissions_module.md
// ============================================================

import { redirect } from 'next/navigation'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import { getPermissionsMatrix } from '@/lib/auth/get-module-access'
import Header from '@/components/dashboard/Header'
import PermissionsMatrixClient from './PermissionsMatrixClient'
import type { AccessLevel, ModuleKey } from '@/lib/auth/permissions-config'
import type { RoleName } from '@/lib/auth/get-user-with-roles'

export const dynamic = 'force-dynamic'

export default async function RegisPermissionsPage() {
  const user = await getUserWithRoles()
  if (!user) redirect('/login')
  if (!user.roleNames.includes('regis_admin')) redirect('/dashboard')

  const matrix = await getPermissionsMatrix(user)
  const moduleAccess = matrix[user.roleNames[0] ?? 'worker'] as Record<ModuleKey, AccessLevel>

  return (
    <div className="min-h-screen bg-slate-50">
      <Header user={user} homeHref="/regis/dashboard" moduleAccess={moduleAccess} />
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Permisos por rol</h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Configura el nivel de acceso a cada modulo para cada rol de tu organizacion.
          </p>
        </div>
        <PermissionsMatrixClient
          initialMatrix={matrix as Record<RoleName, Record<ModuleKey, AccessLevel>>}
        />
      </main>
    </div>
  )
}
