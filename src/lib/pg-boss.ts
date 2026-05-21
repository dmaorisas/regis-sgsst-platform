// =========================================================
// pg-boss singleton (cola de jobs sobre Postgres)
// =========================================================
// pg-boss usa la misma DB de Postgres que la app y crea su propio schema
// (`pgboss`) con tablas internas (job, queue, schedule, etc.). No
// requiere Redis ni broker externo — apropiado para Regis SG-SST que
// ejecuta < 100 jobs/día (extracción de PDFs, generación de actas,
// envíos de notificaciones).
//
// Ver ADR-005 (job-queue-pg-boss) para la decisión de arquitectura.
//
// IMPORTANTE: usa SUPABASE_DB_URL_DIRECT (pooler) — pg-boss necesita
// una conexión Postgres real, no la API de Supabase. La URL incluye
// usuario `postgres.<project-ref>` y password.
// =========================================================

import { PgBoss } from 'pg-boss'
import { config as loadEnv } from 'dotenv'
import path from 'node:path'
import { createLogger } from '@/lib/logger'

const log = createLogger({ module: 'pg-boss' })

// Asegura que .env.local esté cargado en scripts/CLI. En Next.js runtime
// las env vars ya vienen desde el proceso, este loadEnv es no-op si la
// var ya existe.
loadEnv({ path: path.resolve(process.cwd(), '.env.local') })

let bossInstance: PgBoss | null = null
let startingPromise: Promise<PgBoss> | null = null

/**
 * Devuelve la instancia singleton de pg-boss, iniciada y lista para
 * usar (`send`, `work`, `schedule`, etc.). La primera invocación crea
 * el schema `pgboss` si no existe. Reentrante y safe para concurrencia.
 */
export async function getBoss(): Promise<PgBoss> {
  if (bossInstance) return bossInstance
  if (startingPromise) return startingPromise

  const url = process.env.SUPABASE_DB_URL_DIRECT
  if (!url) {
    throw new Error(
      'SUPABASE_DB_URL_DIRECT missing — pg-boss requires a direct Postgres URL. ' +
        'Add it to .env.local (see .env.example).',
    )
  }

  startingPromise = (async () => {
    const boss = new PgBoss(url)
    boss.on('error', (err: unknown) => {
      // pg-boss emite errores transitorios (reconexión, etc.). No los
      // tratamos como fatales — solo log.
      log.error({ err }, 'pg-boss error event')
    })
    await boss.start()

    // Crear las colas requeridas por la aplicación (requerido por pg-boss v10+ antes de work/send)
    await boss.createQueue('send_email')
    await boss.createQueue('check_equipment_expiry')
    await boss.createQueue('generate_monthly_logs')
    await boss.createQueue('consultant_weekly_pending')
    await boss.createQueue('consultant_weekly_summary')

    bossInstance = boss
    return boss
  })()

  try {
    return await startingPromise
  } finally {
    startingPromise = null
  }
}

/**
 * Detiene la instancia activa. Llamar al apagar el proceso (CLI scripts)
 * o en hooks de teardown de tests. En Next.js runtime no hace falta —
 * el proceso vive mientras lo haga el server.
 */
export async function shutdownBoss(): Promise<void> {
  if (bossInstance) {
    await bossInstance.stop({ graceful: true, timeout: 5_000 })
    bossInstance = null
  }
}
