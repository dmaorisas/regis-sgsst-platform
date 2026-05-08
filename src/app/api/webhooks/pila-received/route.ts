import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } },
    )

    const formData = await req.formData()
    const companyId = formData.get('company_id') as string
    const file = formData.get('file') as File | null

    if (!companyId || !file) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos (company_id, file)' },
        { status: 400 },
      )
    }

    // 1. Subir a Storage
    const fileName = `pila/${companyId}/${new Date().toISOString().split('T')[0]}_${file.name}`
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('company_documents')
      .upload(fileName, file)

    if (uploadError && !uploadError.message.includes('Bucket not found')) {
      console.warn('Storage error:', uploadError)
    }

    const filePath = uploadData?.path || fileName

    // 2. Obtener el ID del Registo de la Organización para la empresa
    const { data: companyData } = await supabaseAdmin
      .from('companies')
      .select('regis_org_id')
      .eq('id', companyId)
      .single()

    if (!companyData) {
      return NextResponse.json({ error: 'Compañía no encontrada' }, { status: 404 })
    }

    // 3. Obtener el ID del tipo de documento 'pila'
    const { data: docType } = await supabaseAdmin
      .from('document_types')
      .select('id')
      .eq('codigo', 'pila')
      .single()

    let documentId = null

    if (docType) {
      // 4. Crear el documento
      const { data: docRecord, error: docError } = await supabaseAdmin
        .from('documents')
        .insert({
          company_id: companyId,
          regis_org_id: companyData.regis_org_id,
          document_type_id: docType.id,
          file_url: filePath,
          status: 'approved',
          valid_from: new Date().toISOString(),
          metadata: { mes_pila: new Date().getMonth() + 1 },
        })
        .select()
        .single()

      if (!docError) {
        documentId = docRecord.id
      }
    }

    // 5. Buscar el Estándar 1.2.1 de la Resolución 0312 (Pago de Seguridad Social)
    const { data: standard } = await supabaseAdmin
      .from('standards_0312')
      .select('id')
      .eq('standard_number', '1.2.1')
      .single()

    if (standard) {
      // 6. Actualizar la evaluación
      // Buscamos la evaluación más reciente (snapshot_date IS NULL o actual)
      const { data: evalData } = await supabaseAdmin
        .from('standard_evaluations')
        .select('id')
        .eq('company_id', companyId)
        .eq('standard_id', standard.id)
        .is('snapshot_date', null)
        .single()

      if (evalData) {
        await supabaseAdmin
          .from('standard_evaluations')
          .update({
            compliance_status: 'meets',
            evidence_id: documentId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', evalData.id)
      } else {
        // Insertamos si no existe
        await supabaseAdmin.from('standard_evaluations').insert({
          company_id: companyId,
          standard_id: standard.id,
          compliance_status: 'meets',
          evidence_id: documentId,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'PILA procesada exitosamente y evaluación actualizada',
    })
  } catch (error: unknown) {
    console.error('Error en Webhook PILA:', error)
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
