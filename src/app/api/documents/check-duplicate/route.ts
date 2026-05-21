import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { company_id, document_type_code, file_hash } = await req.json()

    if (!company_id || !document_type_code || !file_hash) {
      return NextResponse.json(
        { error: 'Faltan parametros (company_id, document_type_code, file_hash)' },
        { status: 400 },
      )
    }

    const { data: docType } = await supabase
      .from('document_types')
      .select('id, nombre')
      .eq('codigo', document_type_code)
      .single()

    if (!docType) {
      return NextResponse.json({ is_duplicate: false })
    }

    const { data: candidates } = await supabase
      .from('documents')
      .select('id, created_at, valid_until, status')
      .eq('company_id', company_id)
      .eq('document_type_id', docType.id)
      .eq('file_hash', file_hash)
      .is('deleted_at', null)
      .in('status', ['pending', 'in_review', 'approved'])

    const now = new Date().toISOString()
    const active = (candidates ?? []).find((doc) => !doc.valid_until || doc.valid_until > now)

    if (active) {
      return NextResponse.json({
        is_duplicate: true,
        message: `Este documento ya fue subido en "${docType.nombre}" el ${new Date(active.created_at).toLocaleDateString('es-CO')}`,
        existing_document_id: active.id,
      })
    }

    return NextResponse.json({ is_duplicate: false })
  } catch (error: unknown) {
    console.error('Error en check-duplicate:', error)
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
