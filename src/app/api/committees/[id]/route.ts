// ============================================================
// PROTECTED FILE — Do NOT modify without explicit user approval.
// Module: Actas (Comites y Actas de Reunion)
// See: memory/protection_actas_module.md
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import { createLogger } from '@/lib/logger'

const log = createLogger({ module: 'api:committees:id' })

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserWithRoles()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const committeeId = params.id
    const body = await req.json()
    const { centro_id, tipo, nombre, fecha_eleccion, fecha_vigencia_fin, is_active, members } = body

    if (!centro_id || !tipo || !nombre) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos (centro_id, tipo, nombre)' },
        { status: 400 },
      )
    }

    const admin = getSupabaseAdminClient()

    // 1. Obtener el comité para validar pertenencia y empresa
    const { data: committee, error: fErr } = await admin
      .from('committees')
      .select('company_id')
      .eq('id', committeeId)
      .single()

    if (fErr || !committee) {
      return NextResponse.json({ error: 'Comité no encontrado' }, { status: 404 })
    }

    const companyId = committee.company_id

    // Validar acceso del usuario a la empresa
    if (!user.isRegisStaff && !user.companyIds.includes(companyId)) {
      return NextResponse.json({ error: 'No tienes acceso a esta empresa' }, { status: 403 })
    }

    // 2. Actualizar el comité
    const { error: cErr } = await admin
      .from('committees')
      .update({
        centro_id,
        tipo,
        nombre,
        fecha_eleccion: fecha_eleccion || null,
        fecha_vigencia_fin: fecha_vigencia_fin || null,
        is_active: is_active !== undefined ? is_active : true,
      })
      .eq('id', committeeId)

    if (cErr) {
      log.error({ err: cErr }, 'Error updating committee')
      return NextResponse.json({ error: cErr.message }, { status: 500 })
    }

    // 3. Sincronizar integrantes: Borrar integrantes actuales
    const { error: dErr } = await admin
      .from('committee_members')
      .delete()
      .eq('committee_id', committeeId)

    if (dErr) {
      log.error({ err: dErr }, 'Error deleting old committee members')
      return NextResponse.json({ error: dErr.message }, { status: 500 })
    }

    // 4. Insertar nuevos integrantes
    if (members && Array.isArray(members) && members.length > 0) {
      const rowsToInsert = members.map((m) => ({
        committee_id: committeeId,
        worker_id: m.worker_id,
        rol: m.rol,
        representacion: m.representacion || null,
        is_active: m.is_active !== undefined ? m.is_active : true,
      }))

      const { error: insErr } = await admin.from('committee_members').insert(rowsToInsert)

      if (insErr) {
        log.error({ err: insErr }, 'Error inserting new committee members')
        return NextResponse.json({ error: insErr.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    log.error({ err }, 'Unhandled error in PUT /api/committees/[id]')
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserWithRoles()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const committeeId = params.id
    const admin = getSupabaseAdminClient()

    // 1. Obtener el comité para validar pertenencia y empresa
    const { data: committee, error: fErr } = await admin
      .from('committees')
      .select('company_id')
      .eq('id', committeeId)
      .single()

    if (fErr || !committee) {
      return NextResponse.json({ error: 'Comité no encontrado' }, { status: 404 })
    }

    const companyId = committee.company_id

    // Validar acceso del usuario a la empresa
    if (!user.isRegisStaff && !user.companyIds.includes(companyId)) {
      return NextResponse.json({ error: 'No tienes acceso a esta empresa' }, { status: 403 })
    }

    // 2. Eliminación lógica del comité
    const nowStr = new Date().toISOString()
    const { error: cErr } = await admin
      .from('committees')
      .update({
        deleted_at: nowStr,
        is_active: false,
      })
      .eq('id', committeeId)

    if (cErr) {
      log.error({ err: cErr }, 'Error deleting committee')
      return NextResponse.json({ error: cErr.message }, { status: 500 })
    }

    // 3. Eliminación lógica de los integrantes
    const { error: mErr } = await admin
      .from('committee_members')
      .update({
        deleted_at: nowStr,
        is_active: false,
      })
      .eq('committee_id', committeeId)

    if (mErr) {
      log.error({ err: mErr }, 'Error deleting committee members')
      return NextResponse.json({ error: mErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    log.error({ err }, 'Unhandled error in DELETE /api/committees/[id]')
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
