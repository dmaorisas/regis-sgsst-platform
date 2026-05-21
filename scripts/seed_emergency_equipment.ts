/**
 * scripts/seed_emergency_equipment.ts
 *
 * Seedea equipos de emergencia de prueba para las 3 empresas piloto.
 * Crea extintores, botiquines y camillas con fechas variadas para
 * mostrar los tres estados: operativo, alerta_vencimiento, vencido.
 *
 * Uso:
 *   npx tsx scripts/seed_emergency_equipment.ts
 *
 * Idempotente: usa upsert por (company_id, codigo_interno) UNIQUE.
 */

import { createClient } from '@supabase/supabase-js'
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

interface EquipmentSeed {
  codigo_interno: string
  tipo: 'extintor' | 'botiquin' | 'camilla' | 'otro'
  descripcion: string
  ubicacion: string
  fecha_ultima_revision: string
  fecha_vencimiento: string
  fecha_vencimiento_vida_util: string | null
  estado: 'operativo' | 'alerta_vencimiento' | 'vencido'
}

const PILOT_NITS = ['900123456-8', '901234567-7', '830987654-3']

function determineStatus(
  reviewExpiry: string,
  vidaUtil: string | null,
): 'operativo' | 'alerta_vencimiento' | 'vencido' {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dates: Date[] = [new Date(reviewExpiry + 'T00:00:00')]
  if (vidaUtil) dates.push(new Date(vidaUtil + 'T00:00:00'))

  for (const d of dates) {
    if (d <= today) return 'vencido'
  }

  for (const d of dates) {
    const diffDays = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays <= 30) return 'alerta_vencimiento'
  }

  return 'operativo'
}

function buildEquipmentForCompany(companyIndex: number): EquipmentSeed[] {
  const items: EquipmentSeed[] = []
  const prefix = ['CA', 'DT', 'EP'][companyIndex]

  // Extintores
  const extintores: Omit<EquipmentSeed, 'estado'>[] = [
    {
      codigo_interno: `${prefix}-EXT-001`,
      tipo: 'extintor',
      descripcion: 'Extintor ABC multipropósito 10 lb',
      ubicacion: 'Recepcion',
      fecha_ultima_revision: '2026-03-15',
      fecha_vencimiento: '2027-03-15',
      fecha_vencimiento_vida_util: '2031-06-01',
    },
    {
      codigo_interno: `${prefix}-EXT-002`,
      tipo: 'extintor',
      descripcion: 'Extintor CO2 15 lb',
      ubicacion: 'Sala de servidores',
      fecha_ultima_revision: '2025-08-10',
      fecha_vencimiento: '2026-08-10',
      fecha_vencimiento_vida_util: '2030-01-15',
    },
    {
      codigo_interno: `${prefix}-EXT-003`,
      tipo: 'extintor',
      descripcion: 'Extintor ABC multipropósito 20 lb',
      ubicacion: 'Bodega',
      fecha_ultima_revision: '2025-04-01',
      fecha_vencimiento: '2026-04-01',
      fecha_vencimiento_vida_util: '2028-12-01',
    },
    {
      codigo_interno: `${prefix}-EXT-004`,
      tipo: 'extintor',
      descripcion: 'Extintor Solkaflam 3700g',
      ubicacion: 'Piso 2, Oficina administrativa',
      fecha_ultima_revision: '2026-01-20',
      fecha_vencimiento: '2027-01-20',
      fecha_vencimiento_vida_util: '2033-01-20',
    },
  ]

  // Botiquines
  const botiquines: Omit<EquipmentSeed, 'estado'>[] = [
    {
      codigo_interno: `${prefix}-BOT-001`,
      tipo: 'botiquin',
      descripcion: 'Botiquin Tipo A - elementos basicos',
      ubicacion: 'Recepcion',
      fecha_ultima_revision: '2026-02-01',
      fecha_vencimiento: '2026-08-01',
      fecha_vencimiento_vida_util: null,
    },
    {
      codigo_interno: `${prefix}-BOT-002`,
      tipo: 'botiquin',
      descripcion: 'Botiquin Tipo B - uso industrial',
      ubicacion: 'Zona de produccion',
      fecha_ultima_revision: '2025-11-15',
      fecha_vencimiento: '2026-05-15',
      fecha_vencimiento_vida_util: null,
    },
    {
      codigo_interno: `${prefix}-BOT-003`,
      tipo: 'botiquin',
      descripcion: 'Botiquin Tipo A - piso 2',
      ubicacion: 'Piso 2, pasillo principal',
      fecha_ultima_revision: '2026-04-10',
      fecha_vencimiento: '2026-10-10',
      fecha_vencimiento_vida_util: null,
    },
  ]

  // Camillas
  const camillas: Omit<EquipmentSeed, 'estado'>[] = [
    {
      codigo_interno: `${prefix}-CAM-001`,
      tipo: 'camilla',
      descripcion: 'Camilla rigida con inmovilizador cervical',
      ubicacion: 'Punto de encuentro, planta baja',
      fecha_ultima_revision: '2025-06-01',
      fecha_vencimiento: '2027-06-01',
      fecha_vencimiento_vida_util: '2032-06-01',
    },
    {
      codigo_interno: `${prefix}-CAM-002`,
      tipo: 'camilla',
      descripcion: 'Camilla plegable tipo Miller',
      ubicacion: 'Enfermeria',
      fecha_ultima_revision: '2026-01-15',
      fecha_vencimiento: '2028-01-15',
      fecha_vencimiento_vida_util: '2034-01-15',
    },
  ]

  // Otros
  const otros: Omit<EquipmentSeed, 'estado'>[] = [
    {
      codigo_interno: `${prefix}-DEA-001`,
      tipo: 'otro',
      descripcion: 'Desfibrilador externo automatico (DEA)',
      ubicacion: 'Recepcion principal',
      fecha_ultima_revision: '2026-04-01',
      fecha_vencimiento: '2027-04-01',
      fecha_vencimiento_vida_util: '2034-04-01',
    },
  ]

  for (const raw of [...extintores, ...botiquines, ...camillas, ...otros]) {
    items.push({
      ...raw,
      estado: determineStatus(raw.fecha_vencimiento, raw.fecha_vencimiento_vida_util),
    })
  }

  return items
}

async function main() {
  console.log('=== Seed Emergency Equipment ===')

  for (const nit of PILOT_NITS) {
    const { data: company, error: compErr } = await supabase
      .from('companies')
      .select('id, razon_social')
      .eq('nit', nit)
      .maybeSingle()

    if (compErr) {
      console.error(`Error buscando empresa NIT ${nit}:`, compErr)
      continue
    }
    if (!company) {
      console.warn(`Empresa NIT ${nit} no encontrada. Ejecuta seed_pilot_companies.ts primero.`)
      continue
    }

    console.log(`\n--- ${company.razon_social} (${nit}) ---`)

    const { data: centros } = await supabase
      .from('centros_de_trabajo')
      .select('id, nombre')
      .eq('company_id', company.id)
      .order('nombre', { ascending: true })

    const centroId = centros?.[0]?.id || null

    const companyIndex = PILOT_NITS.indexOf(nit)
    const items = buildEquipmentForCompany(companyIndex)

    let created = 0
    let skipped = 0

    for (const item of items) {
      const { data: existing } = await supabase
        .from('emergency_equipment')
        .select('id')
        .eq('company_id', company.id)
        .eq('codigo_interno', item.codigo_interno)
        .maybeSingle()

      if (existing) {
        skipped++
        continue
      }

      const { error: insErr } = await supabase.from('emergency_equipment').insert({
        company_id: company.id,
        centro_id: centroId,
        ...item,
      })

      if (insErr) {
        console.error(`  Error insertando ${item.codigo_interno}:`, insErr.message)
      } else {
        created++
      }
    }

    console.log(`  Creados: ${created} | Ya existentes: ${skipped}`)
  }

  // Resumen final
  const { count } = await supabase
    .from('emergency_equipment')
    .select('*', { count: 'exact', head: true })

  console.log(`\n=== Total equipos en base de datos: ${count} ===`)
  console.log('OK: seed de equipos de emergencia completado.')
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
