/**
 * scripts/seed_test_users.ts
 *
 * Crea los 6 usuarios de prueba del concurso y les asigna roles vía
 * `user_company_role`. Idempotente: re-ejecutar deja el sistema en el
 * mismo estado.
 *
 * Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/24
 * Tarea: T-F1-019 (RBAC + 6 usuarios test)
 *
 * Uso:
 *   npx tsx scripts/seed_test_users.ts
 *
 * Prerrequisitos:
 *   - Empresas piloto seedeadas (T-F1-013).
 *   - Migration 014_auth_users_sync aplicada (RPC ensure_user_synced).
 *
 * Decisiones técnicas (R7):
 *   1) Todos los usuarios usan password "Demo2026!" — fácil para el
 *      jurado y rotamos al cierre del concurso.
 *   2) Los emails son `*.test` (TLD reservado por RFC 6761 — no resuelve
 *      en DNS) para evitar cualquier riesgo de envío real de correos.
 *   3) Si el usuario ya existe (auth + public), nos limitamos a
 *      asegurar/upgrade los roles. NUNCA cambiamos su password — eso
 *      quebraría sesiones del QA en pleno test.
 *   4) Roles asignados:
 *        - admin@regis.test         → regis_admin    (company_id NULL = scope org)
 *        - consultor@regis.test     → regis_consultant (company_id NULL = scope org)
 *        - admin@empresa1.test      → client_admin   (company_id = piloto 1)
 *        - admin@empresa2.test      → client_admin   (company_id = piloto 2)
 *        - admin@empresa3.test      → client_admin   (company_id = piloto 3)
 *        - worker@empresa1.test     → worker         (company_id = piloto 1)
 */

import { createClient } from '@supabase/supabase-js'
import * as path from 'node:path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('FATAL: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY ausentes')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PASSWORD = 'Demo2026!'
const REGIS_ORG_NIT = '900000001-1'

const PILOT_NITS = ['900123456-7', '901234567-8', '830987654-3'] as const

type RoleName = 'regis_admin' | 'regis_consultant' | 'client_admin' | 'worker'

type SeedUserSpec = {
  email: string
  nombre: string
  role: RoleName
  /** index en PILOT_NITS, o null si scope = org Regis */
  pilotIndex: number | null
}

const USERS: SeedUserSpec[] = [
  { email: 'admin@regis.test', nombre: 'Admin Regis', role: 'regis_admin', pilotIndex: null },
  {
    email: 'consultor@regis.test',
    nombre: 'Consultor Regis',
    role: 'regis_consultant',
    pilotIndex: null,
  },
  {
    email: 'admin@empresa1.test',
    nombre: 'Admin Consultora Andina',
    role: 'client_admin',
    pilotIndex: 0,
  },
  {
    email: 'admin@empresa2.test',
    nombre: 'Admin Distribuidora Tropical',
    role: 'client_admin',
    pilotIndex: 1,
  },
  {
    email: 'admin@empresa3.test',
    nombre: 'Admin Edificaciones Pacífico',
    role: 'client_admin',
    pilotIndex: 2,
  },
  {
    email: 'worker@empresa1.test',
    nombre: 'Trabajador Andina',
    role: 'worker',
    pilotIndex: 0,
  },
]

function fail(msg: string, extra?: unknown): never {
  console.error(`FATAL: ${msg}`)
  if (extra) console.error(extra)
  process.exit(1)
}

async function loadOrgAndCompanies() {
  const { data: org, error: orgErr } = await supabase
    .from('regis_orgs')
    .select('id')
    .eq('nit', REGIS_ORG_NIT)
    .single()
  if (orgErr || !org) fail('regis_org no encontrada — corre seed_pilot_companies primero', orgErr)
  const orgId = org.id as string

  const companyIds: string[] = []
  for (const nit of PILOT_NITS) {
    const { data: c, error } = await supabase
      .from('companies')
      .select('id')
      .eq('regis_org_id', orgId)
      .eq('nit', nit)
      .single()
    if (error || !c) fail(`piloto ${nit} no encontrado — corre seed_pilot_companies primero`, error)
    companyIds.push(c.id as string)
  }
  return { orgId, companyIds }
}

async function loadRoles() {
  const { data, error } = await supabase.from('roles').select('id, nombre')
  if (error || !data) fail('cargando roles', error)
  const map = new Map<RoleName, string>()
  for (const r of data) map.set(r.nombre as RoleName, r.id as string)
  for (const expected of [
    'regis_admin',
    'regis_consultant',
    'client_admin',
    'worker',
  ] as RoleName[]) {
    if (!map.has(expected)) fail(`rol ${expected} no existe en tabla roles`)
  }
  return map
}

async function findAuthUserByEmail(email: string) {
  // Listamos hasta 1000 — más que suficiente para el demo (6 usuarios).
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (error) fail('listUsers', error)
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null
}

async function ensureAuthUser(spec: SeedUserSpec): Promise<string> {
  const existing = await findAuthUserByEmail(spec.email)
  if (existing) {
    console.log(`  [auth] existing ${spec.email}: ${existing.id}`)
    return existing.id
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email: spec.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: spec.nombre },
  })
  if (error || !data.user) fail(`createUser ${spec.email}`, error)
  console.log(`  [auth] created ${spec.email}: ${data.user.id}`)
  return data.user.id
}

async function ensurePublicUser(authUid: string, email: string, nombre: string): Promise<string> {
  const { data, error } = await supabase.rpc('ensure_user_synced', {
    p_auth_uid: authUid,
    p_email: email,
    p_nombre_completo: nombre,
  })
  if (error || !data) fail(`ensure_user_synced ${email}`, error)
  return data as string
}

async function ensureRoleAssignment(
  userId: string,
  orgId: string,
  companyId: string | null,
  roleId: string,
) {
  // UNIQUE (user_id, regis_org_id, company_id, role_id) → upsert
  // Nota: company_id NULL en UNIQUE no funciona en Postgres (NULLs
  // distintos), por eso comprobamos manualmente antes.
  let q = supabase
    .from('user_company_role')
    .select('id, is_active')
    .eq('user_id', userId)
    .eq('regis_org_id', orgId)
    .eq('role_id', roleId)
  if (companyId === null) q = q.is('company_id', null)
  else q = q.eq('company_id', companyId)
  const { data: existing, error: selErr } = await q.maybeSingle()
  if (selErr) fail('select user_company_role', selErr)
  if (existing) {
    if (!existing.is_active) {
      const { error } = await supabase
        .from('user_company_role')
        .update({ is_active: true, revoked_at: null })
        .eq('id', existing.id)
      if (error) fail('reactivate user_company_role', error)
    }
    return
  }
  const { error } = await supabase.from('user_company_role').insert({
    user_id: userId,
    regis_org_id: orgId,
    company_id: companyId,
    role_id: roleId,
    is_active: true,
  })
  if (error) fail('insert user_company_role', error)
}

async function main() {
  console.log('=== Seed test users (T-F1-019) ===')
  const { orgId, companyIds } = await loadOrgAndCompanies()
  const roles = await loadRoles()
  console.log(`Org Regis: ${orgId}`)
  console.log(`Pilots: ${companyIds.join(', ')}`)

  for (const spec of USERS) {
    console.log(`\n--- ${spec.email} (${spec.role}) ---`)
    const authUid = await ensureAuthUser(spec)
    const appUserId = await ensurePublicUser(authUid, spec.email, spec.nombre)
    const roleId = roles.get(spec.role)!
    const companyId = spec.pilotIndex === null ? null : companyIds[spec.pilotIndex]!
    await ensureRoleAssignment(appUserId, orgId, companyId, roleId)
    console.log(`  [user_company_role] OK (company_id=${companyId ?? 'NULL'})`)
  }

  console.log('\n=== Validación final ===')
  const { count: usersCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .in(
      'email',
      USERS.map((u) => u.email),
    )
  const { count: rolesCount } = await supabase
    .from('user_company_role')
    .select('*', { count: 'exact', head: true })
    .eq('regis_org_id', orgId)
    .eq('is_active', true)

  console.log(`public.users con emails de seed: ${usersCount} (esperado ${USERS.length})`)
  console.log(`user_company_role activos en org : ${rolesCount} (esperado >= ${USERS.length})`)

  if ((usersCount ?? 0) !== USERS.length) {
    fail('mismatch users count')
  }

  console.log('\nOK: seed test users completado.')
  console.log('\nCredenciales (todos password = Demo2026!):')
  for (const u of USERS) console.log(`  ${u.email.padEnd(30)} → ${u.role}`)
}

main().catch((err) => {
  console.error('FATAL unhandled', err)
  process.exit(1)
})
