import { NextResponse } from 'next/server'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import { createLogger } from '@/lib/logger'

const log = createLogger({ module: 'api:regis:users:id' })

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const adminUser = await getUserWithRoles()
    if (!adminUser || !adminUser.roleNames.includes('regis_admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const orgId = adminUser.roles[0]?.regis_org_id
    if (!orgId) {
      return NextResponse.json({ error: 'Sin organización asignada' }, { status: 400 })
    }

    const userId = params.id
    const body = await req.json()
    const { nombre_completo, role_name, company_ids, is_active } = body

    const admin = getSupabaseAdminClient()

    // 1. Obtener la fila pública del usuario para validar pertenencia y obtener auth_uid
    const { data: userRow, error: uErr } = await admin
      .from('users')
      .select('auth_uid, email')
      .eq('id', userId)
      .single()

    if (uErr || !userRow) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Validar que el usuario pertenece a la misma organización Regis
    const { data: belongs, error: bErr } = await admin
      .from('user_company_role')
      .select('id')
      .eq('user_id', userId)
      .eq('regis_org_id', orgId)
      .limit(1)

    if (bErr || !belongs || belongs.length === 0) {
      return NextResponse.json(
        { error: 'El usuario no pertenece a tu organización' },
        { status: 403 },
      )
    }

    // 2. Actualizar is_active y nombre_completo si vienen en el body
    const updateData: Record<string, unknown> = {}
    if (nombre_completo !== undefined) updateData.nombre_completo = nombre_completo
    if (is_active !== undefined) updateData.is_active = is_active

    if (Object.keys(updateData).length > 0) {
      const { error: updErr } = await admin.from('users').update(updateData).eq('id', userId)

      if (updErr) {
        log.error({ err: updErr }, 'Error updating public.users')
        return NextResponse.json({ error: updErr.message }, { status: 500 })
      }

      // Si actualizamos nombre y tiene auth_uid, actualizar en Supabase Auth
      if (nombre_completo && userRow.auth_uid) {
        const { error: authUpdErr } = await admin.auth.admin.updateUserById(userRow.auth_uid, {
          user_metadata: { full_name: nombre_completo },
        })
        if (authUpdErr) {
          log.warn({ err: authUpdErr }, 'Could not update auth user metadata')
        }
      }
    }

    // 3. Si se especifica un rol, actualizar asignaciones de rol y cartera
    if (role_name) {
      // Obtener el ID del rol por su nombre
      const { data: roleRow, error: rErr } = await admin
        .from('roles')
        .select('id')
        .eq('nombre', role_name)
        .single()

      if (rErr || !roleRow) {
        return NextResponse.json({ error: 'Rol no válido' }, { status: 400 })
      }

      const roleId = roleRow.id

      // Borrar todas las asignaciones previas del usuario en esta org
      const { error: delErr } = await admin
        .from('user_company_role')
        .delete()
        .eq('user_id', userId)
        .eq('regis_org_id', orgId)

      if (delErr) {
        log.error({ err: delErr }, 'Error deleting user_company_role rows')
        return NextResponse.json({ error: delErr.message }, { status: 500 })
      }

      // Insertar las nuevas asignaciones
      const statusActive = is_active !== undefined ? is_active : true

      if (role_name === 'regis_admin') {
        const { error: insErr } = await admin.from('user_company_role').insert({
          user_id: userId,
          regis_org_id: orgId,
          company_id: null,
          role_id: roleId,
          is_active: statusActive,
          granted_by: adminUser.app_user_id,
        })
        if (insErr) throw insErr
      } else if (role_name === 'regis_consultant') {
        if (company_ids && Array.isArray(company_ids) && company_ids.length > 0) {
          const rowsToInsert = company_ids.map((cid) => ({
            user_id: userId,
            regis_org_id: orgId,
            company_id: cid,
            role_id: roleId,
            is_active: statusActive,
            granted_by: adminUser.app_user_id,
          }))
          const { error: insErr } = await admin.from('user_company_role').insert(rowsToInsert)
          if (insErr) throw insErr
        } else {
          // Consultor con 0 empresas: insertar fila inactiva/marcador
          const { error: insErr } = await admin.from('user_company_role').insert({
            user_id: userId,
            regis_org_id: orgId,
            company_id: null,
            role_id: roleId,
            is_active: false,
            granted_by: adminUser.app_user_id,
          })
          if (insErr) throw insErr
        }
      } else {
        // client_admin o worker
        const targetCompanyId = company_ids && company_ids[0]
        if (!targetCompanyId) {
          return NextResponse.json(
            { error: 'Debe seleccionar una empresa para este rol' },
            { status: 400 },
          )
        }

        const { error: insErr } = await admin.from('user_company_role').insert({
          user_id: userId,
          regis_org_id: orgId,
          company_id: targetCompanyId,
          role_id: roleId,
          is_active: statusActive,
          granted_by: adminUser.app_user_id,
        })
        if (insErr) throw insErr
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    log.error({ err }, 'Unhandled error in PUT /api/regis/users/[id]')
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const adminUser = await getUserWithRoles()
    if (!adminUser || !adminUser.roleNames.includes('regis_admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const orgId = adminUser.roles[0]?.regis_org_id
    if (!orgId) {
      return NextResponse.json({ error: 'Sin organización asignada' }, { status: 400 })
    }

    const userId = params.id
    const admin = getSupabaseAdminClient()

    // Marcar usuario como inactivo en public.users
    const { error: uErr } = await admin.from('users').update({ is_active: false }).eq('id', userId)

    if (uErr) {
      log.error({ err: uErr }, 'Error disabling user in users table')
      return NextResponse.json({ error: uErr.message }, { status: 500 })
    }

    // Desactivar todos los roles en user_company_role
    const { error: ucrErr } = await admin
      .from('user_company_role')
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('regis_org_id', orgId)

    if (ucrErr) {
      log.error({ err: ucrErr }, 'Error disabling roles in user_company_role')
      return NextResponse.json({ error: ucrErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    log.error({ err }, 'Unhandled error in DELETE /api/regis/users/[id]')
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
