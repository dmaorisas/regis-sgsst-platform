// =========================================================
// scripts/worker.ts — Demonio de fondo para pg-boss workers
// =========================================================
// Ejecuta y mantiene vivos los workers de pg-boss:
//   1. send_email (notificaciones por correo)
//   2. check_equipment_expiry (cron diario de vencimientos)
//
// Run:
//   npx tsx scripts/worker.ts
// =========================================================

import { getBoss, shutdownBoss } from '@/lib/pg-boss'
import { registerSendEmailWorker } from '@/lib/jobs/send-email'
import { registerEquipmentExpiryWorker } from '@/lib/jobs/equipment-expiry-check'
import { registerMonthlyLogWorker } from '@/lib/jobs/monthly-log-job'
import {
  registerConsultantWeeklyPendingWorker,
  registerConsultantWeeklySummaryWorker,
} from '@/lib/jobs/consultant-weekly-reports'
import { createLogger } from '@/lib/logger'

const log = createLogger({ module: 'scripts:worker' })

async function main() {
  log.info('Iniciando demonio de workers pg-boss...')

  const _boss = await getBoss()

  // Registrar workers
  await registerSendEmailWorker()
  await registerEquipmentExpiryWorker()
  await registerMonthlyLogWorker()
  await registerConsultantWeeklyPendingWorker()
  await registerConsultantWeeklySummaryWorker()

  log.info('Workers registrados y activos. Presiona Ctrl+C para detener.')

  // Manejar apagado ordenado
  process.on('SIGINT', async () => {
    log.info('Deteniendo daemon de workers...')
    await shutdownBoss()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    log.info('Deteniendo daemon de workers...')
    await shutdownBoss()
    process.exit(0)
  })
}

main().catch(async (err) => {
  log.error({ err }, 'Fallo crítico en el demonio de workers')
  try {
    await shutdownBoss()
  } catch {
    /* noop */
  }
  process.exit(1)
})
