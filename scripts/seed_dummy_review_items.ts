// =========================================================
// scripts/seed_dummy_review_items.ts — 3 items dummy en la cola
// =========================================================
// Usado para poblar la UI /regis/review-queue durante T-F15-003 y QA.
// Idempotente: borra los items con request_id que empieza con 'seed-' y
// los re-inserta en cada corrida.
//
// Run:
//   npx tsx scripts/seed_dummy_review_items.ts
// =========================================================

import { getSupabaseAdminClient } from '../src/lib/supabase-admin'

type DummyItem = {
  request_id: string
  module: string
  task_id: string
  confidence: number
  reason_for_review: 'low_confidence' | 'critical_module' | 'schema_mismatch'
  ai_output: Record<string, unknown>
}

const DUMMIES: DummyItem[] = [
  {
    request_id: 'seed-medical-001',
    module: 'medical_exam_extraction',
    task_id: 'T-F2-010',
    confidence: 0.65,
    reason_for_review: 'low_confidence',
    ai_output: {
      worker_document: '1.020.345.678',
      exam_type: 'ingreso',
      exam_date: '2026-04-15',
      aptitude: 'apto_con_restricciones',
      restrictions: ['no levantar > 15kg', 'evitar exposición prolongada al ruido'],
      _citations: { source: 'pdf p.2 párrafo 3' },
    },
  },
  {
    request_id: 'seed-risk-001',
    module: 'risk_matrix',
    task_id: 'T-F3-022',
    confidence: 0.72,
    reason_for_review: 'low_confidence',
    ai_output: {
      proceso: 'Mantenimiento eléctrico',
      peligro: 'Contacto eléctrico directo',
      nivel_riesgo: 'I',
      controles_sugeridos: ['LOTOTO', 'EPP dieléctrico clase 0'],
    },
  },
  {
    request_id: 'seed-acta-001',
    module: 'acta_generation',
    task_id: 'T-F4-031',
    confidence: 0.85,
    reason_for_review: 'critical_module',
    ai_output: {
      tipo_acta: 'COPASST_constitucion',
      fecha: '2026-04-28',
      participantes: ['Juan Pérez (presidente)', 'María López (secretaria)', 'Carlos Ruiz'],
      puntos_tratados: 4,
      _summary: 'Constitución del COPASST conforme a la Resolución 2013 de 1986.',
    },
  },
]

async function main() {
  const admin = getSupabaseAdminClient()

  // Limpiar dummies anteriores (idempotencia).
  const { error: delErr } = await admin
    .from('ai_outputs_pending_review')
    .delete()
    .like('request_id', 'seed-%')
  if (delErr) {
    console.error('[seed_dummy] failed to clear old seeds:', delErr)
    process.exit(1)
  }

  const rows = DUMMIES.map((d) => ({
    module: d.module,
    task_id: d.task_id,
    request_id: d.request_id,
    confidence: d.confidence,
    reason_for_review: d.reason_for_review,
    ai_output: d.ai_output,
    status: 'pending' as const,
  }))

  const { data, error } = await admin
    .from('ai_outputs_pending_review')
    .insert(rows)
    .select('id, module, request_id')

  if (error) {
    console.error('[seed_dummy] insert failed:', error)
    process.exit(1)
  }

  console.log(`[seed_dummy] inserted ${data?.length ?? 0} items:`)
  for (const row of data ?? []) {
    console.log(`  - ${row.module} (${row.request_id}) → id=${row.id}`)
  }
  console.log('[seed_dummy] done ✓')
}

main().catch((err) => {
  console.error('[seed_dummy] FAILED', err)
  process.exit(1)
})
