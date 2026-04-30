// =========================================================
// Tests RLS — Aislación multi-tenant
// Tasks: T-F1-011 + T-F1-012
// Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/21
// =========================================================
// Estrategia:
//   - adminClient (service_role): crea/limpia datos bypassando RLS.
//   - userAClient / userBClient (anon + JWT del usuario): respetan RLS.
//   - Setup crea: orgA + orgB, cada una con 1 company + 1 centro + 1 standard_eval.
//     1 auth user por org, vinculado a public.users + user_company_role
//     con rol regis_admin (company_id NULL = scope toda la org).
//   - Tests verifican que userA solo ve su org y NO puede leer/insertar/update orgB.
// =========================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'
import path from 'node:path'

// Cargar .env.local explícitamente (dotenv default solo lee .env)
loadEnv({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.SUPABASE_ANON_KEY!

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  throw new Error('Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY')
}

const adminClient: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// IDs y emails únicos por corrida para idempotencia
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const NIT_A = `RLS-A-${RUN_ID}`
const NIT_B = `RLS-B-${RUN_ID}`
const COMPANY_NIT_A = `CNIT-A-${RUN_ID}`
const COMPANY_NIT_B = `CNIT-B-${RUN_ID}`
const EMAIL_A = `rls-test-a-${RUN_ID}@example.test`
const EMAIL_B = `rls-test-b-${RUN_ID}@example.test`
const PASSWORD = `Tst!${RUN_ID}A1`

interface Fixture {
  org: { id: string; nombre: string }
  company: { id: string; nit: string }
  centro: { id: string }
  user: { id: string; auth_uid: string; email: string }
  client: SupabaseClient
  evalId?: string
}

let fxA: Fixture
let fxB: Fixture

async function buildFixture(label: 'A' | 'B'): Promise<Fixture> {
  const nit = label === 'A' ? NIT_A : NIT_B
  const cNit = label === 'A' ? COMPANY_NIT_A : COMPANY_NIT_B
  const email = label === 'A' ? EMAIL_A : EMAIL_B

  // 1) regis_org
  const { data: org, error: errOrg } = await adminClient
    .from('regis_orgs')
    .insert({ nombre: `RLS Test Org ${label}`, nit })
    .select()
    .single()
  if (errOrg) throw new Error(`org-${label}: ${errOrg.message}`)

  // 2) company
  const { data: company, error: errCo } = await adminClient
    .from('companies')
    .insert({
      regis_org_id: org.id,
      nit: cNit,
      razon_social: `RLS Co ${label}`,
      numero_trabajadores: 10,
    })
    .select()
    .single()
  if (errCo) throw new Error(`company-${label}: ${errCo.message}`)

  // 3) centro
  const { data: centro, error: errCe } = await adminClient
    .from('centros_de_trabajo')
    .insert({ company_id: company.id, nombre: `Centro ${label}` })
    .select()
    .single()
  if (errCe) throw new Error(`centro-${label}: ${errCe.message}`)

  // 4) auth user (Supabase Auth) — admin.createUser usa service role
  const { data: authData, error: errAuth } = await adminClient.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  })
  if (errAuth || !authData.user) throw new Error(`auth-${label}: ${errAuth?.message}`)
  const authUid = authData.user.id

  // 5) public.users
  // Tras Bloque 4B (T-F1-019), un trigger AFTER INSERT en auth.users
  // crea automáticamente la fila en public.users con auth_uid. Por eso
  // primero buscamos la fila existente; si no existe (caso legacy)
  // hacemos el insert manual como antes. Los tests siguen verificando
  // la lógica de RLS — esta sección sólo se adapta al nuevo trigger.
  let user: { id: string; auth_uid: string; email: string }
  const { data: existingUser } = await adminClient
    .from('users')
    .select()
    .eq('auth_uid', authUid)
    .maybeSingle()
  if (existingUser) {
    // Aseguramos nombre/email coherentes con el spec del test.
    await adminClient
      .from('users')
      .update({ email, nombre_completo: `RLS User ${label}` })
      .eq('id', existingUser.id)
    user = { id: existingUser.id, auth_uid: existingUser.auth_uid, email }
  } else {
    const { data: created, error: errUser } = await adminClient
      .from('users')
      .insert({
        auth_uid: authUid,
        email,
        nombre_completo: `RLS User ${label}`,
      })
      .select()
      .single()
    if (errUser) throw new Error(`user-${label}: ${errUser.message}`)
    user = created
  }

  // 6) user_company_role: regis_admin org-scope (company_id NULL)
  const { data: roleRow, error: errRole } = await adminClient
    .from('roles')
    .select('id')
    .eq('nombre', 'regis_admin')
    .single()
  if (errRole) throw new Error(`role-${label}: ${errRole.message}`)

  const { error: errUcr } = await adminClient.from('user_company_role').insert({
    user_id: user.id,
    regis_org_id: org.id,
    company_id: null,
    role_id: roleRow.id,
    is_active: true,
  })
  if (errUcr) throw new Error(`ucr-${label}: ${errUcr.message}`)

  // 7) standard_evaluation (un dato anidado para tests)
  const { data: standard, error: errStd } = await adminClient
    .from('standards_0312')
    .select('id')
    .limit(1)
    .single()
  if (errStd) throw new Error(`std-${label}: ${errStd.message}`)

  const { data: evalRow, error: errEv } = await adminClient
    .from('standard_evaluations')
    .insert({
      centro_id: centro.id,
      company_id: company.id,
      standard_id: standard.id,
      status: 'cumple',
    })
    .select()
    .single()
  if (errEv) throw new Error(`eval-${label}: ${errEv.message}`)

  // 8) Cliente como user (anon key + sign in con password)
  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error: errSign } = await userClient.auth.signInWithPassword({
    email,
    password: PASSWORD,
  })
  if (errSign) throw new Error(`signin-${label}: ${errSign.message}`)

  return {
    org: { id: org.id, nombre: org.nombre },
    company: { id: company.id, nit: company.nit },
    centro: { id: centro.id },
    user: { id: user.id, auth_uid: authUid, email },
    client: userClient,
    evalId: evalRow.id,
  }
}

async function tearDownFixture(fx: Fixture) {
  if (!fx) return
  // Borrado en orden para respetar FKs
  await adminClient.from('standard_evaluations').delete().eq('id', fx.evalId!)
  await adminClient.from('user_company_role').delete().eq('user_id', fx.user.id)
  await adminClient.from('users').delete().eq('id', fx.user.id)
  await adminClient.auth.admin.deleteUser(fx.user.auth_uid)
  await adminClient.from('centros_de_trabajo').delete().eq('id', fx.centro.id)
  await adminClient.from('companies').delete().eq('id', fx.company.id)
  await adminClient.from('regis_orgs').delete().eq('id', fx.org.id)
}

describe('RLS multi-tenant aislacion', () => {
  beforeAll(async () => {
    fxA = await buildFixture('A')
    fxB = await buildFixture('B')
  }, 60_000)

  afterAll(async () => {
    await tearDownFixture(fxA)
    await tearDownFixture(fxB)
  }, 60_000)

  it('userA solo ve su propia regis_org', async () => {
    const { data, error } = await fxA.client.from('regis_orgs').select('*')
    expect(error).toBeNull()
    expect(data).toBeTruthy()
    const ids = (data ?? []).map((r) => r.id)
    expect(ids).toContain(fxA.org.id)
    expect(ids).not.toContain(fxB.org.id)
  })

  it('userA solo ve companies de su org y NO ve la de orgB', async () => {
    const { data, error } = await fxA.client.from('companies').select('*')
    expect(error).toBeNull()
    const visibleCompanyIds = (data ?? []).map((r) => r.id)
    expect(visibleCompanyIds).toContain(fxA.company.id)
    expect(visibleCompanyIds).not.toContain(fxB.company.id)

    // Filtro explícito por id de orgB devuelve 0
    const { data: targeted } = await fxA.client
      .from('companies')
      .select('*')
      .eq('id', fxB.company.id)
    expect(targeted?.length ?? 0).toBe(0)
  })

  it('userA NO puede insertar company en orgB (RLS WITH CHECK)', async () => {
    const { data, error } = await fxA.client
      .from('companies')
      .insert({
        regis_org_id: fxB.org.id,
        nit: `HACK-${RUN_ID}`,
        razon_social: 'Hack Inc',
        numero_trabajadores: 1,
      })
      .select()
    // Espera error o data vacío. RLS retorna error cuando WITH CHECK falla.
    expect(error).toBeTruthy()
    expect(data ?? []).toHaveLength(0)
  })

  it('userA NO puede actualizar company de orgB (UPDATE 0 filas)', async () => {
    const { data, error } = await fxA.client
      .from('companies')
      .update({ razon_social: 'PWNED' })
      .eq('id', fxB.company.id)
      .select()
    // Sin error, pero 0 filas afectadas (USING filtra antes del UPDATE)
    expect(error).toBeNull()
    expect(data?.length ?? 0).toBe(0)

    // Verifica con admin que el dato sigue intacto
    const { data: orig } = await adminClient
      .from('companies')
      .select('razon_social')
      .eq('id', fxB.company.id)
      .single()
    expect(orig?.razon_social).not.toBe('PWNED')
  })

  it('userA NO ve standard_evaluations de orgB (datos anidados)', async () => {
    const { data, error } = await fxA.client
      .from('standard_evaluations')
      .select('*')
      .eq('company_id', fxB.company.id)
    expect(error).toBeNull()
    expect(data?.length ?? 0).toBe(0)
  })

  it('userA SÍ ve sus propias standard_evaluations', async () => {
    const { data, error } = await fxA.client
      .from('standard_evaluations')
      .select('*')
      .eq('company_id', fxA.company.id)
    expect(error).toBeNull()
    expect((data ?? []).length).toBeGreaterThanOrEqual(1)
  })

  it('userA NO puede insertar standard_evaluation apuntando a orgB', async () => {
    const { data: standard } = await adminClient
      .from('standards_0312')
      .select('id')
      .limit(1)
      .single()
    const { error } = await fxA.client.from('standard_evaluations').insert({
      centro_id: fxB.centro.id,
      company_id: fxB.company.id,
      standard_id: standard!.id,
      status: 'cumple',
    })
    expect(error).toBeTruthy()
  })

  it('aislación bidireccional: userB tampoco ve datos de orgA', async () => {
    const { data } = await fxB.client.from('companies').select('*').eq('id', fxA.company.id)
    expect(data?.length ?? 0).toBe(0)
  })
})
