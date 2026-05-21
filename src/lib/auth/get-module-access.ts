// ============================================================
// PROTECTED FILE — Do NOT modify without explicit user approval.
// Module: Permissions (Role-based access control configuration)
// See: memory/protection_permissions_module.md
// ============================================================

import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { AuthenticatedUser, RoleName } from './get-user-with-roles'
import {
  DEFAULT_PERMISSIONS,
  ALL_MODULE_KEYS,
  type AccessLevel,
  type ModuleKey,
} from './permissions-config'

type PermissionRow = {
  role_name: string
  module_key: string
  access_level: string
}

export async function getModuleAccess(
  user: AuthenticatedUser,
  moduleKey: ModuleKey,
): Promise<AccessLevel> {
  const matrix = await getPermissionsMatrix(user)
  const primaryRole = user.roleNames[0] ?? 'worker'
  return matrix[primaryRole]?.[moduleKey] ?? 'none'
}

export async function getPermissionsMatrix(
  user: AuthenticatedUser,
): Promise<Record<RoleName, Record<ModuleKey, AccessLevel>>> {
  const orgId = user.roles[0]?.regis_org_id
  if (!orgId) return DEFAULT_PERMISSIONS

  const supabase = createSupabaseServerClient()
  const { data: overrides } = await supabase
    .from('module_permissions')
    .select('role_name, module_key, access_level')
    .eq('regis_org_id', orgId)

  if (!overrides || overrides.length === 0) return DEFAULT_PERMISSIONS

  const merged = structuredClone(DEFAULT_PERMISSIONS) as Record<
    RoleName,
    Record<ModuleKey, AccessLevel>
  >

  for (const row of overrides as PermissionRow[]) {
    const role = row.role_name as RoleName
    const mod = row.module_key as ModuleKey
    const level = row.access_level as AccessLevel
    if (merged[role] && ALL_MODULE_KEYS.includes(mod)) {
      merged[role][mod] = level
    }
  }

  return merged
}

export async function getUserModuleMap(
  user: AuthenticatedUser,
): Promise<Record<ModuleKey, AccessLevel>> {
  const matrix = await getPermissionsMatrix(user)
  const primaryRole = user.roleNames[0] ?? 'worker'
  return matrix[primaryRole] ?? DEFAULT_PERMISSIONS.worker
}
