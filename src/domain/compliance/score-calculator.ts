// =========================================================
// Domain Layer — Score Calculator (T-F1-016 🔥 CRÍTICA)
// Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/23
// =========================================================
// Calcula el % de cumplimiento aplicando redistribución de pesos
// cuando hay estándares con status='no_aplica'.
//
// Especificación matemática:
//   sum_no_aplica = Σ peso_original(s) where status='no_aplica'
//   sum_base      = Σ peso_original(s) for s ∈ standards (todos los aplicables)
//   total_aplicable = sum_base − sum_no_aplica
//
//   Si total_aplicable = 0 (todos no_aplica o no hay estándares):
//     score = 100  (decisión documentada en el reporte; "no hay nada
//                   que evaluar" → empresa cumple por vacuidad)
//
//   En caso contrario:
//     factor = sum_base / total_aplicable
//     peso_redistribuido(s) = peso_original(s) * factor (s no es no_aplica)
//     score = Σ peso_redistribuido(s) where status='cumple'
//
// Notas críticas:
//   - 'pendiente' cuenta como 'no_cumple' (no suma).
//   - Para Cap III sum_base = 100, así factor = 100/total_aplicable
//     coincide con la fórmula del Issue. Para Cap I/II sum_base ≠ 100,
//     entonces normalizamos: factor = sum_base/total_aplicable, y el score
//     final lo escalamos a la base 100 dividiendo por sum_base * 100.
//     → Equivalente: score(0..100) = (Σ peso_original(s cumple no aplica)) / total_aplicable * 100
//
// Precisión: usamos decimal.js (38 dígitos) y redondeamos al final a
// 2 decimales (toFixed(2)). Esto evita el drift 0.1+0.2 ≠ 0.3.
// =========================================================

import Decimal from 'decimal.js'
import type {
  ByCycle,
  CyclePHVA,
  Evaluation,
  EvaluationStatus,
  ScoreResult,
  Standard,
  StandardScoreDetail,
} from './types'

// 38 dígitos significativos cubre con holgura sumas de 60 weights * factor.
Decimal.set({ precision: 38, rounding: Decimal.ROUND_HALF_UP })

/** Redondea a 2 decimales y devuelve number. Half-up. */
function round2(d: Decimal): number {
  return Number(d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toString())
}

const PHVA_KEYS: ReadonlyArray<CyclePHVA> = ['Planear', 'Hacer', 'Verificar', 'Actuar']

const STATUSES: ReadonlyArray<EvaluationStatus> = ['cumple', 'no_cumple', 'no_aplica', 'pendiente']

/**
 * Calcula el resultado de cumplimiento para un conjunto de estándares
 * aplicables y sus evaluaciones.
 *
 * Garantías de invariante (verificadas en tests):
 *  - sum(by_cycle.*) === total_percentage  (con tolerancia 0.01 por redondeo)
 *  - by_standard.length === standards.length
 *  - by_standard ordenado por standard_number ascendente y estable
 *  - 0 ≤ total_percentage ≤ 100
 *
 * @param standards   estándares aplicables al capítulo de la empresa
 * @param evaluations evaluaciones (puede contener evaluaciones de estándares
 *                    no aplicables; se ignoran). Si un estándar aplicable no
 *                    tiene evaluación → status='pendiente' por defecto.
 */
export function calculateScore(standards: Standard[], evaluations: Evaluation[]): ScoreResult {
  if (!Array.isArray(standards)) {
    throw new Error('standards must be an array')
  }
  if (!Array.isArray(evaluations)) {
    throw new Error('evaluations must be an array')
  }

  // Index de evaluaciones por standard_id (la última gana si hay duplicados).
  const evalByStandard = new Map<string, Evaluation>()
  for (const e of evaluations) {
    if (!STATUSES.includes(e.status)) {
      throw new Error(`invalid evaluation status: ${String(e.status)}`)
    }
    evalByStandard.set(e.standard_id, e)
  }

  // 1) Resolver status efectivo por estándar aplicable.
  //    Estándar sin evaluación → 'pendiente' (= no_cumple para score).
  type ResolvedStandard = {
    std: Standard
    status: EvaluationStatus
    weight: Decimal // peso_original
  }
  const resolved: ResolvedStandard[] = standards.map((std) => {
    if (typeof std.weight_capitulo_iii !== 'number' || std.weight_capitulo_iii < 0) {
      throw new Error(
        `standard ${std.standard_number} has invalid weight: ${std.weight_capitulo_iii}`,
      )
    }
    const ev = evalByStandard.get(std.id)
    return {
      std,
      status: ev?.status ?? 'pendiente',
      weight: new Decimal(std.weight_capitulo_iii),
    }
  })

  // 2) Sumas base.
  const sumBase = resolved.reduce((acc, r) => acc.plus(r.weight), new Decimal(0))
  const sumNoAplica = resolved
    .filter((r) => r.status === 'no_aplica')
    .reduce((acc, r) => acc.plus(r.weight), new Decimal(0))
  const totalAplicable = sumBase.minus(sumNoAplica)

  // 3) Factor de redistribución.
  //    Si no hay nada para evaluar → score 100 por vacuidad (decisión R7).
  //    factor solo se aplica a estándares con status != no_aplica.
  let factor: Decimal
  if (totalAplicable.isZero()) {
    factor = new Decimal(0) // estándares no_aplica reciben 0 igualmente
  } else {
    factor = sumBase.dividedBy(totalAplicable)
  }

  // 4) Detalle por estándar y acumuladores.
  const details: Array<StandardScoreDetail & { _redistD: Decimal }> = []
  let scoreD = new Decimal(0)
  const counts: Record<EvaluationStatus, number> = {
    cumple: 0,
    no_cumple: 0,
    no_aplica: 0,
    pendiente: 0,
  }
  const byCycleD: Record<CyclePHVA, Decimal> = {
    Planear: new Decimal(0),
    Hacer: new Decimal(0),
    Verificar: new Decimal(0),
    Actuar: new Decimal(0),
  }

  for (const r of resolved) {
    counts[r.status] += 1

    let redistributed: Decimal
    let contributes: Decimal
    if (r.status === 'no_aplica') {
      redistributed = new Decimal(0)
      contributes = new Decimal(0)
    } else {
      redistributed = r.weight.times(factor)
      contributes = r.status === 'cumple' ? redistributed : new Decimal(0)
    }

    scoreD = scoreD.plus(contributes)
    byCycleD[r.std.cycle_phva] = byCycleD[r.std.cycle_phva].plus(contributes)

    details.push({
      _redistD: redistributed,
      standard_id: r.std.id,
      standard_number: r.std.standard_number,
      status: r.status,
      cycle_phva: r.std.cycle_phva,
      original_weight: round2(r.weight),
      redistributed_weight: round2(redistributed),
      contributes_to_score: round2(contributes),
    })
  }

  // Caso "todos no_aplica" o standards.length=0:
  // total_aplicable = 0 → no hay estándares para evaluar → score = 100
  // (vacuidad lógica). Documentado en el reporte de ejecución (R7).
  let totalPctD: Decimal
  if (totalAplicable.isZero()) {
    totalPctD = new Decimal(100)
  } else {
    // Normalizar a base 100 dividiendo por sum_base.
    // Para Cap III sum_base=100 → no cambia.
    // Para Cap I/II sum_base<100 → escala correctamente.
    totalPctD = scoreD.dividedBy(sumBase).times(100)
  }

  // by_cycle también debe escalarse a base 100.
  const byCycle: ByCycle = {
    Planear: 0,
    Hacer: 0,
    Verificar: 0,
    Actuar: 0,
  }
  if (totalAplicable.isZero()) {
    // Distribución vacía: el 100 no se asigna a un ciclo concreto.
    // Convención: dejar 0 en cada ciclo. Documentado.
    for (const k of PHVA_KEYS) byCycle[k] = 0
  } else {
    for (const k of PHVA_KEYS) {
      byCycle[k] = round2(byCycleD[k].dividedBy(sumBase).times(100))
    }
  }

  // Ordenar by_standard por standard_number (orden estable, comparación
  // segmentada para que '1.10.1' > '1.2.1' como en numeración jerárquica).
  details.sort((a, b) => compareStandardNumbers(a.standard_number, b.standard_number))

  // total_evaluated: ítems con status diferente a 'pendiente'
  const totalEvaluated = counts.cumple + counts.no_cumple + counts.no_aplica

  // Drop helper field _redistD del output final.
  const byStandard: StandardScoreDetail[] = details.map((d) => ({
    standard_id: d.standard_id,
    standard_number: d.standard_number,
    status: d.status,
    cycle_phva: d.cycle_phva,
    original_weight: d.original_weight,
    redistributed_weight: d.redistributed_weight,
    contributes_to_score: d.contributes_to_score,
  }))

  return {
    total_percentage: round2(totalPctD),
    total_aplicables: standards.length - counts.no_aplica,
    total_evaluated: totalEvaluated,
    total_cumple: counts.cumple,
    total_no_cumple: counts.no_cumple,
    total_no_aplica: counts.no_aplica,
    total_pendiente: counts.pendiente,
    by_cycle: byCycle,
    by_standard: byStandard,
  }
}

/**
 * Compara dos standard_numbers como secuencias jerárquicas: '1.2.10' > '1.2.9'.
 * Cae a comparación lex si algún segmento no es numérico.
 */
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
