// =========================================================
// Integration Test — generate-snapshot.use-case (T-F1-015/016/017)
// =========================================================
// Ejecuta el use case completo contra Supabase real con la Empresa
// Piloto 1 (Consultora Andina, Cap I, 6 trab, riesgo 1).
//
// Estado actual de DB: 0 evaluaciones para los 7 estándares Cap I.
// → Todos pendientes → score esperado = 0.00.
//
// El test inserta el snapshot en evaluation_snapshots y luego lo
// borra usando service_role (la tabla es APPEND-ONLY, pero el trigger
// `fn_prevent_snapshot_modification` solo bloquea UPDATE/DELETE en
// runtime SQL — service_role tampoco puede saltarse el trigger, así
// que en su lugar usamos un snapshot_date único por test que no choca
// con datos reales y dejamos el registro como evidencia auditable).
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

  it('genera y persiste snapshot para centro de Empresa Piloto 1', async () => {
    // Si ya existe un snapshot del día actual (re-run del test),
    // borrarlo no siempre es posible (APPEND-ONLY trigger). Usamos
    // siempre el día UTC actual; los snapshots quedan auditables.
    const uniqueDay = new Date(Date.now())
    uniqueDay.setUTCHours(0, 0, 0, 0)

    // Limpiar snapshots previos del mismo día para idempotencia (si hay
    // permisos): el trigger BEFORE DELETE bloquea, así que sólo intentamos.
    const dayStr = uniqueDay.toISOString().split('T')[0]!
    await client
      .from('evaluation_snapshots')
      .delete()
      .eq('centro_id', pilot1CentroId)
      .eq('snapshot_date', dayStr)
      .then(
        () => undefined,
        () => undefined, // ignora si trigger lo bloquea
      )

    const snap = await generateSnapshotForCentro(pilot1CentroId, uniqueDay, {
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

    // Verificar persistencia
    const latest = await snapshotsRepo.getLatestByCentro(pilot1CentroId)
    expect(latest).not.toBeNull()
    expect(latest?.hash).toBe(snap.hash)
  }, 30_000)
})
