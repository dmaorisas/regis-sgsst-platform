import { headers } from 'next/headers'
import Header from '@/components/dashboard/Header'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import { getUserModuleMap } from '@/lib/auth/get-module-access'
import { moduleKeyFromPath } from '@/lib/auth/permissions-config'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserWithRoles()
  if (!user) redirect('/login')

  const moduleAccess = await getUserModuleMap(user)

  const pathname = headers().get('x-pathname') ?? ''
  const moduleKey = moduleKeyFromPath(pathname)
  if (moduleKey && moduleAccess[moduleKey] === 'none') {
    redirect(user.isRegisStaff ? '/regis/dashboard' : '/dashboard')
  }

  const readOnly = moduleKey ? moduleAccess[moduleKey] === 'view' : false

  return (
    <div className="flex min-h-screen flex-col bg-[#fbf8fa]" data-readonly={readOnly || undefined}>
      <Header user={user} moduleAccess={moduleAccess} />
      <main className="flex-1">{children}</main>
    </div>
  )
}
