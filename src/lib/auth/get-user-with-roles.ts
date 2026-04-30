// =========================================================
// Auth helper — obtiene el usuario actual + sus roles + empresas.
// =========================================================
// Centraliza la lógica RBAC del Bloque 4B. Devuelve `null` si no hay
// sesión activa. Si la sesión existe pero `public.users` aún no tiene
// fila para ese auth_uid, hace lazy-sync llamando a la RPC
// `ensure_user_synced` (creada en migration 014).
//
// El resultado es serializable y sin secretos: puede pasarse desde un
// Server Component a un Client Component como prop sin riesgo.
// =========================================================

import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { User } from '@supabase/supabase-js'

export type RoleName = 'regis_admin' | 'regis_consultant' | 'client_admin' | 'worker'

export type UserRoleAssignment = {
  role: RoleName
  regis_org_id: string
  /** NULL = scope toda la org Regis (regis_admin/regis_consultant). */
  company_id: string | null
}

export type AuthenticatedUser = {
  auth: User
  /** id de public.users (NO de auth.users). Lo usan FKs como evaluator_id. */
  app_user_id: string
  email: string
  nombre_completo: string
  roles: UserRoleAssignment[]
  /** roles únicos como conjunto (ej. {'client_admin'} ó {'regis_admin'}). */
  roleNames: RoleName[]
  /** companies con acceso explícito (excluye filas con company_id NULL). */
  companyIds: string[]
  /** TRUE si tiene al menos un rol regis_admin o regis_consultant. */
  isRegisStaff: boolean
}

export async function getUserWithRoles(): Promise<AuthenticatedUser | null> {
  const supabase = createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // Asegurar fila en public.users (idempotente). La RPC retorna el id.
  const { data: appUserId, error: rpcErr } = await supabase.rpc('ensure_user_synced', {
    p_auth_uid: user.id,
    p_email: user.email ?? '',
    p_nombre_completo:
      (user.user_metadata as Record<string, unknown> | null)?.['full_name']?.toString() ?? null,
  })
  if (rpcErr || !appUserId) {
    // Si falla la sincronización, no podemos continuar — devolvemos null
    // (la UI mostrará "no autorizado"). Logueamos para debug.
    console.error('[getUserWithRoles] ensure_user_synced failed', rpcErr)
    return null
  }

  // Cargar fila pública del usuario.
  const { data: pubUser, error: pubErr } = await supabase
    .from('users')
    .select('id, email, nombre_completo')
    .eq('id', appUserId as string)
    .single()
  if (pubErr || !pubUser) {
    console.error('[getUserWithRoles] public.users lookup failed', pubErr)
    return null
  }

  // Cargar roles activos.
  const { data: rolesRows, error: rolesErr } = await supabase
    .from('user_company_role')
    .select('regis_org_id, company_id, roles!inner(nombre)')
    .eq('user_id', appUserId as string)
    .eq('is_active', true)

  if (rolesErr) {
    console.error('[getUserWithRoles] roles lookup failed', rolesErr)
    return null
  }

  type Row = {
    regis_org_id: string
    company_id: string | null
    roles: { nombre: string } | { nombre: string }[]
  }
  const roles: UserRoleAssignment[] = ((rolesRows as Row[] | null) ?? []).map((r) => {
    // Supabase devuelve la relación FK como objeto si single FK, array si N:M.
    // Aquí roles es FK simple — pero el tipo lo deja ambiguo, así que normalizamos.
    const role = Array.isArray(r.roles) ? r.roles[0] : r.roles
    return {
      role: (role?.nombre ?? 'worker') as RoleName,
      regis_org_id: r.regis_org_id,
      company_id: r.company_id,
    }
  })

  const roleNames = Array.from(new Set(roles.map((r) => r.role)))
  const companyIds = Array.from(
    new Set(roles.filter((r) => r.company_id !== null).map((r) => r.company_id as string)),
  )
  const isRegisStaff = roleNames.includes('regis_admin') || roleNames.includes('regis_consultant')

  return {
    auth: user,
    app_user_id: pubUser.id as string,
    email: pubUser.email as string,
    nombre_completo: pubUser.nombre_completo as string,
    roles,
    roleNames,
    companyIds,
    isRegisStaff,
  }
}
