// =========================================================
// Infrastructure — Snapshots Repository
// =========================================================
// Inserta evaluation_snapshots (tabla APPEND-ONLY: triggers DB rechazan
// UPDATE/DELETE — D-ERD-03).
// =========================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Snapshot } from '@/domain/compliance/types'

type SnapshotRow = {
  id: string
  centro_id: string
  company_id: string
  snapshot_date: string
  total_percentage: number
  by_cycle: unknown
  by_standard: unknown
  total_evaluated: number
  total_aplicables: number
  hash: string
  created_at: string
}

export class SnapshotsRepository {
  constructor(private client: SupabaseClient) {}

  /** Inserta el snapshot. Devuelve el id generado. */
  async insert(snapshot: Snapshot): Promise<{ id: string }> {
    const { data, error } = await this.client
      .from('evaluation_snapshots')
      .insert({
        centro_id: snapshot.centro_id,
        company_id: snapshot.company_id,
        snapshot_date: snapshot.snapshot_date,
        total_percentage: snapshot.total_percentage,
        by_cycle: snapshot.by_cycle,
        by_standard: snapshot.by_standard,
        total_evaluated: snapshot.total_evaluated,
        total_aplicables: snapshot.total_aplicables,
        hash: snapshot.hash,
      })
      .select('id')
      .single()
    if (error) {
      throw new Error(`SnapshotsRepository.insert: ${error.message}`)
    }
    return { id: (data as SnapshotRow).id }
  }

  async getLatestByCentro(centro_id: string): Promise<Snapshot | null> {
    const { data, error } = await this.client
      .from('evaluation_snapshots')
      .select(
        'centro_id, company_id, snapshot_date, total_percentage, by_cycle, by_standard, total_evaluated, total_aplicables, hash',
      )
      .eq('centro_id', centro_id)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) {
      throw new Error(`SnapshotsRepository.getLatest: ${error.message}`)
    }
    if (!data) return null
    return data as Snapshot
  }
}
