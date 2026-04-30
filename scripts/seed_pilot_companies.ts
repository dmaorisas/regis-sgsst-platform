/**
 * scripts/seed_pilot_companies.ts
 *
 * Seedea las 3 empresas piloto sintéticas definidas en
 * docs/research/pilot_companies.md, con sus centros, comités, vínculos
 * worker_company y empresa_ciiu, para validar los 3 capítulos de la
 * Resolución 0312/2019.
 *
 * Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/22
 * Tarea: T-F1-013 (seed empresas piloto)
 *
 * Uso:
 *   npx tsx scripts/seed_pilot_companies.ts
 *
 * Idempotente: re-ejecutar deja el sistema en el mismo estado:
 *   - regis_org se busca/crea por NIT determinístico.
 *   - companies por (regis_org_id, nit) UNIQUE.
 *   - centros por (company_id, nombre).
 *   - workers por cedula UNIQUE — generamos cédulas determinísticas (seed
 *     basado en NIT + índice) para que el script sea reproducible.
 *   - committees por (company_id, centro_id, tipo).
 *
 * Decisiones técnicas (R7 — documentadas en reporte):
 *   1) Cédulas sintéticas: NO existe un dígito de verificación oficial para
 *      cédulas en Colombia (eso aplica solo a NITs). Generamos cédulas
 *      determinísticas como BigInt(NIT_int * 1000 + idx_global). Esto
 *      asegura unicidad global y reproducibilidad. El campo cedula es TEXT
 *      en DB y solo importa que sea único; no hay validación de checksum.
 *   2) Nombres ficticios: lista cerrada de 60 nombres + 60 apellidos
 *      mestizos (no usar nombres reales). Combinaciones determinísticas por
 *      índice global → si re-ejecutamos siempre obtenemos los mismos
 *      trabajadores.
 *   3) Cargos coherentes con sector — cada empresa tiene sus listas
 *      (consultoría, retail, construcción).
 *   4) Asignación EPS/AFP/ARL: distribución circular sobre los catálogos
 *      activos para variar (probar joins). ARL principal de cada empresa
 *      tomada también del catálogo (Sura para 1 y 2, Positiva para 3 —
 *      típica en construcción según research).
 *   5) Comités:
 *      - Empresa 1 (6 trab): Vigía SST (1) + Convivencia (1+1+suplentes
 *        = 4 miembros: 1 principal + 1 suplente empleador, 1 principal
 *        + 1 suplente trabajadores) + Brigada (2 brigadistas).
 *      - Empresa 2 (32 trab): COPASST (1+1 + suplentes 1+1 = 4) +
 *        Convivencia (1+1+1+1) + Brigada (3).
 *      - Empresa 3 (87 trab): COPASST (2+2 + suplentes 2+2 = 8) +
 *        Convivencia (2+2+2+2) + Brigada (5).
 *      Comités a NIVEL CENTRO_PRINCIPAL (un comité por empresa concentrado
 *      en su centro 0). Los demás centros NO replican comités en este
 *      seed (la spec menciona "3 committees principales + 3 Convivencia",
 *      total 6 — implementamos exactamente eso).
 *   6) capitulo_aplicable: I/II/III según pilot_companies.md.
 *      regla:
 *        - cap I: 1-10 trab y riesgo I-III
 *        - cap II: 11-50 trab y riesgo I-III
 *        - cap III: >50 trab OR riesgo IV-V
 *      Empresa 3 entra a III por riesgo V Y por >50 trabajadores.
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

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const REGIS_ORG_NIT = '900000001-1'
const REGIS_ORG_NOMBRE = 'Regis Colombia Demo'

// Listas cerradas (no usar nombres reales)
const NOMBRES = [
  'Andrés',
  'Carolina',
  'Diego',
  'Mariana',
  'Felipe',
  'Lucía',
  'Camilo',
  'Valentina',
  'Sebastián',
  'Daniela',
  'Juan',
  'Paula',
  'Santiago',
  'Laura',
  'Mateo',
  'Sofía',
  'Nicolás',
  'Isabella',
  'Esteban',
  'Gabriela',
  'Tomás',
  'Manuela',
  'Samuel',
  'Antonia',
  'David',
  'Camila',
  'Alejandro',
  'Salomé',
  'Daniel',
  'Mariangel',
  'Gabriel',
  'Renata',
  'Pablo',
  'Juliana',
  'Cristian',
  'Natalia',
  'Hernán',
  'Catalina',
  'Iván',
  'Adriana',
  'Mauricio',
  'Diana',
  'Óscar',
  'Yolanda',
  'Rodrigo',
  'Patricia',
  'Carlos',
  'Alejandra',
  'Fernando',
  'Sandra',
  'Jorge',
  'Ángela',
  'Ricardo',
  'Liliana',
  'Eduardo',
  'Marcela',
  'Álvaro',
  'Beatriz',
  'Néstor',
  'Verónica',
]

const APELLIDOS = [
  'Gómez',
  'Rodríguez',
  'Martínez',
  'González',
  'Pérez',
  'Sánchez',
  'Ramírez',
  'Torres',
  'Flores',
  'Rivera',
  'Cruz',
  'Morales',
  'Ortiz',
  'Gutiérrez',
  'Chávez',
  'Romero',
  'Álvarez',
  'Mendoza',
  'Vargas',
  'Castillo',
  'Jiménez',
  'Vásquez',
  'Ruiz',
  'Hernández',
  'Díaz',
  'Reyes',
  'Aguilar',
  'Medina',
  'Castro',
  'Rojas',
  'Ortega',
  'Cárdenas',
  'Salazar',
  'Quintero',
  'Guerrero',
  'Cabrera',
  'Acosta',
  'Beltrán',
  'Suárez',
  'Pineda',
  'Bermúdez',
  'Cortés',
  'Lozano',
  'Velásquez',
  'Patiño',
  'Bravo',
  'Caicedo',
  'Mejía',
  'Restrepo',
  'Arias',
  'Cano',
  'Bedoya',
  'Peña',
  'Núñez',
  'Camargo',
  'Rincón',
  'Bolívar',
  'Cárdenas',
  'Higuera',
  'Zuluaga',
]

const CARGOS_CONSULTORIA = [
  'Director(a) General',
  'Consultor(a) Senior SST',
  'Consultor(a) Senior',
  'Analista de Cumplimiento',
  'Asistente de Consultoría',
  'Coordinador(a) de Proyectos',
]

const CARGOS_RETAIL = [
  'Gerente General',
  'Jefe Administrativo',
  'Contador(a)',
  'Analista de Compras',
  'Auxiliar Contable',
  'Auxiliar Administrativo',
  'Coordinador(a) Logística',
  'Asistente de RRHH',
  'Cajero(a)',
  'Vendedor(a) de Mostrador',
  'Asesor(a) Comercial',
  'Auxiliar de Bodega',
  'Operario(a) de Almacén',
  'Conductor(a) Repartidor',
  'Coordinador(a) de Tienda',
  'Supervisor(a) de Bodega',
]

const CARGOS_CONSTRUCCION = [
  'Gerente General',
  'Director(a) de Operaciones',
  'Director(a) Administrativo',
  'Coordinador(a) HSE',
  'Inspector(a) HSE',
  'Ingeniero(a) Residente',
  'Maestro(a) de Obra',
  'Oficial de Obra',
  'Albañil',
  'Carpintero(a) de Obra',
  'Operador(a) de Maquinaria',
  'Electricista de Obra',
  'Soldador(a) Industrial',
  'Topógrafo(a)',
  'Almacenista de Obra',
  'Plomero(a)',
  'Ayudante de Obra',
  'Conductor(a) de Volqueta',
  'Operario(a) de Andamios',
  'Pintor(a) Industrial',
  'Auxiliar de Bodega',
  'Aux. Administrativo',
  'Recepcionista',
]

interface PilotCompanySpec {
  nit: string
  razon_social: string
  ciiu_principal: string
  ciius_secundarios: string[]
  clase_riesgo: number
  num_trabajadores: number
  capitulo_aplicable: 'I' | 'II' | 'III'
  ciudad: string
  direccion: string
  ano_constitucion: number
  centros: {
    nombre: string
    ciudad: string
    direccion: string
    ciiu_centro?: string
    clase_riesgo_centro?: number
    num_trabajadores: number
  }[]
  cargos: string[]
  // Por centro: [num_trabajadores_en_centro_0, ...]
  // Sumas deben coincidir con num_trabajadores total.
  arl_preferida: string
  // Comités (pluralidad por capítulo)
  vigia_sst: boolean
  copasst: {
    principales_empleador: number
    principales_trabajadores: number
    suplentes_empleador: number
    suplentes_trabajadores: number
  } | null
  convivencia: {
    principales_empleador: number
    principales_trabajadores: number
    suplentes_empleador: number
    suplentes_trabajadores: number
  }
  brigada_size: number
}

const PILOTS: PilotCompanySpec[] = [
  {
    nit: '900123456-7',
    razon_social: 'Consultora Andina Solutions S.A.S.',
    ciiu_principal: '7020',
    ciius_secundarios: [],
    clase_riesgo: 1,
    num_trabajadores: 6,
    capitulo_aplicable: 'I',
    ciudad: 'Bogotá D.C.',
    direccion: 'Calle 100 # 15-50, oficina 502',
    ano_constitucion: 2021,
    centros: [
      {
        nombre: 'Sede Principal Bogotá',
        ciudad: 'Bogotá D.C.',
        direccion: 'Calle 100 # 15-50, oficina 502',
        ciiu_centro: '7020',
        clase_riesgo_centro: 1,
        num_trabajadores: 6,
      },
    ],
    cargos: CARGOS_CONSULTORIA,
    arl_preferida: 'ARL Sura',
    vigia_sst: true,
    copasst: null,
    convivencia: {
      principales_empleador: 1,
      principales_trabajadores: 1,
      suplentes_empleador: 1,
      suplentes_trabajadores: 1,
    },
    brigada_size: 2,
  },
  {
    nit: '901234567-8',
    razon_social: 'Distribuidora Tropical del Norte Ltda.',
    ciiu_principal: '4711',
    ciius_secundarios: ['4719'],
    clase_riesgo: 2,
    num_trabajadores: 32,
    capitulo_aplicable: 'II',
    ciudad: 'Medellín',
    direccion: 'Carrera 50 # 80-25',
    ano_constitucion: 2018,
    centros: [
      {
        nombre: 'Sede Medellín',
        ciudad: 'Medellín',
        direccion: 'Carrera 50 # 80-25',
        ciiu_centro: '4711',
        clase_riesgo_centro: 2,
        num_trabajadores: 18,
      },
      {
        nombre: 'Bodega Bello',
        ciudad: 'Bello',
        direccion: 'Calle 50 # 30-10',
        ciiu_centro: '4719',
        clase_riesgo_centro: 2,
        num_trabajadores: 14,
      },
    ],
    cargos: CARGOS_RETAIL,
    arl_preferida: 'ARL Sura',
    vigia_sst: false,
    copasst: {
      principales_empleador: 1,
      principales_trabajadores: 1,
      suplentes_empleador: 1,
      suplentes_trabajadores: 1,
    },
    convivencia: {
      principales_empleador: 1,
      principales_trabajadores: 1,
      suplentes_empleador: 1,
      suplentes_trabajadores: 1,
    },
    brigada_size: 3,
  },
  {
    nit: '830987654-3',
    razon_social: 'Edificaciones del Pacífico S.A.',
    ciiu_principal: '4290',
    ciius_secundarios: ['4321', '4329'],
    clase_riesgo: 5,
    num_trabajadores: 87,
    capitulo_aplicable: 'III',
    ciudad: 'Cali',
    direccion: 'Avenida Sexta Norte # 28-50',
    ano_constitucion: 2010,
    centros: [
      {
        nombre: 'Sede Administrativa Cali',
        ciudad: 'Cali',
        direccion: 'Avenida Sexta Norte # 28-50',
        ciiu_centro: '4290',
        clase_riesgo_centro: 5,
        num_trabajadores: 15,
      },
      {
        nombre: 'Obra A — Vivienda Cali',
        ciudad: 'Cali',
        direccion: 'Calle 13 con Carrera 80',
        ciiu_centro: '4290',
        clase_riesgo_centro: 5,
        num_trabajadores: 36,
      },
      {
        nombre: 'Obra B — Puerto Buenaventura',
        ciudad: 'Buenaventura',
        direccion: 'Zona Portuaria, sector 4',
        ciiu_centro: '4290',
        clase_riesgo_centro: 5,
        num_trabajadores: 36,
      },
    ],
    cargos: CARGOS_CONSTRUCCION,
    arl_preferida: 'Positiva',
    vigia_sst: false,
    copasst: {
      principales_empleador: 2,
      principales_trabajadores: 2,
      suplentes_empleador: 2,
      suplentes_trabajadores: 2,
    },
    convivencia: {
      principales_empleador: 2,
      principales_trabajadores: 2,
      suplentes_empleador: 2,
      suplentes_trabajadores: 2,
    },
    brigada_size: 5,
  },
]

function fail(msg: string, extra?: unknown): never {
  console.error(`FATAL: ${msg}`)
  if (extra) console.error(extra)
  process.exit(1)
}

/**
 * Genera una cédula sintética determinística a partir del índice global.
 * Rango: 100000000 - 1999999999 (válido para CC y CE en Colombia).
 * No tiene dígito de verificación (cédulas no lo llevan en Colombia).
 */
function generateCedula(globalIdx: number): string {
  // Base: 1.000.000.000 + idx * 12345 → cédulas en rango realista, todas únicas.
  return String(1_000_000_000 + globalIdx * 12_345)
}

function pickCircular<T>(arr: T[], idx: number): T {
  return arr[idx % arr.length]
}

function buildWorkerName(globalIdx: number) {
  const nombre1 = pickCircular(NOMBRES, globalIdx)
  const nombre2 = pickCircular(NOMBRES, globalIdx + 7)
  const apellido1 = pickCircular(APELLIDOS, globalIdx + 11)
  const apellido2 = pickCircular(APELLIDOS, globalIdx + 17)
  return {
    nombres: `${nombre1} ${nombre2}`,
    apellidos: `${apellido1} ${apellido2}`,
  }
}

function pickSexo(globalIdx: number): 'M' | 'F' {
  return globalIdx % 2 === 0 ? 'M' : 'F'
}

function buildBirthDate(globalIdx: number): string {
  // Edades 22-58 años (variar para cubrir distintos grupos)
  const ageYears = 22 + (globalIdx % 36)
  const today = new Date('2026-04-28')
  const birth = new Date(today)
  birth.setFullYear(today.getFullYear() - ageYears)
  birth.setMonth(globalIdx % 12)
  birth.setDate(1 + (globalIdx % 27))
  return birth.toISOString().slice(0, 10)
}

function buildHireDate(globalIdx: number): string {
  // Fechas de ingreso entre 2018-01-01 y 2025-12-31
  const startMs = new Date('2018-01-01').getTime()
  const endMs = new Date('2025-12-31').getTime()
  const span = endMs - startMs
  const ms = startMs + ((globalIdx * 9_876_543) % span)
  return new Date(ms).toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Seeders
// ---------------------------------------------------------------------------

async function ensureRegisOrg(): Promise<string> {
  const { data: existing, error: selErr } = await supabase
    .from('regis_orgs')
    .select('id')
    .eq('nit', REGIS_ORG_NIT)
    .maybeSingle()
  if (selErr) fail('select regis_orgs', selErr)
  if (existing) {
    console.log(`[regis_orgs] existing: ${existing.id}`)
    return existing.id
  }

  const { data, error } = await supabase
    .from('regis_orgs')
    .insert({
      nombre: REGIS_ORG_NOMBRE,
      nit: REGIS_ORG_NIT,
      direccion: 'Calle 80 # 11-42, Bogotá D.C.',
      contacto_principal: 'Operaciones Regis Colombia',
      email_contacto: 'operaciones@regiscolombia-demo.local',
    })
    .select('id')
    .single()
  if (error) fail('insert regis_org', error)
  console.log(`[regis_orgs] created: ${data!.id}`)
  return data!.id
}

async function loadCatalogs() {
  const [{ data: eps, error: e1 }, { data: afp, error: e2 }, { data: arl, error: e3 }] =
    await Promise.all([
      supabase.from('eps_catalog').select('id,nombre').eq('is_active', true),
      supabase.from('afp_catalog').select('id,nombre').eq('is_active', true),
      supabase.from('arl_catalog').select('id,nombre').eq('is_active', true),
    ])
  if (e1) fail('select eps_catalog', e1)
  if (e2) fail('select afp_catalog', e2)
  if (e3) fail('select arl_catalog', e3)
  if (!eps?.length || !afp?.length || !arl?.length) {
    fail('Catálogos EPS/AFP/ARL vacíos. Aplicar migration 003_catalogos antes de seedear.')
  }
  return { eps: eps!, afp: afp!, arl: arl! }
}

async function ensureCompany(regisOrgId: string, spec: PilotCompanySpec): Promise<string> {
  const { data: existing, error: selErr } = await supabase
    .from('companies')
    .select('id')
    .eq('regis_org_id', regisOrgId)
    .eq('nit', spec.nit)
    .maybeSingle()
  if (selErr) fail(`select company ${spec.nit}`, selErr)
  if (existing) {
    console.log(`  [companies] existing ${spec.nit}: ${existing.id}`)
    return existing.id
  }

  const { data, error } = await supabase
    .from('companies')
    .insert({
      regis_org_id: regisOrgId,
      nit: spec.nit,
      razon_social: spec.razon_social,
      numero_trabajadores: spec.num_trabajadores,
      ciiu_principal: spec.ciiu_principal,
      clase_riesgo: spec.clase_riesgo,
      capitulo_aplicable: spec.capitulo_aplicable,
      ciudad: spec.ciudad,
      direccion: spec.direccion,
      ano_constitucion: spec.ano_constitucion,
    })
    .select('id')
    .single()
  if (error) fail(`insert company ${spec.nit}`, error)
  console.log(`  [companies] created ${spec.nit}: ${data!.id}`)
  return data!.id
}

async function ensureEmpresaCiiu(companyId: string, spec: PilotCompanySpec) {
  const all = [
    { codigo: spec.ciiu_principal, principal: true },
    ...spec.ciius_secundarios.map((c) => ({ codigo: c, principal: false })),
  ]
  for (const c of all) {
    const { error } = await supabase
      .from('empresa_ciiu')
      .upsert(
        { company_id: companyId, ciiu_codigo: c.codigo, is_principal: c.principal },
        { onConflict: 'company_id,ciiu_codigo' },
      )
    if (error) fail(`upsert empresa_ciiu ${c.codigo}`, error)
  }
}

async function ensureCentros(companyId: string, spec: PilotCompanySpec): Promise<string[]> {
  const ids: string[] = []
  for (const c of spec.centros) {
    const { data: existing, error: selErr } = await supabase
      .from('centros_de_trabajo')
      .select('id')
      .eq('company_id', companyId)
      .eq('nombre', c.nombre)
      .maybeSingle()
    if (selErr) fail(`select centro ${c.nombre}`, selErr)

    if (existing) {
      ids.push(existing.id)
      continue
    }
    const { data, error } = await supabase
      .from('centros_de_trabajo')
      .insert({
        company_id: companyId,
        nombre: c.nombre,
        ciudad: c.ciudad,
        direccion: c.direccion,
        ciiu_centro: c.ciiu_centro ?? null,
        clase_riesgo_centro: c.clase_riesgo_centro ?? null,
        numero_trabajadores: c.num_trabajadores,
      })
      .select('id')
      .single()
    if (error) fail(`insert centro ${c.nombre}`, error)
    ids.push(data!.id)
  }
  return ids
}

async function ensureWorkers(
  companyId: string,
  centroIds: string[],
  spec: PilotCompanySpec,
  baseGlobalIdx: number,
  catalogs: {
    eps: { id: string; nombre: string }[]
    afp: { id: string; nombre: string }[]
    arl: { id: string; nombre: string }[]
  },
): Promise<string[]> {
  const arlPreferida = catalogs.arl.find((a) => a.nombre === spec.arl_preferida) ?? catalogs.arl[0]

  // Distribución por centro (suma === num_trabajadores total)
  const sumCentros = spec.centros.reduce((acc, c) => acc + c.num_trabajadores, 0)
  if (sumCentros !== spec.num_trabajadores) {
    fail(
      `mismatch num trabajadores empresa ${spec.nit}: centros=${sumCentros}, total=${spec.num_trabajadores}`,
    )
  }

  const workerIds: string[] = []
  let inCompanyIdx = 0

  for (let cIdx = 0; cIdx < spec.centros.length; cIdx++) {
    const centroId = centroIds[cIdx]
    const nWorkersCentro = spec.centros[cIdx].num_trabajadores

    for (let i = 0; i < nWorkersCentro; i++) {
      const globalIdx = baseGlobalIdx + inCompanyIdx
      const cedula = generateCedula(globalIdx)
      const { nombres, apellidos } = buildWorkerName(globalIdx)
      const sexo = pickSexo(globalIdx)
      const fechaNac = buildBirthDate(globalIdx)
      const fechaInicio = buildHireDate(globalIdx)
      const cargo = pickCircular(spec.cargos, inCompanyIdx)

      // Asignar EPS/AFP rotando por catálogo (variar)
      const eps = pickCircular(catalogs.eps, globalIdx)
      const afp = pickCircular(catalogs.afp, globalIdx)

      // 1) Upsert worker (idempotente por cédula UNIQUE)
      let workerId: string
      const { data: existingW, error: selW } = await supabase
        .from('workers')
        .select('id')
        .eq('cedula', cedula)
        .maybeSingle()
      if (selW) fail(`select worker ${cedula}`, selW)

      if (existingW) {
        workerId = existingW.id
      } else {
        const { data, error } = await supabase
          .from('workers')
          .insert({
            cedula,
            tipo_documento: 'CC',
            nombres,
            apellidos,
            fecha_nacimiento: fechaNac,
            sexo,
            email: `${nombres.split(' ')[0].toLowerCase()}.${apellidos.split(' ')[0].toLowerCase()}.${cedula.slice(-4)}@example.test`,
            telefono: `30${globalIdx % 10}${String(globalIdx).padStart(7, '0').slice(-7)}`,
            eps_id: eps.id,
            afp_id: afp.id,
            arl_id: arlPreferida.id,
          })
          .select('id')
          .single()
        if (error) fail(`insert worker ${cedula}`, error)
        workerId = data!.id
      }
      workerIds.push(workerId)

      // 2) Upsert worker_company (vínculo activo único por (worker, company, fecha_inicio))
      // Idempotencia: verificar que no exista ya un vínculo activo de este worker con esta company
      const { data: existingWC, error: selWC } = await supabase
        .from('worker_company')
        .select('id')
        .eq('worker_id', workerId)
        .eq('company_id', companyId)
        .is('fecha_fin', null)
        .maybeSingle()
      if (selWC) fail(`select worker_company ${cedula}`, selWC)

      if (!existingWC) {
        const { error: errWC } = await supabase.from('worker_company').insert({
          worker_id: workerId,
          company_id: companyId,
          centro_de_trabajo_id: centroId,
          cargo,
          fecha_inicio: fechaInicio,
          arl_id: arlPreferida.id,
          salario_base: 1_500_000 + (globalIdx % 8) * 250_000,
        })
        if (errWC) fail(`insert worker_company ${cedula}`, errWC)
      }

      inCompanyIdx += 1
    }
  }
  return workerIds
}

async function ensureCommittees(
  companyId: string,
  centroIds: string[],
  workerIds: string[],
  spec: PilotCompanySpec,
): Promise<{ principalCommitteeId: string; convivenciaId: string; brigadaId: string }> {
  // Comités centralizados en el primer centro (sede principal)
  const centroPrincipal = centroIds[0]

  // Helper para get-or-insert committee
  async function getOrInsertCommittee(
    tipo: 'copasst' | 'vigia_sst' | 'convivencia' | 'brigada_emergencias',
  ): Promise<string> {
    const { data: existing, error: selErr } = await supabase
      .from('committees')
      .select('id')
      .eq('company_id', companyId)
      .eq('centro_id', centroPrincipal)
      .eq('tipo', tipo)
      .maybeSingle()
    if (selErr) fail(`select committee ${tipo}`, selErr)
    if (existing) return existing.id

    const { data, error } = await supabase
      .from('committees')
      .insert({
        company_id: companyId,
        centro_id: centroPrincipal,
        tipo,
        fecha_eleccion: '2025-01-15',
        fecha_vigencia_fin: '2027-01-15',
        is_active: true,
      })
      .select('id')
      .single()
    if (error) fail(`insert committee ${tipo}`, error)
    return data!.id
  }

  async function ensureMember(
    committeeId: string,
    workerId: string,
    rol: 'presidente' | 'secretario' | 'principal' | 'suplente' | 'brigadista',
    representacion: 'empleador' | 'trabajadores' | null,
  ) {
    // Idempotencia: si ya existe miembro activo (committee_id + worker_id + rol + representacion), skip
    let q = supabase
      .from('committee_members')
      .select('id')
      .eq('committee_id', committeeId)
      .eq('worker_id', workerId)
      .eq('rol', rol)
    if (representacion === null) {
      q = q.is('representacion', null)
    } else {
      q = q.eq('representacion', representacion)
    }
    const { data: existing, error: selErr } = await q.maybeSingle()
    if (selErr) fail(`select committee_member ${rol}`, selErr)
    if (existing) return

    const { error } = await supabase.from('committee_members').insert({
      committee_id: committeeId,
      worker_id: workerId,
      rol,
      representacion,
      fecha_designacion: '2025-01-15',
    })
    if (error) fail(`insert committee_member ${rol}`, error)
  }

  // 1) COPASST o Vigía SST
  // NOTA (R7): si el total de cupos en comités > num_trabajadores (ej. empresa 1
  // con 6 trab y 7 cupos: 1 vigía + 4 convivencia + 2 brigada), reutilizamos
  // workers vía módulo. Es legal en Colombia que un mismo trabajador participe
  // en múltiples comités con roles distintos.
  const pickWorker = (idx: number) => workerIds[idx % workerIds.length]

  let principalCommitteeId: string
  let assignIdx = 0
  if (spec.vigia_sst) {
    principalCommitteeId = await getOrInsertCommittee('vigia_sst')
    // 1 persona designada — rol "principal" + representacion "empleador" (Vigía típicamente designado por empleador)
    await ensureMember(principalCommitteeId, pickWorker(assignIdx++), 'principal', 'empleador')
  } else {
    principalCommitteeId = await getOrInsertCommittee('copasst')
    const c = spec.copasst!
    for (let i = 0; i < c.principales_empleador; i++) {
      await ensureMember(
        principalCommitteeId,
        pickWorker(assignIdx++),
        i === 0 ? 'presidente' : 'principal',
        'empleador',
      )
    }
    for (let i = 0; i < c.principales_trabajadores; i++) {
      await ensureMember(
        principalCommitteeId,
        pickWorker(assignIdx++),
        i === 0 ? 'secretario' : 'principal',
        'trabajadores',
      )
    }
    for (let i = 0; i < c.suplentes_empleador; i++) {
      await ensureMember(principalCommitteeId, pickWorker(assignIdx++), 'suplente', 'empleador')
    }
    for (let i = 0; i < c.suplentes_trabajadores; i++) {
      await ensureMember(principalCommitteeId, pickWorker(assignIdx++), 'suplente', 'trabajadores')
    }
  }

  // 2) Comité de Convivencia (siempre obligatorio)
  const convivenciaId = await getOrInsertCommittee('convivencia')
  const cv = spec.convivencia
  for (let i = 0; i < cv.principales_empleador; i++) {
    await ensureMember(
      convivenciaId,
      pickWorker(assignIdx++),
      i === 0 ? 'presidente' : 'principal',
      'empleador',
    )
  }
  for (let i = 0; i < cv.principales_trabajadores; i++) {
    await ensureMember(
      convivenciaId,
      pickWorker(assignIdx++),
      i === 0 ? 'secretario' : 'principal',
      'trabajadores',
    )
  }
  for (let i = 0; i < cv.suplentes_empleador; i++) {
    await ensureMember(convivenciaId, pickWorker(assignIdx++), 'suplente', 'empleador')
  }
  for (let i = 0; i < cv.suplentes_trabajadores; i++) {
    await ensureMember(convivenciaId, pickWorker(assignIdx++), 'suplente', 'trabajadores')
  }

  // 3) Brigada (rol: brigadista, sin representacion)
  const brigadaId = await getOrInsertCommittee('brigada_emergencias')
  for (let i = 0; i < spec.brigada_size; i++) {
    await ensureMember(brigadaId, pickWorker(assignIdx++), 'brigadista', null)
  }

  return { principalCommitteeId, convivenciaId, brigadaId }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Seed pilot companies (T-F1-013) ===')
  console.log(`Supabase URL: ${SUPABASE_URL}`)

  const regisOrgId = await ensureRegisOrg()
  const catalogs = await loadCatalogs()
  console.log(
    `[catalogs] EPS=${catalogs.eps.length} AFP=${catalogs.afp.length} ARL=${catalogs.arl.length}`,
  )

  let globalIdx = 0
  const results: {
    nit: string
    companyId: string
    centros: number
    workers: number
    committees: number
  }[] = []

  for (const spec of PILOTS) {
    console.log(`\n--- ${spec.razon_social} (NIT ${spec.nit}, cap ${spec.capitulo_aplicable}) ---`)
    const companyId = await ensureCompany(regisOrgId, spec)
    await ensureEmpresaCiiu(companyId, spec)
    const centroIds = await ensureCentros(companyId, spec)
    console.log(`  [centros] ${centroIds.length}`)
    const workerIds = await ensureWorkers(companyId, centroIds, spec, globalIdx, catalogs)
    console.log(`  [workers] ${workerIds.length}`)
    await ensureCommittees(companyId, centroIds, workerIds, spec)
    console.log(`  [committees] principal + convivencia + brigada`)
    results.push({
      nit: spec.nit,
      companyId,
      centros: centroIds.length,
      workers: workerIds.length,
      committees: 3,
    })
    globalIdx += spec.num_trabajadores
  }

  // Validaciones finales
  console.log('\n=== Validaciones ===')
  const [
    { count: cRegis },
    { count: cCompanies },
    { count: cCentros },
    { count: cWorkers },
    { count: cCommittees },
  ] = await Promise.all([
    supabase
      .from('regis_orgs')
      .select('*', { count: 'exact', head: true })
      .eq('nit', REGIS_ORG_NIT),
    supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('regis_org_id', regisOrgId),
    supabase
      .from('centros_de_trabajo')
      .select('*', { count: 'exact', head: true })
      .in(
        'company_id',
        results.map((r) => r.companyId),
      ),
    supabase.from('workers').select('*', { count: 'exact', head: true }),
    supabase
      .from('committees')
      .select('*', { count: 'exact', head: true })
      .in(
        'company_id',
        results.map((r) => r.companyId),
      ),
  ])

  console.log(`regis_orgs ('${REGIS_ORG_NOMBRE}'): ${cRegis} (esperado 1)`)
  console.log(`companies                          : ${cCompanies} (esperado 3)`)
  console.log(`centros_de_trabajo                 : ${cCentros} (esperado 6)`)
  console.log(`workers (total tabla)              : ${cWorkers} (esperado >= 125)`)
  console.log(
    `committees                         : ${cCommittees} (esperado 9 = 3 principales + 3 convivencia + 3 brigada)`,
  )

  const errors: string[] = []
  if (cRegis !== 1) errors.push(`regis_org count ${cRegis} != 1`)
  if (cCompanies !== 3) errors.push(`companies count ${cCompanies} != 3`)
  if (cCentros !== 6) errors.push(`centros count ${cCentros} != 6`)
  if ((cWorkers ?? 0) < 125) errors.push(`workers count ${cWorkers} < 125`)
  if (cCommittees !== 9) errors.push(`committees count ${cCommittees} != 9`)

  if (errors.length) {
    console.error('\nFAIL: validaciones')
    errors.forEach((e) => console.error('  - ' + e))
    process.exit(2)
  }

  console.log('\nOK: seed empresas piloto completado correctamente.')
  console.log('\nResumen JSON:')
  console.log(
    JSON.stringify(
      {
        regis_org_id: regisOrgId,
        pilots: results,
      },
      null,
      2,
    ),
  )
}

main().catch((err) => {
  console.error('FATAL unhandled', err)
  process.exit(1)
})
