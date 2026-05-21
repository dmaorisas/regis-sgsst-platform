// ============================================================
// PROTECTED FILE — Do NOT modify without explicit user approval.
// Module: Permissions (Role-based access control configuration)
// See: memory/protection_permissions_module.md
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import { getPermissionsMatrix } from '@/lib/auth/get-module-access'
import { ALL_MODULE_KEYS, type AccessLevel, type ModuleKey } from '@/lib/auth/permissions-config'
import type { RoleName } from '@/lib/auth/get-user-with-roles'
import { createLogger } from '@/lib/logger'

const log = createLogger({ module: 'api:regis:permissions' })

const VALID_ROLES: RoleName[] = ['regis_admin', 'regis_consultant', 'client_admin', 'worker']
const VALID_LEVELS: AccessLevel[] = ['none', 'view', 'full']

export async function GET() {
  try {
    const user = await getUserWithRoles()
    if (!user || !user.roleNames.includes('regis_admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const matrix = await getPermissionsMatrix(user)
    return NextResponse.json({ permissions: matrix })
  } catch (err) {
    log.error({ err }, 'GET /api/regis/permissions failed')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getUserWithRoles()
    if (!user || !user.roleNames.includes('regis_admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const orgId = user.roles[0]?.regis_org_id
    if (!orgId) {
      return NextResponse.json({ error: 'Sin organizacion asignada' }, { status: 400 })
    }

    const body = (await req.json()) as {
      permissions: Array<{
        role_name: string
        module_key: string
        access_level: string
      }>
    }

    if (!Array.isArray(body.permissions)) {
      return NextResponse.json({ error: 'Se requiere un array de permissions' }, { status: 400 })
    }

    for (const p of body.permissions) {
      if (!VALID_ROLES.includes(p.role_name as RoleName)) {
        return NextResponse.json({ error: `Rol invalido: ${p.role_name}` }, { status: 400 })
      }
      if (!ALL_MODULE_KEYS.includes(p.module_key as ModuleKey)) {
        return NextResponse.json({ error: `Modulo invalido: ${p.module_key}` }, { status: 400 })
      }
      if (!VALID_LEVELS.includes(p.access_level as AccessLevel)) {
        return NextResponse.json({ error: `Nivel invalido: ${p.access_level}` }, { status: 400 })
      }
    }

    const admin = getSupabaseAdminClient()

    const { error: delErr } = await admin
      .from('module_permissions')
      .delete()
      .eq('regis_org_id', orgId)

    if (delErr) {
      log.error({ err: delErr }, 'Failed to clear old permissions')
      return NextResponse.json({ error: 'Error al limpiar permisos anteriores' }, { status: 500 })
    }

    if (body.permissions.length > 0) {
      const rows = body.permissions.map((p) => ({
        regis_org_id: orgId,
        role_name: p.role_name,
        module_key: p.module_key,
        access_level: p.access_level,
        updated_by: user.app_user_id,
      }))

      const { error: insErr } = await admin.from('module_permissions').insert(rows)

      if (insErr) {
        log.error({ err: insErr }, 'Failed to insert permissions')
        return NextResponse.json({ error: 'Error al guardar permisos' }, { status: 500 })
      }
    }

    const matrix = await getPermissionsMatrix(user)
    return NextResponse.json({ permissions: matrix })
  } catch (err) {
    log.error({ err }, 'PUT /api/regis/permissions failed')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
