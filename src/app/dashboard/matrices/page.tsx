import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import MatrixViewer from './MatrixViewer'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'

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
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: company } = await supabase
    .from('companies')
    .select('razon_social, name, ciiu_principal')
    .eq('id', companyId)
    .single()

  return (
    <div className="min-h-screen bg-[#fbf8fa] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-5 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1e293b] tracking-tight">Matriz de Peligros GTC-45 (Generada por IA)</h1>
            <p className="text-[#64748b] mt-2 text-sm font-medium flex items-center gap-2">
              <span className="bg-slate-100 px-2.5 py-1 rounded-md text-slate-700">{company?.razon_social || company?.name}</span>
              <span className="text-slate-300">•</span>
              <span>CIIU: {company?.ciiu_principal || 'No registrado'}</span>
            </p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-[0_2px_4px_rgba(30,41,59,0.04),0_4px_12px_rgba(30,41,59,0.06)] border border-slate-100 p-8">
          <MatrixViewer companyId={companyId} />
        </div>
      </div>
    </div>
  )
}
