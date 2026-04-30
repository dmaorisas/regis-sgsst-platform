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
import { SnapshotsRepository } from '@/infrastructure/repositories/snapshots-repository'
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

  // Snapshot: el dashboard es READ-ONLY sobre evaluation_snapshots
  // (Bloque 4B iter 2 — fix bug 0% en Empresa 1, R7 Opción A).
  //
  // Razón: si el dashboard regenerara ad-hoc, cada render con condiciones
  // raras (RLS, transacciones a medias, llamadas concurrentes) podía
  // persistir un snapshot con total_evaluated=0 que después ganaba el
  // ORDER BY snapshot_date DESC, created_at DESC en getLatestByCentro,
  // sirviendo 0% al usuario. La generación queda exclusivamente en:
  //   - scripts/seed_demo_evaluations.ts (seed de demo)
  //   - endpoint admin futuro (out of scope ahora)
  //   - cron de F1.5
  //
  // El admin client se mantiene porque el cómputo del frontend no
  // depende de RLS y queremos consistencia (la autorización ya se
  // verificó arriba via getUserWithRoles + companyIds).
  const admin = getSupabaseAdminClient()
  const snapshotsRepo = new SnapshotsRepository(admin)
  const snapshot: Snapshot | null = await snapshotsRepo.getLatestByCentro(mainCentro.id)

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header user={user} />
        <main className="mx-auto max-w-3xl px-4 py-8">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            <h2 className="text-lg font-semibold">Aún no hay datos de cumplimiento</h2>
            <p className="mt-1 text-sm">
              No hay un snapshot generado para esta empresa. Pide al equipo Regis que ejecute el
              cierre inicial de evaluaciones, o registra evaluaciones desde el módulo de
              autoevaluación cuando esté disponible.
            </p>
          </div>
        </main>
      </div>
    )
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
