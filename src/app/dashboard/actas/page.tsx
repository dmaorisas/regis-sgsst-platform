// ============================================================
// PROTECTED FILE — Do NOT modify without explicit user approval.
// Module: Actas (Comites y Actas de Reunion)
// See: memory/protection_actas_module.md
// ============================================================
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import Link from 'next/link'
import ActasDashboard from './ActasDashboard'

export const dynamic = 'force-dynamic'

export default async function ActasPage() {
  const user = await getUserWithRoles()
  if (!user) redirect('/login')

  if (user.companyIds.length === 0 && !user.isRegisStaff) {
    return (
      <div className="p-8 text-center font-semibold text-red-500">
        Error: No tienes una empresa asignada.
      </div>
    )
  }

  let companyId = user.companyIds[0]
  if (user.isRegisStaff) {
    const selectedCompanyId = cookies().get('selected_company_id')?.value
    if (!selectedCompanyId) {
      redirect('/regis/dashboard')
    }
    companyId = selectedCompanyId
  }

  if (!companyId) {
    return (
      <div className="p-8 text-center font-semibold text-red-500">
        Error: Empresa no determinada.
      </div>
    )
  }

  const adminSupabase = getSupabaseAdminClient()

  // 1. Cargar datos de la empresa
  const { data: company } = await adminSupabase
    .from('companies')
    .select('razon_social')
    .eq('id', companyId)
    .single()

  // 2. Cargar centros de trabajo de la empresa para la gestión de comités
  const { data: centros, error: ctErr } = await adminSupabase
    .from('centros_de_trabajo')
    .select('id, nombre')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('nombre', { ascending: true })

  if (ctErr) {
    console.error('Error loading work centers:', ctErr)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center text-sm font-semibold text-sky-600 transition hover:text-sky-800"
        >
          <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Volver al Dashboard
        </Link>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
              Comités y Actas de Reunión
            </h1>
            <p className="text-sm text-slate-500">
              Empresa: <span className="font-semibold text-slate-800">{company?.razon_social}</span>
            </p>
          </div>
        </div>
      </div>

      <ActasDashboard
        companyId={companyId}
        companyName={company?.razon_social || 'Empresa'}
        isRegisStaff={user.isRegisStaff}
        centros={centros || []}
      />
    </div>
  )
}
