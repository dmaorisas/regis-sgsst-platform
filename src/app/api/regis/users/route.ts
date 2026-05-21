import { NextResponse } from 'next/server'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import { getNotificationService } from '@/lib/notifications/service'
import { createLogger } from '@/lib/logger'

const log = createLogger({ module: 'api:regis:users' })

export async function GET() {
  try {
    const adminUser = await getUserWithRoles()
    if (!adminUser || !adminUser.roleNames.includes('regis_admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const orgId = adminUser.roles[0]?.regis_org_id
    if (!orgId) {
      return NextResponse.json({ error: 'Sin organización asignada' }, { status: 400 })
    }

    const admin = getSupabaseAdminClient()

    // 1. Obtener todas las asignaciones de rol de la organización
    const { data: assignments, error: aErr } = await admin
      .from('user_company_role')
      .select(
        `
        id,
        user_id,
        company_id,
        is_active,
        roles!inner(id, nombre, descripcion),
        companies(id, razon_social),
        users!inner(id, email, nombre_completo, is_active)
      `,
      )
      .eq('regis_org_id', orgId)

    if (aErr) {
      log.error({ err: aErr }, 'Error fetching user assignments')
      return NextResponse.json({ error: aErr.message }, { status: 500 })
    }

    // 2. Agrupar por usuario
    interface UserEntry {
      id: string
      email: string
      nombre_completo: string
      is_active: boolean
      roles: Record<string, unknown>[]
    }
    const usersMap = new Map<string, UserEntry>()

    for (const row of assignments || []) {
      const userRow = row.users as unknown as {
        id: string
        email: string
        nombre_completo: string
        is_active: boolean
      } | null
      const roleRow = row.roles as unknown as { id: string; nombre: string; descripcion: string }
      const companyRow = row.companies as unknown as { razon_social: string } | null

      if (!userRow) continue

      if (!usersMap.has(userRow.id)) {
        usersMap.set(userRow.id, {
          id: userRow.id,
          email: userRow.email,
          nombre_completo: userRow.nombre_completo,
          is_active: userRow.is_active,
          roles: [],
        })
      }

      const userObj = usersMap.get(userRow.id)!
      userObj.roles.push({
        assignment_id: row.id,
        role_id: roleRow.id,
        nombre: roleRow.nombre,
        descripcion: roleRow.descripcion,
        company_id: row.company_id,
        company_name: companyRow?.razon_social || null,
        is_active: row.is_active,
      })
    }

    return NextResponse.json(Array.from(usersMap.values()))
  } catch (err: unknown) {
    log.error({ err }, 'Unhandled error in GET /api/regis/users')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const adminUser = await getUserWithRoles()
    if (!adminUser || !adminUser.roleNames.includes('regis_admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const orgId = adminUser.roles[0]?.regis_org_id
    if (!orgId) {
      return NextResponse.json({ error: 'Sin organización asignada' }, { status: 400 })
    }

    const body = await req.json()
    const { email, nombre_completo, role_name, company_ids } = body

    if (!email || !nombre_completo || !role_name) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    const admin = getSupabaseAdminClient()

    // 1. Obtener el ID del rol por su nombre
    const { data: roleRow, error: rErr } = await admin
      .from('roles')
      .select('id')
      .eq('nombre', role_name)
      .single()

    if (rErr || !roleRow) {
      return NextResponse.json({ error: 'Rol no válido' }, { status: 400 })
    }

    const roleId = roleRow.id

    // 2. Crear el usuario en Supabase Auth
    // Usamos una contraseña por defecto que el usuario pueda cambiar
    const tempPassword = 'Regis' + Math.random().toString(36).slice(-8) + '2026*!'
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: nombre_completo },
    })

    if (authError) {
      log.error({ err: authError }, 'Error creating auth user')
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // 3. Sincronizar con public.users inmediatamente
    const { data: appUserId, error: syncErr } = await admin.rpc('ensure_user_synced', {
      p_auth_uid: authUser.user.id,
      p_email: email,
      p_nombre_completo: nombre_completo,
    })

    if (syncErr || !appUserId) {
      log.error({ err: syncErr }, 'Error syncing user to public.users')
      return NextResponse.json(
        { error: 'Error al sincronizar perfil público del usuario' },
        { status: 500 },
      )
    }

    // 4. Asignar rol y empresas en user_company_role
    if (role_name === 'regis_admin') {
      // Admin Regis tiene acceso a toda la org (company_id = null)
      const { error: insErr } = await admin.from('user_company_role').insert({
        user_id: appUserId,
        regis_org_id: orgId,
        company_id: null,
        role_id: roleId,
        is_active: true,
        granted_by: adminUser.app_user_id,
      })
      if (insErr) throw insErr
    } else if (role_name === 'regis_consultant') {
      // Consultor: múltiples empresas o ninguna
      if (company_ids && Array.isArray(company_ids) && company_ids.length > 0) {
        const rowsToInsert = company_ids.map((cid) => ({
          user_id: appUserId,
          regis_org_id: orgId,
          company_id: cid,
          role_id: roleId,
          is_active: true,
          granted_by: adminUser.app_user_id,
        }))
        const { error: insErr } = await admin.from('user_company_role').insert(rowsToInsert)
        if (insErr) throw insErr
      } else {
        // Si no tiene empresas asignadas, insertar una fila inactiva con company_id = null
        // para mantener la pertenencia del consultor a la organización sin darle permisos comodín
        const { error: insErr } = await admin.from('user_company_role').insert({
          user_id: appUserId,
          regis_org_id: orgId,
          company_id: null,
          role_id: roleId,
          is_active: false,
          granted_by: adminUser.app_user_id,
        })
        if (insErr) throw insErr
      }
    } else {
      // client_admin o worker: una única empresa obligatoria
      const targetCompanyId = company_ids && company_ids[0]
      if (!targetCompanyId) {
        return NextResponse.json(
          { error: 'Debe seleccionar una empresa para este rol' },
          { status: 400 },
        )
      }

      const { error: insErr } = await admin.from('user_company_role').insert({
        user_id: appUserId,
        regis_org_id: orgId,
        company_id: targetCompanyId,
        role_id: roleId,
        is_active: true,
        granted_by: adminUser.app_user_id,
      })
      if (insErr) throw insErr
    }

    // 5. Enviar correo de bienvenida con credenciales
    try {
      const requestUrl = new URL(req.url)
      const loginUrl = `${requestUrl.protocol}//${requestUrl.host}/login`
      const notificationService = getNotificationService()
      await notificationService.notify({
        recipient_id: appUserId,
        channel: 'email',
        template: 'welcome',
        payload: {
          user_name: nombre_completo,
          login_url: loginUrl,
          email: email,
          password: tempPassword,
        },
      })
      log.info({ appUserId }, 'Welcome email enqueued successfully')
    } catch (notifyErr) {
      log.error({ err: notifyErr, appUserId }, 'Error sending welcome email notification')
    }

    return NextResponse.json({
      success: true,
      user_id: appUserId,
      temp_password: tempPassword,
    })
  } catch (err: unknown) {
    log.error({ err }, 'Unhandled error in POST /api/regis/users')
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
