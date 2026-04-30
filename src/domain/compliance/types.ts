// =========================================================
// Domain Layer — Compliance Types
// Tasks: T-F1-015 / T-F1-016 / T-F1-017
// Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/23
// =========================================================
// Tipos puros del dominio. NO dependencias de Supabase, fetch ni I/O.
// Clean Architecture (ADR-001): este archivo solo describe el lenguaje
// del problema (estándares, evaluaciones, snapshots, capítulo).
// =========================================================

/**
 * Capítulo de la Resolución 0312/2019 aplicable a una empresa.
 * - I:   ≤10 trabajadores y riesgo I-III
 * - II:  11-50 trabajadores y riesgo I-III
 * - III: >50 trabajadores O cualquier clase de riesgo IV-V
 */
export type Chapter = 'I' | 'II' | 'III'

/**
 * Ciclo PHVA (Planear / Hacer / Verificar / Actuar) al que pertenece
 * cada estándar de la Tabla de Valores del Art. 27.
 */
export type CyclePHVA = 'Planear' | 'Hacer' | 'Verificar' | 'Actuar'

/**
 * Estado de una evaluación de un estándar para un centro de trabajo.
 * - cumple    → suma su peso (potencialmente redistribuido) al score
 * - no_cumple → no suma
 * - no_aplica → su peso se redistribuye entre los aplicables
 * - pendiente → cuenta como no_cumple (no suma)
 */
export type EvaluationStatus = 'cumple' | 'no_cumple' | 'no_aplica' | 'pendiente'

/**
 * Estándar de la Resolución 0312/2019.
 *
 * `weight_capitulo_iii` es el peso oficial del Art. 27 (Cap III suma=100).
 * Para Cap I y II reusamos ese peso como base (suma <100) y la redistribución
 * normaliza por el total aplicable, así la lógica es uniforme entre capítulos.
 */
export type Standard = {
  id: string
  standard_number: string
  weight_capitulo_iii: number
  cycle_phva: CyclePHVA
  applies_chapter_i: boolean
  applies_chapter_ii: boolean
  applies_chapter_iii: boolean
}

/** Input para clasificación de capítulo. */
export type CompanyClassificationInput = {
  numero_trabajadores: number
  clase_riesgo: 1 | 2 | 3 | 4 | 5
}

/** Evaluación de un estándar para un centro/empresa, en un punto en el tiempo. */
export type Evaluation = {
  standard_id: string
  status: EvaluationStatus
  justification?: string
}

/** Detalle por estándar dentro del cálculo de score. */
export type StandardScoreDetail = {
  standard_id: string
  standard_number: string
  status: EvaluationStatus
  cycle_phva: CyclePHVA
  original_weight: number
  redistributed_weight: number
  /** redistributed_weight si status='cumple', 0 en cualquier otro caso */
  contributes_to_score: number
}

/** Distribución de score por ciclo PHVA. La suma debe igualar total_percentage. */
export type ByCycle = {
  Planear: number
  Hacer: number
  Verificar: number
  Actuar: number
}

/** Resultado completo del calculador de score. */
export type ScoreResult = {
  total_percentage: number
  total_aplicables: number
  total_evaluated: number
  total_cumple: number
  total_no_cumple: number
  total_no_aplica: number
  total_pendiente: number
  by_cycle: ByCycle
  by_standard: StandardScoreDetail[]
}

/**
 * Snapshot inmutable persistido en `evaluation_snapshots`.
 * El hash SHA-256 garantiza inmutabilidad: cualquier mutación cambia el hash.
 */
export type Snapshot = {
  centro_id: string
  company_id: string
  /** YYYY-MM-DD (zona neutra: derivado de Date.toISOString().split('T')[0]) */
  snapshot_date: string
  total_percentage: number
  by_cycle: ByCycle
  by_standard: StandardScoreDetail[]
  total_evaluated: number
  total_aplicables: number
  /** SHA-256 hex (64 chars). Determinístico sobre el contenido del snapshot. */
  hash: string
}
