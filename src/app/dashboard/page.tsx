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
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import { CentrosRepository } from '@/infrastructure/repositories/centros-repository'
import { EvaluationsRepository } from '@/infrastructure/repositories/evaluations-repository'
import { SnapshotsRepository } from '@/infrastructure/repositories/snapshots-repository'
import { StandardsRepository } from '@/infrastructure/repositories/standards-repository'
import { generateSnapshotForCentro } from '@/application/compliance/generate-snapshot.use-case'
import Header from '@/components/dashboard/Header'
import CompanyCard from '@/components/dashboard/CompanyCard'
import ScoreCard from '@/components/dashboard/ScoreCard'
import ByCycleChart from '@/components/dashboard/ByCycleChart'
import StandardsTable from '@/components/dashboard/StandardsTable'
import type { Snapshot } from '@/domain/compliance/types'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await getUserWithRoles()
  if (!user) redirect('/login')

  // Regis staff → vista de cartera, no de una sola empresa.
  if (user.isRegisStaff) {
    redirect('/regis/dashboard')
  }

  if (user.companyIds.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header user={user} />
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

  const companyId = user.companyIds[0]!

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
    return errorView(`No fue posible cargar la empresa (${cErr?.message ?? 'desconocido'})`, user)
  }

  const { data: centros } = await supabase
    .from('centros_de_trabajo')
    .select('id, nombre')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })

  if (!centros || centros.length === 0) {
    return errorView('La empresa no tiene centros de trabajo configurados.', user)
  }
  const mainCentro = centros[0]!

  // Snapshot: usamos admin client para el motor (necesita inyectar
  // service_role para el insert APPEND-ONLY del snapshot regenerado).
  // El cómputo no depende de RLS — los repositorios sólo leen estándares
  // y evaluaciones (catálogo y datos de la empresa que ya validamos).
  const admin = getSupabaseAdminClient()
  const snapshotsRepo = new SnapshotsRepository(admin)
  let snapshot: Snapshot | null = await snapshotsRepo.getLatestByCentro(mainCentro.id)

  if (!snapshot) {
    // Generar snapshot ad-hoc si no hay ninguno persistido.
    snapshot = await generateSnapshotForCentro(mainCentro.id, new Date(), {
      standardsRepo: new StandardsRepository(admin),
      evaluationsRepo: new EvaluationsRepository(admin),
      snapshotsRepo,
      centrosRepo: new CentrosRepository(admin),
    })
  }

  const counts = countersFor(snapshot)

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

        <div className="grid gap-4 lg:grid-cols-2">
          <ScoreCard
            percentage={snapshot.total_percentage}
            asOf={snapshot.snapshot_date}
            counters={counts}
            totalAplicables={snapshot.total_aplicables}
          />
          <ByCycleChart byCycle={snapshot.by_cycle} total={snapshot.total_percentage} />
        </div>

        <StandardsTable standards={snapshot.by_standard} drillBaseHref="/dashboard/standards" />
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

function errorView(msg: string, user: NonNullable<Awaited<ReturnType<typeof getUserWithRoles>>>) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header user={user} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
          <h2 className="text-lg font-semibold">Error</h2>
          <p className="mt-1 text-sm">{msg}</p>
        </div>
      </main>
    </div>
  )
}
