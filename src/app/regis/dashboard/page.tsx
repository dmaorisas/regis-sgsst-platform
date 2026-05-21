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
import { getUserModuleMap } from '@/lib/auth/get-module-access'
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

  const moduleAccess = await getUserModuleMap(user)

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
      'id, razon_social, nit, ciudad, capitulo_aplicable, numero_trabajadores, centros_de_trabajo(id, created_at)',
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

  // Misma lógica que el dashboard de empresa:
  // - Centro principal = el primero por created_at ASC (no por UUID)
  // - % siempre calculado en tiempo real desde standard_evaluations (nunca desde snapshots)
  // Esto garantiza que la cartera sea un espejo exacto de lo que muestra cada empresa.
  type WithCentros = (typeof companies)[number] & {
    centros_de_trabajo: { id: string; created_at: string }[] | null
  }

  // 1. Identificar centro principal de cada empresa (mismo criterio que /dashboard)
  type PrincipalEntry = { centroId: string; chapter: string; companyIdx: number }
  const principalEntries: PrincipalEntry[] = []

  for (let i = 0; i < companies.length; i++) {
    const comp = companies[i] as WithCentros
    const centros = (comp.centros_de_trabajo ?? [])
      .slice()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    if (centros.length > 0) {
      principalEntries.push({
        centroId: centros[0]!.id,
        chapter: (comp.capitulo_aplicable as string | null) ?? 'III',
        companyIdx: i,
      })
    }
  }

  const principalIds = principalEntries.map((e) => e.centroId)

  // 2. Cargar evaluaciones y estándares en 2 queries paralelas (batch, sin N+1)
  const pctByCompanyIdx = new Map<number, number>()

  if (principalIds.length > 0) {
    const [{ data: allStandards }, { data: allEvals }] = await Promise.all([
      admin
        .from('standards_0312')
        .select(
          'id, standard_number, cycle_phva, weight_capitulo_iii, applies_chapter_i, applies_chapter_ii, applies_chapter_iii',
        ),
      admin
        .from('standard_evaluations')
        .select('centro_id, standard_id, status')
        .in('centro_id', principalIds)
        .is('deleted_at', null),
    ])

    const evalsByCentro = new Map<string, Array<{ standard_id: string; status: string }>>()
    for (const ev of allEvals ?? []) {
      if (!evalsByCentro.has(ev.centro_id)) evalsByCentro.set(ev.centro_id, [])
      evalsByCentro.get(ev.centro_id)!.push(ev)
    }

    // 3. Calcular % con la misma fórmula que StandardsChecklistTable
    for (const { centroId, chapter, companyIdx } of principalEntries) {
      const evals = evalsByCentro.get(centroId) ?? []
      if (evals.length === 0) continue

      const chapterCol = `applies_chapter_${chapter.toLowerCase()}` as
        | 'applies_chapter_i'
        | 'applies_chapter_ii'
        | 'applies_chapter_iii'

      const standards = (allStandards ?? [])
        .filter((s) => s[chapterCol])
        .map((s) => ({
          id: s.id as string,
          standard_number: s.standard_number as string,
        }))

      try {
        const pct = computeLiveScore(standards, evals, chapter)
        pctByCompanyIdx.set(companyIdx, pct)
      } catch {
        // datos inválidos → mantener null para esa empresa
      }
    }
  }

  // 4. Construir filas
  const rows: CompanyRow[] = (companies as WithCentros[]).map((comp, i) => ({
    id: comp.id as string,
    razon_social: comp.razon_social as string,
    nit: comp.nit as string,
    ciudad: (comp.ciudad as string | null) ?? null,
    capitulo_aplicable: (comp.capitulo_aplicable as 'I' | 'II' | 'III' | null) ?? null,
    numero_trabajadores: comp.numero_trabajadores as number,
    total_percentage: pctByCompanyIdx.get(i) ?? null,
    centros_count: (comp.centros_de_trabajo ?? []).length,
  }))

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
      <Header user={user} homeHref="/regis/dashboard" moduleAccess={moduleAccess} />
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

// ─────────────────────────────────────────────────────────────────────────────
// Réplica exacta de StandardsChecklistTable.totalScore para uso server-side.
// Misma fórmula, mismos overrides por capítulo, mismos shared links (Cap. I).
// ─────────────────────────────────────────────────────────────────────────────
const MACRO_WEIGHTS = [
  { name: 'Recursos', weight: 10 },
  { name: 'Gestión integral SG-SST', weight: 15 },
  { name: 'Gestión de la salud', weight: 20 },
  { name: 'Gestión de peligros y riesgos', weight: 30 },
  { name: 'Gestión de amenazas', weight: 10 },
  { name: 'Verificación', weight: 5 },
  { name: 'Mejoramiento', weight: 10 },
] as const

const MACRO_OVERRIDE_BY_CHAPTER: Record<string, Record<string, string>> = {
  I: { '3.2.2': 'Verificación' },
  II: { '3.2.2': 'Verificación' },
  III: {},
}

const SHARED_LINKS_BY_CHAPTER: Record<string, Record<string, string[]>> = {
  I: {
    '4.1.2': ['Gestión de amenazas'],
    '4.2.1': ['Gestión de amenazas'],
    '3.2.2': ['Mejoramiento'],
  },
  II: {},
  III: {},
}

function getDefaultMacro(stdNum: string): string {
  if (stdNum.startsWith('1.1.') || stdNum.startsWith('1.2.')) return 'Recursos'
  if (stdNum.startsWith('2.')) return 'Gestión integral SG-SST'
  if (stdNum.startsWith('3.')) return 'Gestión de la salud'
  if (stdNum.startsWith('4.')) return 'Gestión de peligros y riesgos'
  if (stdNum.startsWith('5.')) return 'Gestión de amenazas'
  if (stdNum.startsWith('6.')) return 'Verificación'
  if (stdNum.startsWith('7.')) return 'Mejoramiento'
  return 'Otros'
}

function computeLiveScore(
  standards: Array<{ id: string; standard_number: string }>,
  evals: Array<{ standard_id: string; status: string }>,
  chapter: string,
): number {
  const statusMap = new Map(evals.map((e) => [e.standard_id, e.status]))
  const overrides = MACRO_OVERRIDE_BY_CHAPTER[chapter] ?? {}
  const sharedLinks = SHARED_LINKS_BY_CHAPTER[chapter] ?? {}
  const stdByNumber = new Map(standards.map((s) => [s.standard_number, s]))

  // Asignar cada estándar a su macro primaria (con overrides por capítulo)
  type Entry = { id: string; macro: string }
  const entries: Entry[] = []

  for (const std of standards) {
    const primaryMacro = overrides[std.standard_number] ?? getDefaultMacro(std.standard_number)
    entries.push({ id: std.id, macro: primaryMacro })
  }

  // Agregar entradas extra por shared links (Cap. I)
  for (const [stdNum, linkedMacros] of Object.entries(sharedLinks)) {
    const std = stdByNumber.get(stdNum)
    if (!std) continue
    for (const linked of linkedMacros) {
      // Solo agregar si no es ya el primary macro de este estándar
      const primary = overrides[stdNum] ?? getDefaultMacro(stdNum)
      if (linked !== primary) {
        entries.push({ id: std.id, macro: linked })
      }
    }
  }

  // Calcular score: misma fórmula que StandardsChecklistTable.totalScore
  // applicable = total estándares en el macro (SIN filtrar no_aplica del denominador)
  let sumAportes = 0
  let wActive = 0

  for (const { name, weight } of MACRO_WEIGHTS) {
    const macroEntries = entries.filter((e) => e.macro === name)
    if (macroEntries.length === 0) continue
    const cumple = macroEntries.filter((e) => statusMap.get(e.id) === 'cumple').length
    sumAportes += weight * (cumple / macroEntries.length)
    wActive += weight
  }

  return wActive > 0 ? (sumAportes / wActive) * 100 : 0
}
