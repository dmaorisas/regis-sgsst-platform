// =========================================================
// Integration Test — generate-snapshot.use-case (T-F1-015/016/017)
// =========================================================
// Ejecuta el use case completo contra Supabase real con la Empresa
// Piloto 1 (Consultora Andina, Cap I, 6 trab, riesgo 1).
//
// Bloque 4B iter 2 (R7) — fix bug 0% en Empresa 1:
//   El test original asumía DB sin evaluaciones (score=0). Tras
//   T-F1-020 (seed_demo_evaluations) la Empresa 1 tiene 6 evals con
//   score=68%, así que la aserción de 0% pasaba sólo porque el test
//   re-creaba el snapshot 0% de hoy en cada `npm test`, contaminando
//   los datos de producción y haciendo que el dashboard sirviera 0%
//   al usuario (el snapshot 0% del test ganaba `getLatestByCentro`).
//
//   Solución: el test ahora usa una fecha de corte (`asOf`) en el
//   pasado lejano (2025-01-01), ANTES de cualquier evaluación
//   sembrada. En ese corte temporal no hay evaluaciones aplicables,
//   así que el score legítimamente es 0%. El snapshot persistido
//   queda con `snapshot_date=2025-01-01` y nunca puede ganar el
//   ORDER BY del repositorio frente a snapshots reales (snapshot_date
//   actual). Es seguro re-ejecutar el test N veces sin polución.
// =========================================================

import { describe, it, expect, beforeAll } from 'vitest'
import { config as loadEnv } from 'dotenv'
import path from 'node:path'
import { getSupabaseServerClient } from '@/lib/supabase-admin'
import { CentrosRepository } from '@/infrastructure/repositories/centros-repository'
import { EvaluationsRepository } from '@/infrastructure/repositories/evaluations-repository'
import { SnapshotsRepository } from '@/infrastructure/repositories/snapshots-repository'
import { StandardsRepository } from '@/infrastructure/repositories/standards-repository'
import { generateSnapshotForCentro } from '@/application/compliance/generate-snapshot.use-case'

loadEnv({ path: path.resolve(process.cwd(), '.env.local') })

// Empresa Piloto 1 — Cap I (sembrada por scripts/seed_pilot_companies.ts)
const PILOT1_COMPANY_NIT = '900123456-7'

describe('generate-snapshot integration (Empresa Piloto 1, Cap I)', () => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    it.skip('skipped — missing SUPABASE env vars', () => {})
    return
  }

  const client = getSupabaseServerClient()
  const standardsRepo = new StandardsRepository(client)
  const evaluationsRepo = new EvaluationsRepository(client)
  const snapshotsRepo = new SnapshotsRepository(client)
  const centrosRepo = new CentrosRepository(client)

  let pilot1CentroId: string

  beforeAll(async () => {
    const { data: companyRow, error: e1 } = await client
      .from('companies')
      .select('id')
      .eq('nit', PILOT1_COMPANY_NIT)
      .single()
    if (e1 || !companyRow) {
      throw new Error(`pilot 1 company not found (nit=${PILOT1_COMPANY_NIT}): ${e1?.message}`)
    }
    const { data: centroRow, error: e2 } = await client
      .from('centros_de_trabajo')
      .select('id')
      .eq('company_id', companyRow.id)
      .limit(1)
      .single()
    if (e2 || !centroRow) {
      throw new Error(`pilot 1 centro not found for company ${companyRow.id}: ${e2?.message}`)
    }
    pilot1CentroId = centroRow.id
  })

  it('genera y persiste snapshot histórico (asOf en pasado, sin evals)', async () => {
    // Usamos un asOf en el pasado lejano. En ese corte temporal no
    // existen evaluaciones (las semillas demo se crean el día actual),
    // por lo que el score legítimamente es 0%. Como `snapshot_date` es
    // antiguo, este snapshot NUNCA puede ganar el ORDER BY de
    // `getLatestByCentro` frente a snapshots reales del día de hoy.
    const asOf = new Date('2025-01-01T00:00:00.000Z')
    const dayStr = asOf.toISOString().split('T')[0]!

    const snap = await generateSnapshotForCentro(pilot1CentroId, asOf, {
      standardsRepo,
      evaluationsRepo,
      snapshotsRepo,
      centrosRepo,
    })

    expect(snap.centro_id).toBe(pilot1CentroId)
    expect(snap.snapshot_date).toBe(dayStr)
    // Cap I tiene 7 estándares; sin evaluaciones → todos pendientes → 0%
    expect(snap.total_percentage).toBe(0)
    expect(snap.total_aplicables).toBe(7) // todos cuentan: ninguno no_aplica
    expect(snap.total_evaluated).toBe(0)
    expect(snap.by_standard.length).toBe(7)
    expect(snap.hash).toMatch(/^[0-9a-f]{64}$/)

    // Verificar persistencia POR HASH (no por getLatestByCentro: ya
    // hay snapshots más recientes de seeds reales que ganarían el ORDER BY).
    // Usamos `select(...,{count})` y limit(1) porque la tabla es
    // APPEND-ONLY: re-runs del test acumulan filas con el mismo hash en
    // 2025-01-01, así que `maybeSingle()` fallaría con PGRST116.
    const { data: persisted, error: pErr } = await client
      .from('evaluation_snapshots')
      .select('hash, snapshot_date, total_percentage, total_evaluated')
      .eq('centro_id', pilot1CentroId)
      .eq('snapshot_date', dayStr)
      .eq('hash', snap.hash)
      .limit(1)
    expect(pErr).toBeNull()
    expect(persisted).not.toBeNull()
    expect(persisted?.length ?? 0).toBeGreaterThanOrEqual(1)
    expect(persisted?.[0]?.hash).toBe(snap.hash)
  }, 30_000)
})
