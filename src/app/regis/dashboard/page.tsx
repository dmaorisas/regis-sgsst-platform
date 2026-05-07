// =========================================================
// /regis/dashboard — Cartera de empresas (vista Regis)
// =========================================================
// Server Component. Muestra:
//   - Header
//   - PortfolioStats (KPIs agregados)
//   - CompaniesTable (lista con % por empresa)
//
// Acceso restringido a regis_admin / regis_consultant.
// =========================================================

import { redirect } from 'next/navigation'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import Header from '@/components/dashboard/Header'
import PortfolioStats from '@/components/dashboard/PortfolioStats'
import CompaniesTable from '@/components/dashboard/CompaniesTable'
import type { CompanyRow } from '@/components/dashboard/CompaniesTable'

export const dynamic = 'force-dynamic'

export default async function RegisDashboardPage() {
  const user = await getUserWithRoles()
  if (!user) redirect('/login')
  if (!user.isRegisStaff) redirect('/dashboard')

  // Las consultas usan admin client porque cruzamos snapshots ↔ centros ↔
  // companies y la lógica de negocio (resolver "último snapshot por
  // empresa") es más legible sin pelear con joins via RLS. La autorización
  // ya se verificó arriba (isRegisStaff).
  const admin = getSupabaseAdminClient()

  // Resolver el regis_org del usuario vía sus roles activos.
  const orgId = user.roles[0]?.regis_org_id
  if (!orgId) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header user={user} />
        <main className="mx-auto max-w-3xl px-4 py-8">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            <h2 className="text-lg font-semibold">Sin organización asignada</h2>
            <p className="mt-1 text-sm">El usuario no tiene una organización Regis activa.</p>
          </div>
        </main>
      </div>
    )
  }

  const { data: companies, error: cErr } = await admin
    .from('companies')
    .select(
      'id, razon_social, nit, ciudad, capitulo_aplicable, numero_trabajadores, centros_de_trabajo(id)',
    )
    .eq('regis_org_id', orgId)
    .is('deleted_at', null)
    .order('razon_social', { ascending: true })

  if (cErr || !companies) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header user={user} />
        <main className="mx-auto max-w-3xl px-4 py-8">
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
            <h2 className="text-lg font-semibold">Error</h2>
            <p className="mt-1 text-sm">{cErr?.message ?? 'No fue posible cargar la cartera.'}</p>
          </div>
        </main>
      </div>
    )
  }

  // Para cada empresa: resolver último snapshot del centro principal.
  // OPTIMIZACIÓN: Evitar N+1 queries. Extraer los IDs principales y hacer una sola consulta.
  type WithCentros = (typeof companies)[number] & {
    centros_de_trabajo: { id: string }[] | null
  }
  
  const rows: CompanyRow[] = []
  const principalIds: string[] = []
  
  for (const comp of companies as WithCentros[]) {
    const centros = comp.centros_de_trabajo ?? []
    if (centros.length > 0) {
      const ids = centros.map((c) => c.id).sort()
      principalIds.push(ids[0])
    }
  }

  // Cargar todos los snapshots de los centros principales en 1 sola consulta
  const latestPctByCentro = new Map<string, number>()
  if (principalIds.length > 0) {
    const { data: allSnaps } = await admin
      .from('evaluation_snapshots')
      .select('centro_id, total_percentage, snapshot_date, created_at')
      .in('centro_id', principalIds)
      // Traemos todos y filtramos en JS. Las evaluaciones son 1 al año aprox, por lo que el volumen es manejable.
    
    if (allSnaps && allSnaps.length > 0) {
      // Ordenar por snapshot_date desc, created_at desc
      allSnaps.sort((a, b) => {
        const dateA = new Date(a.snapshot_date || a.created_at).getTime()
        const dateB = new Date(b.snapshot_date || b.created_at).getTime()
        return dateB - dateA
      })
      
      // El primero que encontremos por centro será el más reciente
      for (const snap of allSnaps) {
        if (!latestPctByCentro.has(snap.centro_id) && snap.total_percentage !== null) {
          latestPctByCentro.set(snap.centro_id, Number(snap.total_percentage))
        }
      }
    }
  }

  for (const comp of companies as WithCentros[]) {
    const centros = comp.centros_de_trabajo ?? []
    let pct: number | null = null
    
    if (centros.length > 0) {
      const ids = centros.map((c) => c.id).sort()
      const principalId = ids[0]
      if (latestPctByCentro.has(principalId)) {
        pct = latestPctByCentro.get(principalId)!
      }
    }
    
    rows.push({
      id: comp.id as string,
      razon_social: comp.razon_social as string,
      nit: comp.nit as string,
      ciudad: (comp.ciudad as string | null) ?? null,
      capitulo_aplicable: (comp.capitulo_aplicable as 'I' | 'II' | 'III' | null) ?? null,
      numero_trabajadores: comp.numero_trabajadores as number,
      total_percentage: pct,
      centros_count: centros.length,
    })
  }

  // KPIs
  const evaluated = rows.filter((r) => r.total_percentage !== null)
  const avg =
    evaluated.length > 0
      ? evaluated.reduce((acc, r) => acc + (r.total_percentage ?? 0), 0) / evaluated.length
      : 0
  const top = evaluated.length > 0 ? Math.max(...evaluated.map((r) => r.total_percentage ?? 0)) : 0
  const alerts = evaluated.filter((r) => (r.total_percentage ?? 0) < 60).length

  return (
    <div className="min-h-screen bg-slate-50">
      <Header user={user} homeHref="/regis/dashboard" />
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Cartera de empresas</h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Vista consolidada de las empresas atendidas por tu consultora.
          </p>
        </div>
        <PortfolioStats
          metrics={{
            totalCompanies: rows.length,
            avgScore: avg,
            alertCount: alerts,
            topScore: top,
          }}
        />
        <CompaniesTable companies={rows} />
      </main>
    </div>
  )
}
