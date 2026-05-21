// ============================================================
// PROTECTED FILE — Do NOT modify without explicit user approval.
// Module: Actas (Comites y Actas de Reunion)
// See: memory/protection_actas_module.md
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { ActaGenerator } from '@/lib/ai/acta-generator'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import fs from 'fs'
import path from 'path'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    /* const supabase = */ createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } },
    )

    // Check auth and roles
    const userWithRoles = await getUserWithRoles()
    if (!userWithRoles) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const {
      companyId,
      tipoComite,
      fecha,
      asistentes,
      asistentesList,
      notasBreves,
      numeroActa,
      directrices,
    } = body

    if (!companyId || !tipoComite || !fecha || !asistentes || !notasBreves || !numeroActa) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
    }

    // Validar seguridad
    if (!userWithRoles.isRegisStaff && !userWithRoles.companyIds.includes(companyId)) {
      return NextResponse.json({ error: 'No tienes acceso a esta empresa' }, { status: 403 })
    }

    const adminSupabase = getSupabaseAdminClient()
    const { data: company, error } = await adminSupabase
      .from('companies')
      .select('razon_social')
      .eq('id', companyId)
      .single()

    if (error || !company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
    }

    const companyName = company.razon_social

    // Generar JSON del Acta
    const generator = new ActaGenerator()
    const aiResponseText = await generator.generateActa(
      tipoComite,
      companyName,
      fecha,
      asistentes,
      notasBreves,
      Number(numeroActa),
      directrices,
    )

    let actaData
    try {
      // Find JSON block in case AI wraps it in markdown
      const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/)
      actaData = JSON.parse(jsonMatch ? jsonMatch[0] : aiResponseText)
    } catch {
      console.error('Failed to parse AI JSON', aiResponseText)
      throw new Error('La IA no devolvió un formato válido.')
    }

    // Procesar Plantilla Word
    const templatePath = path.join(
      process.cwd(),
      'src',
      'app',
      'regis',
      'templates',
      'Regis - acta COPASST final.docx',
    )
    if (!fs.existsSync(templatePath)) {
      throw new Error('No se encontró la plantilla de Word en el servidor.')
    }

    const content = fs.readFileSync(templatePath, 'binary')
    const zip = new PizZip(content)

    // Configurar docxtemplater para manejar saltos de línea correctamente
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    })

    // Rellenar etiquetas
    doc.render({
      empresa: companyName,
      fecha: fecha,
      codigo: actaData.codigo || 'ACT-000',
      numero: Number(numeroActa) || 1,
      version: actaData.version || '1.0',
      resumen_reunion: actaData.resumen_reunion || '',
      asistentes: asistentesList || [],
      tareas_anteriores: actaData.tareas_anteriores || [],
      compromisos: actaData.compromisos || [],
      fecha_proxima: actaData.fecha_proxima || '',
      lugar: actaData.lugar || '',
      hora_inicio: actaData.hora_inicio || '',
      hora_fin: actaData.hora_fin || '',
    })

    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    })

    const base64Data = buf.toString('base64')

    return NextResponse.json({ success: true, base64: base64Data })
  } catch (error: unknown) {
    console.error('Error generating acta:', error)
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
