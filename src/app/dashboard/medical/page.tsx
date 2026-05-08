import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import MedicalExamUploader from './MedicalExamUploader'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

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
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  const { data: company } = await supabase
    .from('companies')
    .select('razon_social')
    .eq('id', companyId)
    .single()

  return (
    <div className="min-h-screen bg-[#fbf8fa] p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <Link
            href="/dashboard"
            className="mb-4 inline-block text-sm font-medium text-sky-600 hover:text-sky-800"
          >
            ← Volver al Dashboard
          </Link>
          <div className="border-b border-slate-200 pb-5">
            <h1 className="text-3xl font-bold tracking-tight text-[#1e293b]">
              Procesamiento de Exámenes Médicos con IA
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#64748b]">
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-slate-700">
                {company?.razon_social}
              </span>
              . Sube el PDF del examen médico ocupacional. La inteligencia artificial analizará el
              documento y extraerá automáticamente las recomendaciones y restricciones laborales.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-8 shadow-[0_2px_4px_rgba(30,41,59,0.04),0_4px_12px_rgba(30,41,59,0.06)]">
          <MedicalExamUploader companyId={companyId} />
        </div>
      </div>
    </div>
  )
}
