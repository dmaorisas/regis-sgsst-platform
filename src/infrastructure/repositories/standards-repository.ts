// =========================================================
// Infrastructure — Standards Repository
// =========================================================
// Lee `standards_0312` desde Supabase y mapea al tipo de dominio.
// =========================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import type { CyclePHVA, Standard } from '@/domain/compliance/types'

type StandardRow = {
  id: string
  standard_number: string
  weight_capitulo_iii: number | string
  cycle_phva: string
  applies_chapter_i: boolean
  applies_chapter_ii: boolean
  applies_chapter_iii: boolean
}

export class StandardsRepository {
  constructor(private client: SupabaseClient) {}

  async getAll(): Promise<Standard[]> {
    const { data, error } = await this.client
      .from('standards_0312')
      .select(
        'id, standard_number, weight_capitulo_iii, cycle_phva, applies_chapter_i, applies_chapter_ii, applies_chapter_iii',
      )
    if (error) {
      throw new Error(`StandardsRepository.getAll: ${error.message}`)
    }
    return (data as StandardRow[]).map((r) => ({
      id: r.id,
      standard_number: r.standard_number,
      weight_capitulo_iii: Number(r.weight_capitulo_iii),
      cycle_phva: r.cycle_phva as CyclePHVA,
      applies_chapter_i: r.applies_chapter_i,
      applies_chapter_ii: r.applies_chapter_ii,
      applies_chapter_iii: r.applies_chapter_iii,
    }))
  }
}
