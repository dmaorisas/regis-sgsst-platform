// =========================================================
// Application — Generate Snapshot Use Case
// Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/23
// =========================================================
// Orquesta el motor de cumplimiento contra repositorios reales:
//   centro → company → chapter → applicable standards → evaluations
//   → score → snapshot → persist.
//
// Las dependencias se inyectan por argumento (Clean Architecture):
// permite testear con mocks o con repos reales contra Supabase.
// =========================================================

import {
  calculateScore,
  classifyCompany,
  generateSnapshot,
  getApplicableStandards,
  type Snapshot,
} from '@/domain/compliance'
import type { CentrosRepository } from '@/infrastructure/repositories/centros-repository'
import type { EvaluationsRepository } from '@/infrastructure/repositories/evaluations-repository'
import type { SnapshotsRepository } from '@/infrastructure/repositories/snapshots-repository'
import type { StandardsRepository } from '@/infrastructure/repositories/standards-repository'

export type GenerateSnapshotDeps = {
  standardsRepo: StandardsRepository
  evaluationsRepo: EvaluationsRepository
  snapshotsRepo: SnapshotsRepository
  centrosRepo: CentrosRepository
}

/**
 * Genera y persiste un snapshot para `centro_id` con corte en `asOf`.
 * Devuelve el snapshot completo (con hash). El id de la fila DB no se
 * expone aquí: el hash + (centro_id, snapshot_date) lo identifican.
 */
export async function generateSnapshotForCentro(
  centro_id: string,
  asOf: Date,
  deps: GenerateSnapshotDeps,
): Promise<Snapshot> {
  const centro = await deps.centrosRepo.getById(centro_id)
  const company = await deps.centrosRepo.getCompany(centro.company_id)

  const chapter = classifyCompany({
    numero_trabajadores: company.numero_trabajadores,
    clase_riesgo: company.clase_riesgo,
  })

  const allStandards = await deps.standardsRepo.getAll()
  const applicable = getApplicableStandards(chapter, allStandards)

  const evaluations = await deps.evaluationsRepo.getByCentro(centro_id, asOf)
  const scoreResult = calculateScore(applicable, evaluations)

  const snapshot_date = asOf.toISOString().split('T')[0]!
  const snapshot = generateSnapshot(centro_id, company.id, snapshot_date, scoreResult)

  await deps.snapshotsRepo.insert(snapshot)
  return snapshot
}
