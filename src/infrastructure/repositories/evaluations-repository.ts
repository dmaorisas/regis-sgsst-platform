// =========================================================
// Infrastructure — Evaluations Repository
// =========================================================
// Lee `standard_evaluations` filtrado por centro_id y fecha (asOf).
// asOf: incluye sólo evaluaciones cuyo `evaluated_at` <= asOf
//       (o `created_at` <= asOf si nunca se evaluó).
// Esto permite generar snapshots históricos.
// =========================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Evaluation, EvaluationStatus } from '@/domain/compliance/types'

type EvalRow = {
  id: string
  standard_id: string
  status: string
  justification: string | null
  evaluated_at: string | null
  created_at: string
}

export class EvaluationsRepository {
  constructor(private client: SupabaseClient) {}

  async getByCentro(centro_id: string, asOf: Date): Promise<Evaluation[]> {
    const asOfIso = asOf.toISOString()
    const { data, error } = await this.client
      .from('standard_evaluations')
      .select('id, standard_id, status, justification, evaluated_at, created_at')
      .eq('centro_id', centro_id)
      .is('deleted_at', null)
      .lte('created_at', asOfIso)
    if (error) {
      throw new Error(`EvaluationsRepository.getByCentro: ${error.message}`)
    }
    return (data as EvalRow[]).map((r) => ({
      standard_id: r.standard_id,
      status: r.status as EvaluationStatus,
      ...(r.justification ? { justification: r.justification } : {}),
    }))
  }
}
