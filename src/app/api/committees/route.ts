// ============================================================
// PROTECTED FILE — Do NOT modify without explicit user approval.
// Module: Actas (Comites y Actas de Reunion)
// See: memory/protection_actas_module.md
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import { createLogger } from '@/lib/logger'

const log = createLogger({ module: 'api:committees' })

export async function GET(req: NextRequest) {
  try {
    const user = await getUserWithRoles()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'Falta companyId' }, { status: 400 })
    }

    // Validar acceso del usuario a la empresa
    if (!user.isRegisStaff && !user.companyIds.includes(companyId)) {
      return NextResponse.json({ error: 'No tienes acceso a esta empresa' }, { status: 403 })
    }

    const admin = getSupabaseAdminClient()

    // 1. Obtener comités con su centro de trabajo
    const { data: committees, error: cErr } = await admin
      .from('committees')
      .select(
        'id, tipo, nombre, fecha_eleccion, fecha_vigencia_fin, is_active, centro_id, centros_de_trabajo:centro_id(nombre)',
      )
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (cErr) {
      log.error({ err: cErr }, 'Error fetching committees')
      return NextResponse.json({ error: cErr.message }, { status: 500 })
    }

    if (!committees || committees.length === 0) {
      return NextResponse.json([])
    }

    // 2. Obtener integrantes de los comités
    const committeeIds = committees.map((c) => c.id)
    const { data: members, error: mErr } = await admin
      .from('committee_members')
      .select(
        `
        id,
        committee_id,
        worker_id,
        rol,
        representacion,
        is_active,
        workers:worker_id (id, nombres, apellidos, cedula)
      `,
      )
      .in('committee_id', committeeIds)
      .is('deleted_at', null)

    if (mErr) {
      log.error({ err: mErr }, 'Error fetching committee members')
      return NextResponse.json({ error: mErr.message }, { status: 500 })
    }

    // 3. Obtener cargos (cargo) en la empresa para los trabajadores
    const { data: workerCompanies, error: wcErr } = await admin
      .from('worker_company')
      .select('worker_id, cargo')
      .eq('company_id', companyId)
      .eq('is_active', true)

    if (wcErr) {
      log.error({ err: wcErr }, 'Error fetching worker cargos')
      return NextResponse.json({ error: wcErr.message }, { status: 500 })
    }

    const cargoMap = new Map<string, string>()
    workerCompanies?.forEach((wc) => {
      cargoMap.set(wc.worker_id, wc.cargo)
    })

    // 4. Mapear e integrar datos
    const membersWithDetails = (members || []).map((m) => {
      const w = m.workers as unknown as {
        nombres: string
        apellidos: string
        cedula: string
      } | null
      return {
        id: m.id,
        committee_id: m.committee_id,
        worker_id: m.worker_id,
        rol: m.rol,
        representacion: m.representacion,
        is_active: m.is_active,
        name: w ? `${w.nombres} ${w.apellidos}` : 'Trabajador Desconocido',
        cedula: w?.cedula || '',
        cargo: cargoMap.get(m.worker_id) || 'Operario',
      }
    })

    const result = committees.map((c) => {
      const cCentro = c.centros_de_trabajo as unknown as { nombre: string } | null
      return {
        ...c,
        centro_nombre: cCentro?.nombre || 'General',
        members: membersWithDetails.filter((m) => m.committee_id === c.id),
      }
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    log.error({ err }, 'Unhandled error in GET /api/committees')
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserWithRoles()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const {
      company_id,
      centro_id,
      tipo,
      nombre,
      fecha_eleccion,
      fecha_vigencia_fin,
      is_active,
      members,
    } = body

    if (!company_id || !centro_id || !tipo || !nombre) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos (company_id, centro_id, tipo, nombre)' },
        { status: 400 },
      )
    }

    // Validar acceso del usuario a la empresa
    if (!user.isRegisStaff && !user.companyIds.includes(company_id)) {
      return NextResponse.json({ error: 'No tienes acceso a esta empresa' }, { status: 403 })
    }

    const admin = getSupabaseAdminClient()

    // 1. Crear el comité
    const { data: newCommittee, error: cErr } = await admin
      .from('committees')
      .insert({
        company_id,
        centro_id,
        tipo,
        nombre,
        fecha_eleccion: fecha_eleccion || null,
        fecha_vigencia_fin: fecha_vigencia_fin || null,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select('id')
      .single()

    if (cErr || !newCommittee) {
      log.error({ err: cErr }, 'Error creating committee')
      return NextResponse.json({ error: cErr.message }, { status: 500 })
    }

    const committeeId = newCommittee.id

    // 2. Insertar integrantes si los hay
    if (members && Array.isArray(members) && members.length > 0) {
      const rowsToInsert = members.map((m) => ({
        committee_id: committeeId,
        worker_id: m.worker_id,
        rol: m.rol,
        representacion: m.representacion || null,
        is_active: m.is_active !== undefined ? m.is_active : true,
      }))

      const { error: mErr } = await admin.from('committee_members').insert(rowsToInsert)

      if (mErr) {
        log.error({ err: mErr }, 'Error inserting committee members')
        // Limpiar comité creado
        await admin.from('committees').delete().eq('id', committeeId)
        return NextResponse.json({ error: mErr.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, committeeId })
  } catch (err: unknown) {
    log.error({ err }, 'Unhandled error in POST /api/committees')
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
