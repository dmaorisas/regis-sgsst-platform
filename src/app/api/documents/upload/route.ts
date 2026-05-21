import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createHash } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const companyId = formData.get('company_id') as string
    const documentTypeCode = formData.get('document_type_code') as string
    const fileHash = formData.get('file_hash') as string | null

    if (!file || !companyId || !documentTypeCode) {
      return NextResponse.json(
        { error: 'Faltan parametros requeridos (file, company_id, document_type_code)' },
        { status: 400 },
      )
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())

    const serverHash = createHash('sha256').update(fileBuffer).digest('hex')
    const hash = fileHash || serverHash

    if (fileHash && fileHash !== serverHash) {
      return NextResponse.json(
        { error: 'El hash del archivo no coincide con el contenido' },
        { status: 400 },
      )
    }

    const { data: docType } = await supabase
      .from('document_types')
      .select('id, codigo, nombre')
      .eq('codigo', documentTypeCode)
      .single()

    if (!docType) {
      return NextResponse.json(
        { error: `Tipo de documento "${documentTypeCode}" no encontrado` },
        { status: 400 },
      )
    }

    const { data: candidates } = await supabase
      .from('documents')
      .select('id, created_at, valid_until, status')
      .eq('company_id', companyId)
      .eq('document_type_id', docType.id)
      .eq('file_hash', hash)
      .is('deleted_at', null)
      .in('status', ['pending', 'in_review', 'approved'])

    const now = new Date().toISOString()
    const activeDuplicate = (candidates ?? []).find(
      (doc) => !doc.valid_until || doc.valid_until > now,
    )

    if (activeDuplicate) {
      return NextResponse.json(
        {
          error: 'duplicate',
          message: `Este documento ya fue subido en la categoria "${docType.nombre}" el ${new Date(activeDuplicate.created_at).toLocaleDateString('es-CO')}`,
          existing_document_id: activeDuplicate.id,
        },
        { status: 409 },
      )
    }

    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    const filePath = `${companyId}/${documentTypeCode}/${Date.now()}_${cleanFileName}`

    const { error: uploadError } = await supabase.storage
      .from('company_documents')
      .upload(filePath, fileBuffer, { contentType: file.type })

    if (uploadError) {
      return NextResponse.json(
        { error: `Error al subir archivo: ${uploadError.message}` },
        { status: 500 },
      )
    }

    const { data: company } = await supabase
      .from('companies')
      .select('regis_org_id')
      .eq('id', companyId)
      .single()

    if (!company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
    }

    const { data: appUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_uid', user.id)
      .single()

    const { data: document, error: insertError } = await supabase
      .from('documents')
      .insert({
        regis_org_id: company.regis_org_id,
        company_id: companyId,
        document_type_id: docType.id,
        file_url: filePath,
        storage_bucket: 'company_documents',
        file_hash: hash,
        source: 'manual',
        status: 'approved',
        valid_from: new Date().toISOString(),
        uploaded_by: appUser?.id ?? null,
        metadata: { original_filename: file.name, size_bytes: file.size },
      })
      .select('id, created_at')
      .single()

    if (insertError) {
      return NextResponse.json(
        { error: `Error al registrar documento: ${insertError.message}` },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      document_id: document.id,
      message: 'Documento subido exitosamente',
    })
  } catch (error: unknown) {
    console.error('Error en upload de documento:', error)
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
