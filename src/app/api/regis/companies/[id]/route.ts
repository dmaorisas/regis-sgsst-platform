import { NextResponse } from 'next/server'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import { createLogger } from '@/lib/logger'

const log = createLogger({ module: 'api:regis:companies:id' })

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

    const companyId = params.id
    if (!companyId) {
      return NextResponse.json({ error: 'ID de empresa requerido' }, { status: 400 })
    }

    const body = await req.json()
    const {
      nit,
      razon_social,
      numero_trabajadores,
      clase_riesgo,
      capitulo_aplicable,
      ciudad,
      direccion,
    } = body

    if (
      !nit ||
      !razon_social ||
      numero_trabajadores === undefined ||
      numero_trabajadores === null
    ) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: NIT, Razón Social o Número de Trabajadores' },
        { status: 400 },
      )
    }

    const admin = getSupabaseAdminClient()

    // 1. Validar que la empresa pertenece a la organización del admin
    const { data: existingCompany, error: checkErr } = await admin
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .eq('regis_org_id', orgId)
      .single()

    if (checkErr || !existingCompany) {
      return NextResponse.json(
        { error: 'Empresa no encontrada o acceso denegado' },
        { status: 404 },
      )
    }

    // 2. Actualizar la empresa
    const { data: updated, error: updErr } = await admin
      .from('companies')
      .update({
        nit,
        razon_social,
        numero_trabajadores,
        clase_riesgo: clase_riesgo ? Number(clase_riesgo) : null,
        capitulo_aplicable: capitulo_aplicable || null,
        ciudad: ciudad || null,
        direccion: direccion || null,
      })
      .eq('id', companyId)
      .select(
        'id, nit, razon_social, numero_trabajadores, clase_riesgo, capitulo_aplicable, ciudad, direccion',
      )
      .single()

    if (updErr) {
      log.error({ err: updErr }, 'Error updating company')
      if (updErr.code === '23505') {
        return NextResponse.json(
          { error: 'El NIT ya está en uso en otra empresa.' },
          { status: 409 },
        )
      }
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    log.info({ companyId }, 'Company updated successfully')
    return NextResponse.json({ success: true, company: updated })
  } catch (err: unknown) {
    log.error({ err }, 'Unhandled error in PUT /api/regis/companies/[id]')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
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

    const companyId = params.id
    if (!companyId) {
      return NextResponse.json({ error: 'ID de empresa requerido' }, { status: 400 })
    }

    const admin = getSupabaseAdminClient()

    // 1. Validar que la empresa pertenece a la organización del admin
    const { data: existingCompany, error: checkErr } = await admin
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .eq('regis_org_id', orgId)
      .single()

    if (checkErr || !existingCompany) {
      return NextResponse.json(
        { error: 'Empresa no encontrada o acceso denegado' },
        { status: 404 },
      )
    }

    // 2. Hacer soft delete seteando deleted_at a NOW()
    const { error: delErr } = await admin
      .from('companies')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', companyId)

    if (delErr) {
      log.error({ err: delErr }, 'Error archiving company')
      return NextResponse.json({ error: delErr.message }, { status: 500 })
    }

    log.info({ companyId }, 'Company archived successfully')
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    log.error({ err }, 'Unhandled error in DELETE /api/regis/companies/[id]')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
