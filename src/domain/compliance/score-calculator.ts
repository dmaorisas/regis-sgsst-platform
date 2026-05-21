// =========================================================
// Domain Layer — Score Calculator (T-F1-016 🔥 CRÍTICA)
// Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/23
// =========================================================
// Calcula el % de cumplimiento según la estructura oficial de la
// Resolución 0312 de 2019 con jerarquía de 7 macroestándares.
//
// Especificación matemática requerida:
//   1. Agrupar estándares aplicables por los 7 Macroestándares con sus pesos oficiales:
//      - Recursos → 10% (Planear)
//      - Gestión integral SG-SST → 15% (Planear)
//      - Gestión de la salud → 20% (Hacer)
//      - Gestión de peligros y riesgos → 30% (Hacer)
//      - Gestión de amenazas → 10% (Hacer)
//      - Verificación → 5% (Verificar)
//      - Mejoramiento → 10% (Actuar)
//
//   2. Para cada macroestándar, excluir los estándares con status='no_aplica'.
//      - avance_interno = cumple_count / (total_standards_in_macro - no_aplica_count)
//      - aporte = peso_oficial * avance_interno
//
//   3. El cumplimiento total es la suma ponderada de macroestándares,
//      excluyendo aquellos que no tienen ningún estándar aplicable (weight redistribution):
//      - total_percentage = sum(aporte) / sum(peso_oficial de macros activos) * 100
//
// Precisión: usamos decimal.js (38 dígitos) y redondeamos al final a
// 2 decimales (toFixed(2)). Esto evita el drift de precisión.
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

// 38 dígitos significativos cubren con holgura todas las operaciones.
Decimal.set({ precision: 38, rounding: Decimal.ROUND_HALF_UP })

/** Redondea a 2 decimales y devuelve number. Half-up. */
function round2(d: Decimal): number {
  return Number(d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toString())
}

const PHVA_KEYS: ReadonlyArray<CyclePHVA> = ['Planear', 'Hacer', 'Verificar', 'Actuar']
const STATUSES: ReadonlyArray<EvaluationStatus> = ['cumple', 'no_cumple', 'no_aplica', 'pendiente']

export type MacroInfo = {
  name: string
  weight: number
  cycle: CyclePHVA
}

// 7 Macroestándares oficiales y sus pesos definidos por la Resolución 0312
export const MACRO_STANDARDS_INFO: ReadonlyArray<MacroInfo> = [
  { name: 'Recursos', weight: 10, cycle: 'Planear' },
  { name: 'Gestión integral SG-SST', weight: 15, cycle: 'Planear' },
  { name: 'Gestión de la salud', weight: 20, cycle: 'Hacer' },
  { name: 'Gestión de peligros y riesgos', weight: 30, cycle: 'Hacer' },
  { name: 'Gestión de amenazas', weight: 10, cycle: 'Hacer' },
  { name: 'Verificación', weight: 5, cycle: 'Verificar' },
  { name: 'Mejoramiento', weight: 10, cycle: 'Actuar' },
]

/** Maps a standard number (e.g. '1.1.1', '4.2.3') to its official macro-standard name. */
export function getMacroForStandard(stdNum: string): string {
  if (stdNum.startsWith('1.1.') || stdNum.startsWith('1.2.')) {
    return 'Recursos'
  }
  if (stdNum.startsWith('2.')) {
    return 'Gestión integral SG-SST'
  }
  if (stdNum.startsWith('3.')) {
    return 'Gestión de la salud'
  }
  if (stdNum.startsWith('4.')) {
    return 'Gestión de peligros y riesgos'
  }
  if (stdNum.startsWith('5.')) {
    return 'Gestión de amenazas'
  }
  if (stdNum.startsWith('6.')) {
    return 'Verificación'
  }
  if (stdNum.startsWith('7.')) {
    return 'Mejoramiento'
  }
  return 'Otros'
}

/**
 * Calcula el resultado de cumplimiento jerárquico según Resolución 0312 de 2019.
 *
 * @param standards   estándares aplicables al capítulo de la empresa
 * @param evaluations evaluaciones registradas
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

  // 1) Agrupar y resolver el estado de cada estándar aplicable
  type ResolvedStandard = {
    std: Standard
    status: EvaluationStatus
    macroName: string
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
      macroName: getMacroForStandard(std.standard_number),
    }
  })

  // Contadores generales de estado
  const counts = { cumple: 0, no_cumple: 0, no_aplica: 0, pendiente: 0 }
  for (const r of resolved) {
    counts[r.status] += 1
  }

  // 2) Calcular estadísticas de avance por Macroestándar
  type MacroStats = {
    info: MacroInfo
    allStandards: ResolvedStandard[]
    applicableStandards: ResolvedStandard[]
    cumpleCount: number
    isActive: boolean
    avanceInterno: Decimal
    aporte: Decimal
  }

  const macroStatsList: MacroStats[] = MACRO_STANDARDS_INFO.map((macro) => {
    const allInMacro = resolved.filter((r) => r.macroName === macro.name)
    const applicableInMacro = allInMacro.filter((r) => r.status !== 'no_aplica')
    const cumpleInMacro = applicableInMacro.filter((r) => r.status === 'cumple')

    const hasStandards = allInMacro.length > 0
    const hasApplicable = applicableInMacro.length > 0
    const isActive = hasStandards && hasApplicable

    let avanceInterno = new Decimal(0)
    let aporte = new Decimal(0)

    if (isActive) {
      avanceInterno = new Decimal(cumpleInMacro.length).dividedBy(applicableInMacro.length)
      aporte = new Decimal(macro.weight).times(avanceInterno)
    } else if (hasStandards && !hasApplicable) {
      // Si tiene estándares pero todos son no_aplica, se considera 100% de avance por vacuidad interna,
      // pero no se contará como macroestándar "activo" para no sesgar el denominador de redistribución
      avanceInterno = new Decimal(1)
      aporte = new Decimal(macro.weight)
    }

    return {
      info: macro,
      allStandards: allInMacro,
      applicableStandards: applicableInMacro,
      cumpleCount: cumpleInMacro.length,
      isActive,
      avanceInterno,
      aporte,
    }
  })

  // 3) Determinar la suma de pesos de macroestándares activos para redistribución (Denominador)
  const activeMacros = macroStatsList.filter((m) => m.isActive)
  const wActive = activeMacros.reduce((acc, m) => acc.plus(m.info.weight), new Decimal(0))

  // Calcular el porcentaje total de cumplimiento
  let totalPctD = new Decimal(0)
  if (wActive.gt(0)) {
    const sumAportes = activeMacros.reduce((acc, m) => acc.plus(m.aporte), new Decimal(0))
    totalPctD = sumAportes.dividedBy(wActive).times(100)
  } else {
    // Si no hay estándares aplicables en toda la empresa (todos no_aplica o lista vacía)
    totalPctD = new Decimal(100)
  }

  // 4) Calcular contribuciones individuales para cada estándar aplicable y ciclo
  //    Para mantener la compatibilidad y los invariantes del sistema:
  //      - original_weight de un estándar = peso_macro / cantidad_total_estándares_en_macro
  //      - redistributed_weight de un estándar = (peso_macro / cantidad_aplicables_en_macro) * (100 / wActive)
  //      - contributes_to_score = redistributed_weight si status='cumple' de lo contrario 0
  const details: Array<StandardScoreDetail & { _redistD: Decimal }> = []
  const byCycleD: Record<CyclePHVA, Decimal> = {
    Planear: new Decimal(0),
    Hacer: new Decimal(0),
    Verificar: new Decimal(0),
    Actuar: new Decimal(0),
  }

  for (const r of resolved) {
    const mStats = macroStatsList.find((m) => m.info.name === r.macroName)
    if (!mStats) {
      // Estándar huérfano (no debería ocurrir con los seeds correctos)
      details.push({
        _redistD: new Decimal(0),
        standard_id: r.std.id,
        standard_number: r.std.standard_number,
        status: r.status,
        cycle_phva: r.std.cycle_phva,
        original_weight: 0,
        redistributed_weight: 0,
        contributes_to_score: 0,
      })
      continue
    }

    const totalInMacro = mStats.allStandards.length
    const applInMacro = mStats.applicableStandards.length
    const macroWeight = new Decimal(mStats.info.weight)

    let origWeightD = new Decimal(0)
    let redistWeightD = new Decimal(0)
    let contributesD = new Decimal(0)

    if (totalInMacro > 0) {
      origWeightD = macroWeight.dividedBy(totalInMacro)
    }

    if (r.status !== 'no_aplica' && applInMacro > 0 && wActive.gt(0)) {
      redistWeightD = macroWeight.dividedBy(applInMacro).times(new Decimal(100).dividedBy(wActive))
      contributesD = r.status === 'cumple' ? redistWeightD : new Decimal(0)
    }

    byCycleD[r.std.cycle_phva] = byCycleD[r.std.cycle_phva].plus(contributesD)

    details.push({
      _redistD: redistWeightD,
      standard_id: r.std.id,
      standard_number: r.std.standard_number,
      status: r.status,
      cycle_phva: r.std.cycle_phva,
      original_weight: round2(origWeightD),
      redistributed_weight: round2(redistWeightD),
      contributes_to_score: round2(contributesD),
    })
  }

  // by_cycle consolidada en base 100
  const byCycle: ByCycle = {
    Planear: 0,
    Hacer: 0,
    Verificar: 0,
    Actuar: 0,
  }
  for (const k of PHVA_KEYS) {
    byCycle[k] = round2(byCycleD[k])
  }

  // Ordenar by_standard por standard_number (orden estable jerárquico)
  details.sort((a, b) => compareStandardNumbers(a.standard_number, b.standard_number))

  // total_evaluated: ítems evaluados (con status diferente a 'pendiente')
  const totalEvaluated = counts.cumple + counts.no_cumple + counts.no_aplica

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
export function compareStandardNumbers(a: string, b: string): number {
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
