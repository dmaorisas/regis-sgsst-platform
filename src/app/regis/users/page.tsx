import { redirect } from 'next/navigation'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import { getUserModuleMap } from '@/lib/auth/get-module-access'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import Header from '@/components/dashboard/Header'
import UserManagementClient from './UserManagementClient'

export const dynamic = 'force-dynamic'

export default async function RegisUsersPage() {
  const user = await getUserWithRoles()
  if (!user) redirect('/login')

  // Restringido estrictamente a administradores Regis
  const isRegisAdmin = user.roleNames.includes('regis_admin')
  if (!isRegisAdmin) {
    redirect('/dashboard')
  }

  const moduleAccess = await getUserModuleMap(user)

  const orgId = user.roles[0]?.regis_org_id
  if (!orgId) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header user={user} homeHref="/regis/dashboard" moduleAccess={moduleAccess} />
        <main className="mx-auto max-w-3xl px-4 py-8">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            <h2 className="text-lg font-semibold">Sin organización asignada</h2>
            <p className="mt-1 text-sm">El usuario no tiene una organización Regis activa.</p>
          </div>
        </main>
      </div>
    )
  }

  // Cargar lista de empresas activas de esta organización para pasárselas al cliente
  const admin = getSupabaseAdminClient()
  const { data: companies, error } = await admin
    .from('companies')
    .select('id, razon_social, nit')
    .eq('regis_org_id', orgId)
    .is('deleted_at', null)
    .order('razon_social', { ascending: true })

  if (error || !companies) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header user={user} homeHref="/regis/dashboard" moduleAccess={moduleAccess} />
        <main className="mx-auto max-w-3xl px-4 py-8">
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
            <h2 className="text-lg font-semibold">Error al cargar las empresas</h2>
            <p className="mt-1 text-sm">
              {error?.message ?? 'Por favor intente de nuevo más tarde.'}
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header user={user} homeHref="/regis/dashboard" moduleAccess={moduleAccess} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Usuarios y Permisos</h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Administra los usuarios de tu organización Regis y gestiona las empresas asignadas a la
            cartera de cada consultor.
          </p>
        </div>
        <UserManagementClient companies={companies} currentUser={user} />
      </main>
    </div>
  )
}
