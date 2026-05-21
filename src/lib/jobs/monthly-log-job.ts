import { getBoss } from '@/lib/pg-boss'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import { MonthlyLogGenerator } from '../ai/monthly-log-generator'
import { createLogger } from '@/lib/logger'

const log = createLogger({ module: 'jobs:generate_monthly_logs' })

let registered = false

/**
 * Registra el worker para generar bitácoras mensuales automáticas
 * y lo programa para ejecutarse todas las noches a las 11:30 PM.
 */
export async function registerMonthlyLogWorker(): Promise<void> {
  if (registered) return

  try {
    const boss = await getBoss()

    // 1. Registrar el worker
    await boss.work('generate_monthly_logs', async () => {
      await runMonthlyLogGeneration()
    })

    // 2. Programar el cron job para ejecutarse todos los días a las 11:30 PM
    await boss.schedule('generate_monthly_logs', '30 23 * * *')

    registered = true
    log.info('generate_monthly_logs worker registered and scheduled successfully')
  } catch (e) {
    log.error({ err: e }, 'failed to register generate_monthly_logs worker')
  }
}

/**
 * Verifica si la fecha dada es el último día de su mes.
 */
export function isLastDayOfMonth(date: Date): boolean {
  const tomorrow = new Date(date.getTime())
  tomorrow.setDate(date.getDate() + 1)
  return tomorrow.getMonth() !== date.getMonth()
}

/**
 * Lógica principal del job:
 * Si es el último día del mes, genera las bitácoras de todas las empresas.
 */
export async function runMonthlyLogGeneration(
  forceDate?: Date,
  forceOverride: boolean = false,
): Promise<void> {
  const today = forceDate || new Date()

  if (!forceOverride && !isLastDayOfMonth(today)) {
    log.info('Today is not the last day of the month. Skipping generation.')
    return
  }

  log.info('Last day of the month detected. Initiating monthly logs generation...')

  const supabase = getSupabaseAdminClient()
  const generator = new MonthlyLogGenerator()

  // Formato YYYY-MM
  const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  // 1. Obtener todas las empresas
  const { data: companies, error } = await supabase.from('companies').select('id, razon_social')

  if (error) {
    log.error({ err: error }, 'failed to fetch companies for monthly logs')
    return
  }

  if (!companies || companies.length === 0) {
    log.info('No companies found in database.')
    return
  }

  log.info(`Found ${companies.length} companies to process for month ${month}.`)

  for (const company of companies) {
    try {
      // 2. Verificar si ya existe para este mes y empresa
      const { data: existing } = await supabase
        .from('monthly_logs')
        .select('id')
        .eq('company_id', company.id)
        .eq('month', month)
        .maybeSingle()

      if (existing) {
        log.info(
          `Monthly log already exists for company ${company.razon_social} (${company.id}) on ${month}. Skipping.`,
        )
        continue
      }

      log.info(`Generating monthly log for ${company.razon_social} (${company.id})...`)

      // 3. Generar contenido usando el generator
      const logData = await generator.generate(company.id, month, supabase)

      // 4. Guardar en la base de datos
      const { error: insertError } = await supabase.from('monthly_logs').insert({
        company_id: company.id,
        month,
        completed_summary: logData.completed_summary,
        pending_summary: logData.pending_summary,
        next_month_plan: logData.next_month_plan,
        ia_metadata: {
          generated_at: new Date().toISOString(),
          is_automated: true,
        },
      })

      if (insertError) {
        log.error(
          { err: insertError, companyId: company.id },
          'failed to save generated monthly log',
        )
      } else {
        log.info(`Successfully saved monthly log for ${company.razon_social}`)
      }
    } catch (e) {
      log.error({ err: e, companyId: company.id }, 'failed to process company monthly log')
    }
  }

  log.info('Finished monthly logs generation job.')
}
