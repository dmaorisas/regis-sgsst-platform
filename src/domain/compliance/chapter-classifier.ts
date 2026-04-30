// =========================================================
// Domain Layer — Chapter Classifier (T-F1-015)
// Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/23
// =========================================================
// Clasifica una empresa en Cap I/II/III según Resolución 0312/2019:
//   - III: ≥50 trabajadores O clase de riesgo IV/V
//   - II:  11-49 trabajadores y riesgo I-III
//   - I:   ≤10 trabajadores y riesgo I-III
// (Frontera 50 → Cap III según los casos test del Issue #23: 49 trab → II, 50 trab → III.)
// Función pura, sin I/O. Idempotente.
// =========================================================

import type { Chapter, CompanyClassificationInput, Standard } from './types'

export function classifyCompany(input: CompanyClassificationInput): Chapter {
  if (input.numero_trabajadores < 0) {
    throw new Error(`numero_trabajadores must be >= 0 (got ${input.numero_trabajadores})`)
  }
  if (input.clase_riesgo < 1 || input.clase_riesgo > 5) {
    throw new Error(`clase_riesgo must be 1..5 (got ${input.clase_riesgo})`)
  }

  // Riesgo IV/V fuerza Capítulo III sin importar tamaño.
  if (input.clase_riesgo >= 4) return 'III'

  // Riesgo I-III: el tamaño define el capítulo.
  if (input.numero_trabajadores >= 50) return 'III'
  if (input.numero_trabajadores >= 11) return 'II'
  return 'I'
}

/**
 * Filtra los estándares que aplican al capítulo dado.
 * El orden de salida sigue el orden de entrada (estable).
 */
export function getApplicableStandards(chapter: Chapter, allStandards: Standard[]): Standard[] {
  return allStandards.filter((s) => {
    if (chapter === 'I') return s.applies_chapter_i
    if (chapter === 'II') return s.applies_chapter_ii
    return s.applies_chapter_iii
  })
}
