import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import EmergencyAudioUploader from './EmergencyAudioUploader'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function EmergenciesPage() {
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
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <div>
        <Link
          href="/dashboard"
          className="mb-4 inline-block text-sm font-medium text-sky-600 hover:text-sky-800"
        >
          ← Volver al Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Asistente de Planes de Emergencia</h1>
            <p className="text-gray-600">
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-slate-700">
                {company?.razon_social}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-r-md border-l-4 border-red-500 bg-red-50 p-4">
        <p className="text-red-800">
          Sube el archivo de audio (.mp3 o .m4a) de tu nota de voz grabada durante la visita
          técnica. Whisper transcribirá tus hallazgos y Claude redactará automáticamente el Plan de
          Acción Correctiva Inmediata.
        </p>
      </div>

      <EmergencyAudioUploader companyId={companyId} />
    </div>
  )
}
