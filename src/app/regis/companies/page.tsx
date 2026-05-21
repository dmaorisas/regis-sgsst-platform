import { redirect } from 'next/navigation'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import { getUserModuleMap } from '@/lib/auth/get-module-access'
import Header from '@/components/dashboard/Header'
import CompanyManagementClient from './CompanyManagementClient'

export default async function RegisCompaniesPage() {
  const user = await getUserWithRoles()

  if (!user || !user.roleNames.includes('regis_admin')) {
    redirect('/login')
  }

  const moduleAccess = await getUserModuleMap(user)

  return (
    <div className="min-h-screen bg-slate-50">
      <Header user={user} homeHref="/regis/dashboard" moduleAccess={moduleAccess} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Empresas Cliente</h1>
          <p className="mt-1 text-sm text-slate-500">
            Administra las empresas asociadas a la organización consultora Regis.
          </p>
        </div>

        {/* Componente interactivo para crear/editar empresas */}
        <CompanyManagementClient />
      </main>
    </div>
  )
}
