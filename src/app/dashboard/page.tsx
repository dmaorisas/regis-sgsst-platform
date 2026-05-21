// =========================================================
// /dashboard — Vista principal del cliente
// =========================================================
// Server Component. Lee los datos de la empresa accesible al usuario
// y renderiza:
//   - Header
//   - CompanyCard
//   - ScoreCard (último snapshot)
//   - ByCycleChart
//   - StandardsTable
//
// Comportamiento por rol:
//   - regis_admin / regis_consultant   → redirige a /regis/dashboard
//     (su vista natural es la cartera completa). El usuario puede
//     entrar a una empresa específica desde ahí.
//   - client_admin / worker            → ve "su" empresa (la del
//     primer rol activo con company_id no nulo).
// =========================================================

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import { SnapshotsRepository } from '@/infrastructure/repositories/snapshots-repository'
import Header from '@/components/dashboard/Header'
import CompanyCard from '@/components/dashboard/CompanyCard'
import StandardsChecklistTable from '@/components/dashboard/StandardsChecklistTable'

import type { Snapshot } from '@/domain/compliance/types'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await getUserWithRoles()
  if (!user) redirect('/login')

  if (user.companyIds.length === 0 && !user.isRegisStaff) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="mx-auto max-w-3xl px-4 py-8">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            <h2 className="text-lg font-semibold">Sin empresa asignada</h2>
            <p className="mt-1 text-sm">
              Tu usuario no tiene aún una empresa asignada. Pide al administrador de tu consultora
              que te incluya en al menos una empresa.
            </p>
          </div>
        </main>
      </div>
    )
  }

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
    return errorView('No fue posible determinar la empresa activa.')
  }

  // Lectura con cliente RLS-aware (cookie session). El usuario sólo
  // verá filas autorizadas por las policies de migration 012.
  const supabase = createSupabaseServerClient()

  const { data: companyRow, error: cErr } = await supabase
    .from('companies')
    .select(
      'id, razon_social, nit, ciudad, numero_trabajadores, clase_riesgo, capitulo_aplicable, ciiu_principal',
    )
    .eq('id', companyId)
    .single()

  if (cErr || !companyRow) {
    return errorView(`No fue posible cargar la empresa (${cErr?.message ?? 'desconocido'})`)
  }

  const { data: centros } = await supabase
    .from('centros_de_trabajo')
    .select('id, nombre')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })

  if (!centros || centros.length === 0) {
    return errorView('La empresa no tiene centros de trabajo configurados.')
  }
  const mainCentro = centros[0]!

  const admin = getSupabaseAdminClient()

  // Load standards applicable to this company's chapter
  const chapter = (companyRow.capitulo_aplicable as string | null) ?? 'III'
  const chapterCol = `applies_chapter_${chapter.toLowerCase()}`
  const { data: standardRows } = await supabase
    .from('standards_0312')
    .select('id, standard_number, name, cycle_phva, weight_capitulo_iii')
    .eq(chapterCol, true)
    .order('standard_number')

  // Load current evaluations for this centro
  const { data: evalRows } = await admin
    .from('standard_evaluations')
    .select('standard_id, status')
    .eq('centro_id', mainCentro.id)
    .is('deleted_at', null)

  const checklistStandards = (standardRows ?? []).map((r) => ({
    id: r.id as string,
    standard_number: r.standard_number as string,
    name: r.name as string,
    cycle_phva: r.cycle_phva as string,
  }))

  const checklistEvaluations = (evalRows ?? []).map((r) => ({
    standard_id: r.standard_id as string,
    status: r.status as 'cumple' | 'no_cumple' | 'no_aplica' | 'pendiente',
  }))

  // Snapshot (optional — dashboard works without it)
  const snapshotsRepo = new SnapshotsRepository(admin)
  const snapshot: Snapshot | null = await snapshotsRepo.getLatestByCentro(mainCentro.id)
  const _counts = snapshot ? countersFor(snapshot) : null

  return (
    <div className="min-h-screen bg-slate-50">
      <Header user={user} />
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
        <CompanyCard
          company={{
            razon_social: companyRow.razon_social as string,
            nit: companyRow.nit as string,
            ciudad: (companyRow.ciudad as string | null) ?? null,
            numero_trabajadores: companyRow.numero_trabajadores as number,
            clase_riesgo: (companyRow.clase_riesgo as number | null) ?? null,
            capitulo_aplicable:
              (companyRow.capitulo_aplicable as 'I' | 'II' | 'III' | null) ?? null,
            ciiu_principal: (companyRow.ciiu_principal as string | null) ?? null,
            centros_count: centros.length,
          }}
        />

        <StandardsChecklistTable
          standards={checklistStandards}
          initialEvaluations={checklistEvaluations}
          centroId={mainCentro.id}
          chapter={chapter as 'I' | 'II' | 'III'}
        />
      </main>
    </div>
  )
}

function countersFor(s: Snapshot) {
  const c = { cumple: 0, no_cumple: 0, no_aplica: 0, pendiente: 0 }
  for (const d of s.by_standard) {
    c[d.status] += 1
  }
  return c
}

function errorView(msg: string) {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
          <h2 className="text-lg font-semibold">Error</h2>
          <p className="mt-1 text-sm">{msg}</p>
        </div>
      </main>
    </div>
  )
}
