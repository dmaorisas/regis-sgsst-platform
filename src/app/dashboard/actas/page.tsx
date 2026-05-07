import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ActaGeneratorForm from './ActaGeneratorForm'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import Link from 'next/link'

import { getSupabaseAdminClient } from '@/lib/supabase-admin'

export default async function ActasPage() {
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
    .select('razon_social, name')
    .eq('id', companyId)
    .single()

  // Fetch company users for default attendees
  const adminSupabase = getSupabaseAdminClient()
  const { data: userRoles } = await adminSupabase
    .from('user_company_role')
    .select('user_id')
    .eq('company_id', companyId)
    .eq('is_active', true)

  let defaultAttendees = ''
  if (userRoles && userRoles.length > 0) {
    const userIds = userRoles.map(ur => ur.user_id)
    const { data: users } = await adminSupabase
      .from('users')
      .select('nombre_completo')
      .in('id', userIds)
    
    if (users) {
      const attendeesList = users.map(u => u.nombre_completo).filter(Boolean) as string[]
      defaultAttendees = attendeesList.join(', ')
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-sky-600 hover:text-sky-800 font-medium mb-4 inline-block">
          ← Volver al Dashboard
        </Link>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Generador Automático de Actas (Comités)</h1>
            <p className="text-gray-600">
              Empresa: <span className="font-semibold">{company?.razon_social || company?.name}</span>
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-md">
        <p className="text-emerald-800">
          Ingresa notas breves de tu reunión. La Inteligencia Artificial redactará automáticamente el acta con lenguaje corporativo y estructura legal válida para el Ministerio de Trabajo.
        </p>
      </div>

      <ActaGeneratorForm companyId={companyId} defaultAttendees={defaultAttendees} />
    </div>
  )
}
