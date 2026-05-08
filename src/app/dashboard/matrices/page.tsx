import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import MatrixViewer from './MatrixViewer'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function MatricesPage() {
  const user = await getUserWithRoles()
  if (!user) redirect('/login')

  if (user.companyIds.length === 0 && !user.isRegisStaff) {
    return <div className="p-8 text-red-500">Error: No tienes una empresa asignada.</div>
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
    return <div className="p-8 text-red-500">Error: Empresa no determinada.</div>
  }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: company } = await supabase
    .from('companies')
    .select('razon_social, ciiu_principal')
    .eq('id', companyId)
    .single()

  return (
    <div className="min-h-screen bg-[#fbf8fa] p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center">
          <div>
            <Link
              href="/dashboard"
              className="mb-4 inline-block text-sm font-medium text-sky-600 hover:text-sky-800"
            >
              ← Volver al Dashboard
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-[#1e293b]">
              Matriz de Peligros GTC-45 (Generada por IA)
            </h1>
            <p className="mt-2 flex items-center gap-2 text-sm font-medium text-[#64748b]">
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-slate-700">
                {company?.razon_social}
              </span>
              <span className="text-slate-300">•</span>
              <span>CIIU: {company?.ciiu_principal || 'No registrado'}</span>
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-8 shadow-[0_2px_4px_rgba(30,41,59,0.04),0_4px_12px_rgba(30,41,59,0.06)]">
          <MatrixViewer companyId={companyId} />
        </div>
      </div>
    </div>
  )
}
