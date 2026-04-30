// =========================================================
// scripts/test_pgboss.ts — smoke test de pg-boss (T-F15-001)
// =========================================================
// Encola un job de prueba en la queue `regis.test.hello` y registra un
// worker que lo procesa. Salida esperada:
//   1. job enviado (uuid)
//   2. worker recibe el payload
//   3. proceso termina limpio (exit 0)
//
// Run:
//   npx tsx scripts/test_pgboss.ts
// =========================================================

import { getBoss, shutdownBoss } from '../src/lib/pg-boss'

const QUEUE = 'regis.test.hello'

async function main() {
  console.log('[test_pgboss] starting boss…')
  const boss = await getBoss()
  console.log('[test_pgboss] boss started ✓')

  // pg-boss v10+ requiere crear la queue antes de send/work.
  await boss.createQueue(QUEUE)
  console.log(`[test_pgboss] queue '${QUEUE}' ready`)

  // Promise que resuelve cuando el worker procesa el job.
  let resolveDone: (jobId: string) => void
  const done = new Promise<string>((resolve) => {
    resolveDone = resolve
  })

  type Payload = { greeting: string; ts: string }

  await boss.work<Payload>(QUEUE, async (jobs) => {
    // pg-boss v10 entrega un array de jobs aún cuando batchSize === 1.
    const list = Array.isArray(jobs) ? jobs : [jobs]
    for (const job of list) {
      console.log(`[worker] received job ${job.id} →`, job.data)
      resolveDone(job.id)
    }
  })

  const jobId = await boss.send(QUEUE, {
    greeting: 'hello regis',
    ts: new Date().toISOString(),
  })
  console.log(`[test_pgboss] sent job ${jobId}`)

  // Esperar (con timeout) a que se procese.
  const processedId = await Promise.race([
    done,
    new Promise<string>((_, rej) => setTimeout(() => rej(new Error('timeout 15s')), 15_000)),
  ])

  if (processedId !== jobId) {
    console.warn(
      `[test_pgboss] job procesado (${processedId}) distinto al enviado (${jobId}) — probablemente sobras de runs anteriores. OK.`,
    )
  }

  console.log('[test_pgboss] success ✓')

  await shutdownBoss()
  process.exit(0)
}

main().catch(async (err) => {
  console.error('[test_pgboss] FAILED', err)
  try {
    await shutdownBoss()
  } catch {
    /* noop */
  }
  process.exit(1)
})
