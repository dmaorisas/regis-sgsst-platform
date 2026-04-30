// =========================================================
// Infrastructure — Centros Repository
// =========================================================
// Lee centros_de_trabajo + companies para alimentar el use case.
// =========================================================

import type { SupabaseClient } from '@supabase/supabase-js'

export type CentroRow = {
  id: string
  company_id: string
  nombre: string
}

export type CompanyRow = {
  id: string
  razon_social: string
  numero_trabajadores: number
  clase_riesgo: 1 | 2 | 3 | 4 | 5
}

export class CentrosRepository {
  constructor(private client: SupabaseClient) {}

  async getById(centro_id: string): Promise<CentroRow> {
    const { data, error } = await this.client
      .from('centros_de_trabajo')
      .select('id, company_id, nombre')
      .eq('id', centro_id)
      .single()
    if (error) {
      throw new Error(`CentrosRepository.getById: ${error.message}`)
    }
    return data as CentroRow
  }

  async getCompany(company_id: string): Promise<CompanyRow> {
    const { data, error } = await this.client
      .from('companies')
      .select('id, razon_social, numero_trabajadores, clase_riesgo')
      .eq('id', company_id)
      .single()
    if (error) {
      throw new Error(`CentrosRepository.getCompany: ${error.message}`)
    }
    return data as CompanyRow
  }
}
