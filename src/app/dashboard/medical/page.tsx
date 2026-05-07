import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import MedicalExamUploader from './MedicalExamUploader'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import Link from 'next/link'

export default async function MedicalExamsPage() {
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

  // Fetch workers for this company (using worker_company NM)
  const { data: workersData } = await supabase
    .from('worker_company')
    .select('workers (id, nombres, apellidos, cedula)')
    .eq('company_id', companyId)
    .eq('is_active', true)

  const { data: company } = await supabase
    .from('companies')
    .select('name, razon_social')
    .eq('id', companyId)
    .single()

  const workers = workersData?.map(w => w.workers).flat() || []

  return (
    <div className="min-h-screen bg-[#fbf8fa] p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <Link href="/dashboard" className="text-sm text-sky-600 hover:text-sky-800 font-medium mb-4 inline-block">
            ← Volver al Dashboard
          </Link>
          <div className="border-b border-slate-200 pb-5">
            <h1 className="text-3xl font-bold text-[#1e293b] tracking-tight">Procesamiento de Exámenes Médicos con IA</h1>
            <p className="text-[#64748b] mt-2 max-w-2xl text-sm leading-relaxed">
              Empresa: <span className="font-semibold">{company?.razon_social || company?.name}</span>. Sube el PDF del examen médico ocupacional. La inteligencia artificial analizará el documento y extraerá automáticamente las recomendaciones y restricciones laborales.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-[0_2px_4px_rgba(30,41,59,0.04),0_4px_12px_rgba(30,41,59,0.06)] border border-slate-100 p-8">
          <MedicalExamUploader 
            companyId={companyId} 
            workers={workers as any[]} 
          />
        </div>
      </div>
    </div>
  )
}
