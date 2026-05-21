import { NextResponse } from 'next/server'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import { createLogger } from '@/lib/logger'

const log = createLogger({ module: 'api:regis:companies' })

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

    // Obtener las empresas de la organización, excluyendo las archivadas (deleted_at IS NOT NULL)
    const { data: companies, error } = await admin
      .from('companies')
      .select(
        'id, nit, razon_social, numero_trabajadores, clase_riesgo, capitulo_aplicable, ciudad, direccion, ano_constitucion',
      )
      .eq('regis_org_id', orgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      log.error({ err: error }, 'Error fetching companies')
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(companies || [])
  } catch (err: unknown) {
    log.error({ err }, 'Unhandled error in GET /api/regis/companies')
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

    // Insertar empresa
    const { data, error } = await admin
      .from('companies')
      .insert({
        regis_org_id: orgId,
        nit,
        razon_social,
        numero_trabajadores,
        clase_riesgo: clase_riesgo ? Number(clase_riesgo) : null,
        capitulo_aplicable: capitulo_aplicable || null,
        ciudad: ciudad || null,
        direccion: direccion || null,
      })
      .select(
        'id, nit, razon_social, numero_trabajadores, clase_riesgo, capitulo_aplicable, ciudad, direccion',
      )
      .single()

    if (error) {
      log.error({ err: error }, 'Error creating company')
      // Manejar error de duplicidad de NIT
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'El NIT ya está registrado en esta organización.' },
          { status: 409 },
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    log.info({ companyId: data.id }, 'Company created successfully')
    return NextResponse.json({ success: true, company: data })
  } catch (err: unknown) {
    log.error({ err }, 'Unhandled error in POST /api/regis/companies')
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
