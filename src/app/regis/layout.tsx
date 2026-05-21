// ============================================================
// PROTECTED FILE — Do NOT modify without explicit user approval.
// Module: Permissions (Role-based access control configuration)
// See: memory/protection_permissions_module.md
// ============================================================

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import { getUserModuleMap } from '@/lib/auth/get-module-access'
import { moduleKeyFromPath } from '@/lib/auth/permissions-config'

export default async function RegisLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserWithRoles()
  if (!user) redirect('/login')

  const moduleAccess = await getUserModuleMap(user)

  const pathname = headers().get('x-pathname') ?? ''
  const moduleKey = moduleKeyFromPath(pathname)

  if (moduleKey && moduleAccess[moduleKey] === 'none') {
    redirect('/dashboard')
  }

  return <>{children}</>
}
