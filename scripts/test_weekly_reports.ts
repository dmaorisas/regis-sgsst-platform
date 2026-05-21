import {
  runConsultantWeeklyPending,
  runConsultantWeeklySummary,
} from '@/lib/jobs/consultant-weekly-reports'
import { shutdownBoss } from '@/lib/pg-boss'

async function main() {
  console.log('=== Iniciando pruebas manuales de Reportes Semanales ===')

  try {
    console.log('\n1. Ejecutando runConsultantWeeklyPending (Lunes)...')
    await runConsultantWeeklyPending()
    console.log('✓ runConsultantWeeklyPending completado con éxito.')

    console.log('\n2. Ejecutando runConsultantWeeklySummary (Viernes)...')
    await runConsultantWeeklySummary()
    console.log('✓ runConsultantWeeklySummary completado con éxito.')

    console.log('\n=== Pruebas manuales finalizadas con éxito ===')
  } catch (error) {
    console.error('✗ Error ejecutando pruebas de reportes:', error)
  } finally {
    console.log('\nCerrando conexiones de pg-boss...')
    await shutdownBoss()
    console.log('Conexión cerrada. Saliendo.')
    process.exit(0)
  }
}

main()
