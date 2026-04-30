/**
 * scripts/seed_demo_evaluations.ts
 *
 * Crea evaluaciones determinísticas para los 3 pilotos para que el
 * dashboard se vea "vivo" con números cercanos a:
 *   - Empresa 1 (Cap I,  7 estándares): ~71%   (5 cumple + 1 no_cumple + 1 pendiente)
 *   - Empresa 2 (Cap II, 22 estándares): ~90%   (18 cumple + 2 no_cumple + 2 no_aplica)
 *   - Empresa 3 (Cap III, 60 estándares): ~65%   (35 cumple + 15 no_cumple + 8 no_aplica + 2 pendiente)
 *
 * Tras seedear las evaluaciones, regenera un snapshot por centro de
 * trabajo de cada empresa usando el motor de Bloque 4A.
 *
 * Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/24
 * Tarea: T-F1-020 (datos demo) + reuso de T-F1-017 (snapshot generator)
 *
 * Idempotente:
 *   - Cada evaluación se busca por (centro_id, standard_id) UNIQUE y se
 *     UPSERT-ea con el status objetivo.
 *   - El snapshot final se inserta con la fecha "as-of" actual; si ya
 *     existe uno para hoy con mismo hash, no se duplica visualmente
 *     (la tabla es append-only por diseño, pero el frontend lee el
 *     más reciente).
 */

import { createClient } from '@supabase/supabase-js'
import * as path from 'node:path'
import * as dotenv from 'dotenv'

import { CentrosRepository } from '@/infrastructure/repositories/centros-repository'
import { EvaluationsRepository } from '@/infrastructure/repositories/evaluations-repository'
import { SnapshotsRepository } from '@/infrastructure/repositories/snapshots-repository'
import { StandardsRepository } from '@/infrastructure/repositories/standards-repository'
import { generateSnapshotForCentro } from '@/application/compliance/generate-snapshot.use-case'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('FATAL: SUPABASE env ausente')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type EvalStatus = 'cumple' | 'no_cumple' | 'no_aplica' | 'pendiente'

const PILOT_NITS = ['900123456-7', '901234567-8', '830987654-3'] as const

/**
 * Plan de distribución por capítulo (cardinalidades fijadas en spec).
 * Ver Issue #24 — "Empresa 1 ~71%, Empresa 2 ~90%, Empresa 3 ~65%".
 */
const PLAN: Record<
  'I' | 'II' | 'III',
  { cumple: number; no_cumple: number; no_aplica: number; targetPct: number }
> = {
  I: { cumple: 5, no_cumple: 1, no_aplica: 0, targetPct: 71 }, // 7 estándares; resto pendiente=1
  II: { cumple: 18, no_cumple: 2, no_aplica: 2, targetPct: 90 }, // 22 estándares; resto pendiente=0
  III: { cumple: 35, no_cumple: 15, no_aplica: 8, targetPct: 65 }, // 60 estándares; resto pendiente=2
}

/**
 * Construye la asignación cumple/no_cumple/no_aplica/pendiente por
 * estándar de modo que el % de cumplimiento resultante se aproxime al
 * `targetPct` del PLAN.
 *
 * Decisión técnica (R7): puro orden por weight_desc o weight_asc da
 * extremos (0% / 100%). Greedy: comenzamos con todos los estándares
 * marcados como `cumple`, y a partir de ahí "degradamos" estándares
 * (cumple → no_cumple, cumple → no_aplica) eligiendo aquellos que
 * acerquen el score al target. Cuando ya bajamos suficientes weights,
 * las cardinalidades restantes en el plan se rellenan con los menores
 * pesos disponibles.
 *
 * Procedimiento explícito:
 *   sumBase = Σ weight(s) ∀ s
 *   targetCumpleWeight = sumBase * targetPct / 100
 *
 *   Etapa 1: marcamos como `cumple` un subconjunto S de estándares
 *   cuya suma de pesos ≈ targetCumpleWeight, respetando que |S| =
 *   PLAN.cumple. Usamos un "subset-sum" greedy: ordenamos por peso
 *   descendente y vamos tomando hasta no rebasar el target. Si nos
 *   quedamos cortos al final por el cap |S|, tomamos los siguientes
 *   pesos descendientes.
 *
 *   Etapa 2: el resto (estándares no en S) se reparten como
 *   no_cumple / no_aplica / pendiente en cardinalidades del PLAN.
 *
 * Este algoritmo es determinístico (mismo input → mismo output) y
 * típicamente acerca el score a ±2 puntos del target.
 */
function planForChapter(
  chapter: 'I' | 'II' | 'III',
  standards: { id: string; standard_number: string; weight_capitulo_iii: number }[],
): Map<string, EvalStatus> {
  const p = PLAN[chapter]
  const total = standards.length
  const sumBase = standards.reduce((acc, s) => acc + s.weight_capitulo_iii, 0)

  // Trabajamos sobre standards aproximadamente "desordenados" para que
  // la selección no quede pegada al final/inicio. Orden por peso desc
  // como base, tie-break por standard_number.
  const sorted = [...standards].sort((a, b) => {
    if (b.weight_capitulo_iii !== a.weight_capitulo_iii) {
      return b.weight_capitulo_iii - a.weight_capitulo_iii
    }
    return compareStandardNumbers(a.standard_number, b.standard_number)
  })

  // ETAPA 1.0 — pre-seleccionar `no_aplica` (los `p.no_aplica` items de
  // menor peso). Los excluimos del cálculo del target para `cumple`
  // porque la redistribución del motor del Bloque 4A los saca del
  // denominador: score = Σ_cumple(weight) / (sumBase − Σ_no_aplica(weight)) * 100.
  const sortedAscFull = [...sorted].reverse() // peso ascendente
  const noAplicaIds = new Set<string>()
  let sumNoAplica = 0
  for (const s of sortedAscFull) {
    if (noAplicaIds.size >= p.no_aplica) break
    noAplicaIds.add(s.id)
    sumNoAplica += s.weight_capitulo_iii
  }

  const candidatesPool = sorted.filter((s) => !noAplicaIds.has(s.id))
  const sumPool = sumBase - sumNoAplica // = totalAplicable

  // ETAPA 1.1 — selección exacta de `cumple` sobre `candidatesPool`.
  // Implementamos meet-in-the-middle simple: probamos particiones top/bot
  // y escogemos la que minimiza |error| respecto al target ajustado.
  const targetCumpleWeight = (sumPool * p.targetPct) / 100
  const candidates: Array<{ ids: string[]; weight: number; err: number; label: string }> = []
  const poolDesc = candidatesPool // ya está ordenado desc por construcción
  const poolAsc = [...candidatesPool].reverse()

  function addCandidate(label: string, picked: typeof candidatesPool) {
    if (picked.length !== p.cumple) return
    const w = picked.reduce((a, s) => a + s.weight_capitulo_iii, 0)
    candidates.push({
      label,
      ids: picked.map((s) => s.id),
      weight: w,
      err: Math.abs(w - targetCumpleWeight),
    })
  }

  for (let mTop = 0; mTop <= p.cumple; mTop++) {
    const mBot = p.cumple - mTop
    if (mTop > poolDesc.length || mBot > poolAsc.length) continue
    const top = poolDesc.slice(0, mTop)
    const bot = poolAsc.slice(0, mBot)
    const ids = new Set(top.map((s) => s.id))
    let collision = false
    for (const s of bot) {
      if (ids.has(s.id)) {
        collision = true
        break
      }
      ids.add(s.id)
    }
    if (collision || ids.size !== p.cumple) continue
    addCandidate(`mix-top${mTop}-bot${mBot}`, [...top, ...bot])
  }

  candidates.sort((a, b) => a.err - b.err)
  const best = candidates[0]
  const cumpleIds = new Set<string>(best?.ids ?? candidatesPool.slice(0, p.cumple).map((s) => s.id))

  // ETAPA 2 — el resto: no_cumple sobre lo que sobre del pool, dejamos
  // pendiente lo que no entre en ninguna asignación.
  const result = new Map<string, EvalStatus>()
  for (const id of Array.from(cumpleIds)) result.set(id, 'cumple')
  for (const id of Array.from(noAplicaIds)) result.set(id, 'no_aplica')

  const remaining = sorted.filter((s) => !cumpleIds.has(s.id) && !noAplicaIds.has(s.id))
  for (let i = 0; i < p.no_cumple && i < remaining.length; i++) {
    result.set(remaining[i]!.id, 'no_cumple')
  }
  // Lo que quede sin estado se interpreta como `pendiente` y NO se
  // inserta en standard_evaluations (filas ausentes = pendiente).
  void total // silencia "unused"
  return result
}

async function main() {
  console.log('=== Seed demo evaluations (T-F1-020 demo data) ===')

  // 1) Cargar pilotos + centros + capítulo
  const { data: companies, error: cErr } = await supabase
    .from('companies')
    .select('id, nit, razon_social, capitulo_aplicable')
    .in('nit', PILOT_NITS as unknown as string[])
  if (cErr) throw new Error(`load companies: ${cErr.message}`)
  if (!companies || companies.length !== 3) throw new Error('faltan pilotos')

  const standardsRepo = new StandardsRepository(supabase)
  const allStandards = await standardsRepo.getAll()
  /**
   * Decisión técnica (R7): el seed asigna `cumple` a los estándares de
   * MAYOR peso para que el % final acerque a los targets visuales del
   * Issue #24 (~71/90/65). Si ordenásemos sólo por standard_number,
   * los pesos quedarían arbitrarios y el demo se vería plano.
   *
   * Orden de asignación dentro de cada capítulo:
   *   1) Por peso descendente.
   *   2) Tie-break: standard_number ascendente (estable, reproducible).
   */
  const sortStds = (chapter: 'I' | 'II' | 'III') => {
    const filt = allStandards.filter((s) =>
      chapter === 'I'
        ? s.applies_chapter_i
        : chapter === 'II'
          ? s.applies_chapter_ii
          : s.applies_chapter_iii,
    )
    return filt.sort((a, b) => {
      if (b.weight_capitulo_iii !== a.weight_capitulo_iii) {
        return b.weight_capitulo_iii - a.weight_capitulo_iii
      }
      return compareStandardNumbers(a.standard_number, b.standard_number)
    })
  }

  // 2) Para cada empresa: planificar y upsert evaluaciones (en TODOS los centros)
  for (const comp of companies) {
    const chapter = comp.capitulo_aplicable as 'I' | 'II' | 'III'
    const stds = sortStds(chapter)
    const planMap = planForChapter(chapter, stds)
    const counts = { cumple: 0, no_cumple: 0, no_aplica: 0 }
    for (const v of Array.from(planMap.values()))
      counts[v as 'cumple' | 'no_cumple' | 'no_aplica'] += 1
    const pendiente = stds.length - planMap.size
    console.log(
      `\n--- ${comp.razon_social} (${comp.nit}, cap ${chapter}, ${stds.length} estándares) ---`,
    )
    console.log(
      `  Plan: cumple=${counts.cumple}, no_cumple=${counts.no_cumple}, no_aplica=${counts.no_aplica}, pendiente=${pendiente} · target=${PLAN[chapter].targetPct}%`,
    )

    // Centros de la empresa
    const { data: centros, error: cenErr } = await supabase
      .from('centros_de_trabajo')
      .select('id, nombre')
      .eq('company_id', comp.id)
    if (cenErr || !centros || centros.length === 0)
      throw new Error(`sin centros para empresa ${comp.nit}`)

    for (const centro of centros) {
      let inserted = 0
      let updated = 0
      for (const std of stds) {
        const status = planMap.get(std.id)
        if (!status) continue // sin status = pendiente, no insertamos.

        const { data: existing, error: selErr } = await supabase
          .from('standard_evaluations')
          .select('id, status')
          .eq('centro_id', centro.id)
          .eq('standard_id', std.id)
          .is('deleted_at', null)
          .maybeSingle()
        if (selErr) throw new Error(`select eval: ${selErr.message}`)

        const justification =
          status === 'no_aplica'
            ? 'Estándar marcado como no aplicable durante autoevaluación demo.'
            : null

        if (existing) {
          if (existing.status !== status) {
            const { error } = await supabase
              .from('standard_evaluations')
              .update({
                status,
                justification,
                evaluated_at: new Date().toISOString(),
              })
              .eq('id', existing.id)
            if (error) throw new Error(`update eval: ${error.message}`)
            updated += 1
          }
        } else {
          const { error } = await supabase.from('standard_evaluations').insert({
            centro_id: centro.id,
            company_id: comp.id,
            standard_id: std.id,
            status,
            justification,
            evaluated_at: new Date().toISOString(),
          })
          if (error) throw new Error(`insert eval: ${error.message}`)
          inserted += 1
        }
      }
      console.log(`  [${centro.nombre}] insert=${inserted} update=${updated}`)
    }
  }

  // 3) Regenerar snapshot del CENTRO PRINCIPAL (primer centro) por empresa
  console.log('\n=== Regenerando snapshots ===')
  const centrosRepo = new CentrosRepository(supabase)
  const evaluationsRepo = new EvaluationsRepository(supabase)
  const snapshotsRepo = new SnapshotsRepository(supabase)

  const asOf = new Date()
  const summary: Array<{ nit: string; centro: string; pct: number }> = []

  for (const comp of companies) {
    const { data: centros } = await supabase
      .from('centros_de_trabajo')
      .select('id, nombre')
      .eq('company_id', comp.id)
      .order('created_at', { ascending: true })
    if (!centros || centros.length === 0) continue
    const main = centros[0]!

    const snapshot = await generateSnapshotForCentro(main.id, asOf, {
      standardsRepo,
      evaluationsRepo,
      snapshotsRepo,
      centrosRepo,
    })
    console.log(
      `  ${comp.nit} · ${main.nombre}: total_percentage=${snapshot.total_percentage}% (hash ${snapshot.hash.slice(0, 12)}…)`,
    )
    summary.push({
      nit: comp.nit as string,
      centro: main.nombre as string,
      pct: snapshot.total_percentage,
    })
  }

  console.log('\n=== Resumen final ===')
  console.log(JSON.stringify(summary, null, 2))
}

function compareStandardNumbers(a: string, b: string): number {
  const pa = a.split('.')
  const pb = b.split('.')
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const sa = pa[i] ?? ''
    const sb = pb[i] ?? ''
    const na = Number(sa)
    const nb = Number(sb)
    if (Number.isFinite(na) && Number.isFinite(nb)) {
      if (na !== nb) return na - nb
    } else {
      if (sa !== sb) return sa < sb ? -1 : 1
    }
  }
  return 0
}

main().catch((err) => {
  console.error('FATAL unhandled', err)
  process.exit(1)
})
