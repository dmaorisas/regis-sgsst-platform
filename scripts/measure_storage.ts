/**
 * T-F15-014 (F1.5-D): mide DB + Storage size, inserta en storage_metrics, alerta si >80%
 *
 * Run:
 *   npx tsx scripts/measure_storage.ts
 *   npx tsx scripts/measure_storage.ts --source=cron
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const FREE_TIER_DB_LIMIT_BYTES = 524_288_000 // 500MB
// FREE_TIER_STORAGE_LIMIT_BYTES = 1_073_741_824 — usado por workflow n8n storage-monitor
const ALERT_THRESHOLD_PERCENT = 80

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const TABLES_TO_COUNT = [
  'companies',
  'centros_de_trabajo',
  'workers',
  'standard_evaluations',
  'evaluation_snapshots',
  'documents',
  'audit_log',
  'ai_usage',
  'notifications',
  'consents',
  'ai_outputs_pending_review',
] as const

function prettyBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

async function measureDbSize(): Promise<{ size: number; pretty: string }> {
  const { data, error } = await supabase.rpc('get_db_size')
  if (error || !data) {
    // Fallback: use pg_database_size via raw query if RPC not available
    // For free tier, we estimate from row counts
    return { size: 0, pretty: 'unknown (RPC not configured)' }
  }
  return { size: data as number, pretty: prettyBytes(data as number) }
}

async function countRowsPerTable(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  for (const table of TABLES_TO_COUNT) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
    if (!error) counts[table] = count ?? 0
  }
  return counts
}

async function main() {
  const args = process.argv.slice(2)
  const source = args.find((a) => a.startsWith('--source='))?.split('=')[1] ?? 'manual'

  console.log('[measure_storage] Starting measurement...')
  console.log(`[measure_storage] Source: ${source}`)

  const dbMeasurement = await measureDbSize()
  const rowCounts = await countRowsPerTable()
  const totalRows = Object.values(rowCounts).reduce((s, n) => s + n, 0)

  // Estimate DB size if RPC not available (fallback): ~1KB per row average
  const estimatedDbSize = dbMeasurement.size > 0 ? dbMeasurement.size : totalRows * 1024
  const dbUsagePercent = (estimatedDbSize / FREE_TIER_DB_LIMIT_BYTES) * 100

  // Storage measurement: not implemented (Supabase Storage no tiene RPC público)
  const storageSize: number | null = null
  const storageUsagePercent: number | null = null

  const alertTriggered =
    dbUsagePercent > ALERT_THRESHOLD_PERCENT ||
    (storageUsagePercent !== null && storageUsagePercent > ALERT_THRESHOLD_PERCENT)

  const alertReason = alertTriggered
    ? `DB at ${dbUsagePercent.toFixed(1)}%${
        storageUsagePercent !== null ? `, Storage at ${storageUsagePercent.toFixed(1)}%` : ''
      }`
    : null

  console.log(
    `[measure_storage] DB: ${prettyBytes(estimatedDbSize)} (${dbUsagePercent.toFixed(2)}%)`,
  )
  console.log(`[measure_storage] Total rows: ${totalRows}`)
  console.log(`[measure_storage] Alert: ${alertTriggered}`)

  const { data, error } = await supabase
    .from('storage_metrics')
    .insert({
      db_size_bytes: estimatedDbSize,
      db_size_pretty: dbMeasurement.pretty || prettyBytes(estimatedDbSize),
      db_usage_percent: parseFloat(dbUsagePercent.toFixed(2)),
      storage_size_bytes: storageSize,
      storage_size_pretty: storageSize !== null ? prettyBytes(storageSize) : null,
      storage_usage_percent: storageUsagePercent,
      total_rows_per_table: rowCounts,
      alert_triggered: alertTriggered,
      alert_reason: alertReason,
      source,
    })
    .select()
    .single()

  if (error) {
    console.error('[measure_storage] Insert failed:', error)
    process.exit(1)
  }

  console.log(`[measure_storage] Inserted metric ID: ${data.id}`)

  if (alertTriggered) {
    console.warn('[measure_storage] ALERT — supervisor should be notified via NotificationService')
    // En F1.5-D no llamamos directamente; el workflow n8n se encarga de eso
  }

  console.log('[measure_storage] Done.')
}

main().catch((e) => {
  console.error('[measure_storage] Fatal:', e)
  process.exit(1)
})
