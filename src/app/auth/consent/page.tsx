// =========================================================
// /auth/consent — Página dedicada que aloja el modal Habeas Data
// =========================================================
// Tarea: T-F15-007
// Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/27
//
// El middleware redirige aquí cuando un usuario logueado aún no ha
// aceptado el consent `general`. Si ya lo aceptó, redirigimos a
// /dashboard inmediatamente — evita loops si el usuario navega
// manualmente a la URL.
// =========================================================

import { redirect } from 'next/navigation'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import { checkConsentsForCurrentUser } from '@/lib/auth/check-consents'
import ConsentModal from '@/components/auth/ConsentModal'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Habeas Data · Regis SG-SST',
}

export default async function ConsentPage() {
  const user = await getUserWithRoles()
  if (!user) redirect('/login')

  const consents = await checkConsentsForCurrentUser(user.app_user_id)
  if (consents && !consents.blocksLogin) {
    redirect('/dashboard')
  }

  const isWorker = user.roleNames.includes('worker')

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <ConsentModal isWorker={isWorker} />
    </div>
  )
}
