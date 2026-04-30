/**
 * scripts/seed_research_data.ts
 *
 * Importa los 3 catálogos públicos refinados en T-F0-038:
 *   - 60 estándares de Resolución 0312/2019 → public.standards_0312
 *   - 119 peligros típicos GTC-45 por CIIU   → public.ciiu_hazard_mapping
 *   - 26 documentos legales con frecuencias  → public.document_frequencies
 *
 * Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/20
 * Tarea: T-F1-003 / T-F1-005 (seeds asociados a esas migrations)
 *
 * Uso:
 *   npx tsx scripts/seed_research_data.ts
 *
 * Idempotente: usa upsert por columna natural (standard_number, document_type, hash de hazard).
 *
 * Decisiones de mapeo (R7 — documentadas en reporte):
 *   - JSON `standard_subgroup` → DB `subgroup` (nombre más corto en SQL).
 *   - JSON `ciiu_code` → DB `ciiu_codigo` (convención ES en SQL).
 *   - Peligros (sin PK natural): se insertan limpiando primero por ciiu_codigo
 *     para garantizar idempotencia (re-ejecutar repite resultado).
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('FATAL: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY ausentes en .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const RESEARCH_DIR = path.resolve(process.cwd(), 'docs/research')

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface StandardSeed {
  standard_number: string
  standard_group: string
  standard_subgroup?: string | null
  name: string
  description?: string | null
  cycle_phva: 'Planear' | 'Hacer' | 'Verificar' | 'Actuar'
  weight_capitulo_iii: number
  applies_chapter_i: boolean
  applies_chapter_ii: boolean
  applies_chapter_iii: boolean
  evidence_types: string[]
  frequency_days: number | null
  is_critical: boolean
  source_reference: string
  requires_validation_with_regis?: boolean
}

interface HazardItem {
  category: string
  name: string
  source: string
  possible_effects: string[]
  suggested_controls: string[]
  reference: string
  prioridad?: number
}

interface CiiuHazardGroup {
  ciiu_code: string
  ciiu_description: string
  applicable_chapter: string
  applicable_chapter_note?: string
  risk_class?: number
  hazards: HazardItem[]
}

interface FrequencySeed {
  document_type: string
  document_name: string
  frequency: string
  frequency_value: number | null
  frequency_unit: string | null
  trigger_immediate: string | null
  norm_reference: string
  applies_when: Record<string, unknown>
  notes: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadJSON<T>(filename: string): T {
  const full = path.join(RESEARCH_DIR, filename)
  return JSON.parse(fs.readFileSync(full, 'utf8')) as T
}

function fail(msg: string, extra?: unknown): never {
  console.error(`FATAL: ${msg}`)
  if (extra) console.error(extra)
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Seeders
// ---------------------------------------------------------------------------

async function seedStandards(): Promise<number> {
  const data = loadJSON<StandardSeed[]>('standards_0312_seed.json')
  console.log(`[standards_0312] cargando ${data.length} estándares...`)

  const rows = data.map((s) => ({
    standard_number: s.standard_number,
    standard_group: s.standard_group,
    subgroup: s.standard_subgroup ?? null,
    name: s.name,
    description: s.description ?? null,
    cycle_phva: s.cycle_phva,
    weight_capitulo_iii: s.weight_capitulo_iii,
    applies_chapter_i: s.applies_chapter_i,
    applies_chapter_ii: s.applies_chapter_ii,
    applies_chapter_iii: s.applies_chapter_iii,
    evidence_types: s.evidence_types ?? [],
    frequency_days: s.frequency_days ?? null,
    is_critical: s.is_critical,
    source_reference: s.source_reference,
    requires_validation_with_regis: s.requires_validation_with_regis ?? false,
  }))

  const { error } = await supabase
    .from('standards_0312')
    .upsert(rows, { onConflict: 'standard_number' })

  if (error) fail('upsert standards_0312', error)

  const { count, error: cErr } = await supabase
    .from('standards_0312')
    .select('*', { count: 'exact', head: true })
  if (cErr) fail('count standards_0312', cErr)
  return count ?? 0
}

async function seedCiiuHazards(): Promise<number> {
  const groups = loadJSON<CiiuHazardGroup[]>('ciiu_hazard_mapping_seed.json')
  let total = 0

  for (const g of groups) {
    // Idempotencia: limpiar peligros previos del mismo CIIU para evitar duplicados,
    // ya que la tabla no tiene PK natural por hazard.
    const { error: delErr } = await supabase
      .from('ciiu_hazard_mapping')
      .delete()
      .eq('ciiu_codigo', g.ciiu_code)
    if (delErr) fail(`delete previos CIIU ${g.ciiu_code}`, delErr)

    const rows = g.hazards.map((h) => ({
      ciiu_codigo: g.ciiu_code,
      ciiu_description: g.ciiu_description,
      applicable_chapter: g.applicable_chapter,
      peligro_categoria: h.category,
      peligro_nombre: h.name,
      peligro_fuente: h.source,
      possible_effects: h.possible_effects ?? [],
      suggested_controls: h.suggested_controls ?? [],
      reference: h.reference,
      prioridad: h.prioridad ?? 5,
    }))

    const { error: insErr } = await supabase.from('ciiu_hazard_mapping').insert(rows)
    if (insErr) fail(`insert hazards CIIU ${g.ciiu_code}`, insErr)

    total += rows.length
    console.log(`  · CIIU ${g.ciiu_code} (${g.applicable_chapter}): ${rows.length} peligros`)
  }

  const { count, error: cErr } = await supabase
    .from('ciiu_hazard_mapping')
    .select('*', { count: 'exact', head: true })
  if (cErr) fail('count ciiu_hazard_mapping', cErr)
  return count ?? total
}

async function seedFrequencies(): Promise<number> {
  const data = loadJSON<FrequencySeed[]>('frequencies_seed.json')
  console.log(`[document_frequencies] cargando ${data.length} documentos...`)

  const rows = data.map((d) => ({
    document_type: d.document_type,
    document_name: d.document_name,
    frequency: d.frequency,
    frequency_value: d.frequency_value,
    frequency_unit: d.frequency_unit,
    trigger_immediate: d.trigger_immediate,
    norm_reference: d.norm_reference,
    applies_when: d.applies_when ?? {},
    notes: d.notes,
  }))

  const { error } = await supabase
    .from('document_frequencies')
    .upsert(rows, { onConflict: 'document_type' })
  if (error) fail('upsert document_frequencies', error)

  const { count, error: cErr } = await supabase
    .from('document_frequencies')
    .select('*', { count: 'exact', head: true })
  if (cErr) fail('count document_frequencies', cErr)
  return count ?? 0
}

// ---------------------------------------------------------------------------
// Validaciones numéricas (anti-alucinación crítica)
// ---------------------------------------------------------------------------

async function validateStandardsWeights(): Promise<{
  sumCapIII: number
  phva: Record<string, number>
}> {
  // SUM(weight_capitulo_iii) WHERE applies_chapter_iii = TRUE
  const { data: capIII, error: e1 } = await supabase
    .from('standards_0312')
    .select('weight_capitulo_iii')
    .eq('applies_chapter_iii', true)
  if (e1) fail('select cap III', e1)
  const sumCapIII = (capIII ?? []).reduce((acc, r) => acc + Number(r.weight_capitulo_iii), 0)

  // Distribución PHVA (sumas ponderadas dentro de cap III)
  const { data: all, error: e2 } = await supabase
    .from('standards_0312')
    .select('cycle_phva, weight_capitulo_iii, applies_chapter_iii')
  if (e2) fail('select all phva', e2)
  const phva: Record<string, number> = { Planear: 0, Hacer: 0, Verificar: 0, Actuar: 0 }
  for (const r of all ?? []) {
    if (r.applies_chapter_iii) phva[r.cycle_phva] += Number(r.weight_capitulo_iii)
  }
  return { sumCapIII, phva }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Seed research data (T-F1-003 / T-F1-005) ===')
  console.log(`Supabase URL: ${SUPABASE_URL}`)

  const stdCount = await seedStandards()
  const hazCount = await seedCiiuHazards()
  const freqCount = await seedFrequencies()

  const { sumCapIII, phva } = await validateStandardsWeights()

  console.log('\n=== Resultados ===')
  console.log(`standards_0312          : ${stdCount} (esperado: 60)`)
  console.log(`ciiu_hazard_mapping     : ${hazCount} (esperado: 119)`)
  console.log(`document_frequencies    : ${freqCount} (esperado: 26)`)
  console.log(`SUM(weight) cap III     : ${sumCapIII} (esperado: 100)`)
  console.log(`PHVA distribution       : ${JSON.stringify(phva)}`)
  console.log(`PHVA esperado           : {"Planear":25,"Hacer":60,"Verificar":5,"Actuar":10}`)

  const errors: string[] = []
  if (stdCount !== 60) errors.push(`standards count ${stdCount} != 60`)
  if (hazCount !== 119) errors.push(`hazards count ${hazCount} != 119`)
  if (freqCount !== 26) errors.push(`frequencies count ${freqCount} != 26`)
  if (Math.abs(sumCapIII - 100) > 0.001) errors.push(`weight sum ${sumCapIII} != 100`)
  if (phva.Planear !== 25) errors.push(`Planear ${phva.Planear} != 25`)
  if (phva.Hacer !== 60) errors.push(`Hacer ${phva.Hacer} != 60`)
  if (phva.Verificar !== 5) errors.push(`Verificar ${phva.Verificar} != 5`)
  if (phva.Actuar !== 10) errors.push(`Actuar ${phva.Actuar} != 10`)

  if (errors.length) {
    console.error('\nFAIL: validaciones numéricas')
    errors.forEach((e) => console.error(' - ' + e))
    process.exit(2)
  }

  console.log('\nOK: todos los conteos y sumas son correctos.')
}

main().catch((err) => {
  console.error('FATAL unhandled', err)
  process.exit(1)
})
