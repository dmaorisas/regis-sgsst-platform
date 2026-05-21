import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import ClientDocumentsUpload from './ClientDocumentsUpload'

export const dynamic = 'force-dynamic'

export default async function DocumentsPage() {
  const user = await getUserWithRoles()
  if (!user) redirect('/login')

  let companyId = user.companyIds[0]
  if (user.isRegisStaff) {
    const cookieStore = cookies()
    const selectedCompanyId = cookieStore.get('selected_company_id')?.value
    if (!selectedCompanyId) {
      redirect('/regis/dashboard')
    }
    companyId = selectedCompanyId
  }

  if (!companyId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
          <h2 className="text-lg font-semibold">Error</h2>
          <p className="mt-1 text-sm">No fue posible determinar la empresa activa.</p>
        </div>
      </div>
    )
  }

  const supabase = createSupabaseServerClient()

  // List files for this company
  // We'll use the 'company_documents' bucket and the companyId as folder
  const { data: files, error: _error } = await supabase.storage
    .from('company_documents')
    .list(companyId)

  // files may be null if bucket is empty or folder doesn't exist
  const existingFiles = files || []

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Documentos Generales del SG-SST
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Sube y administra los documentos obligatorios propios de esta empresa (políticas, actas de
          recursos, plan de capacitaciones, cronogramas). Cada carga exitosa sumará al cumplimiento
          general del SG-SST.
        </p>
      </div>

      <ClientDocumentsUpload companyId={companyId} initialFiles={existingFiles} />
    </main>
  )
}
