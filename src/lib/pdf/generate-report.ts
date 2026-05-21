/**
 * Genera el PDF oficial GTH-F-56 "Seguimiento a Recomendaciones Medico Laborales"
 * usando pdf-lib (pure JS, sin dependencias nativas).
 *
 * Replica exactamente la estructura del template REGIS Colombia:
 * - Header con logo, titulo y metadata
 * - 13 filas de datos estructurados
 * - 7 bloques de texto (diagnostico, tratamiento, funciones, recomendaciones,
 *   observaciones, compromiso funcionario, compromiso entidad)
 * - Pagina de firma
 */

import { PDFDocument, PDFPage, StandardFonts, rgb, PDFFont } from 'pdf-lib'
import type { ExtractedExamFields, ExtractedRecommendation } from '@/lib/ai/medical-extractor'

// ── Layout constants (Letter size: 612 x 792 pts) ──────────────────
const PAGE_W = 612
const PAGE_H = 792
const ML = 55 // margin left
const MR = 557 // margin right
const MT = 45 // margin top
const MB = 50 // margin bottom
const CW = MR - ML // content width
const FONT_SIZE = 8
const LINE_H = 12
const PAD = 5

// Colors
const BLACK = rgb(0, 0, 0)
const GRAY_HEADER = rgb(0.75, 0.75, 0.75)
const GRAY_LIGHT = rgb(0.85, 0.85, 0.85)
const BRAND_COLOR = rgb(0.1, 0.15, 0.3)

// ── Helpers ─────────────────────────────────────────────────────────

/** Approximate text width using average char width. Helvetica ~4.5pt at 8pt. */
function textWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.52
}

/** Word-wrap text into lines that fit a given pixel width. */
function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const lines: string[] = []
  for (const paragraph of (text || '').split('\n')) {
    if (!paragraph.trim()) {
      lines.push('')
      continue
    }
    const words = paragraph.split(/\s+/)
    let current = ''
    for (const word of words) {
      const test = current ? `${current} ${word}` : word
      if (textWidth(test, fontSize) > maxWidth) {
        if (current) lines.push(current)
        current = word
      } else {
        current = test
      }
    }
    if (current) lines.push(current)
  }
  return lines
}

// ── Drawing functions ───────────────────────────────────────────────

function drawHeader(page: PDFPage, y: number, fontBold: PDFFont, fontRegular: PDFFont): number {
  const col2x = ML + 180
  const col3x = MR - 120
  const hh = 55

  // Outer border
  page.drawRectangle({
    x: ML,
    y: y - hh,
    width: CW,
    height: hh,
    borderColor: BLACK,
    borderWidth: 0.8,
  })
  // Vertical dividers
  page.drawLine({
    start: { x: col2x, y },
    end: { x: col2x, y: y - hh },
    thickness: 0.5,
    color: BLACK,
  })
  page.drawLine({
    start: { x: col3x, y },
    end: { x: col3x, y: y - hh },
    thickness: 0.5,
    color: BLACK,
  })

  // Column 1: Logo text
  page.drawText('REGIS', { x: ML + 15, y: y - 25, size: 16, font: fontBold, color: BRAND_COLOR })
  page.drawText('COLOMBIA', {
    x: ML + 15,
    y: y - 40,
    size: 9,
    font: fontRegular,
    color: BRAND_COLOR,
  })

  // Column 2: Title
  page.drawText('FORMATO SST: SEGUIMIENTO A', { x: col2x + 5, y: y - 18, size: 8, font: fontBold })
  page.drawText('RECOMENDACIONES MEDICO LABORALES', {
    x: col2x + 5,
    y: y - 30,
    size: 8,
    font: fontBold,
  })
  page.drawText('PROCESO: GESTION DEL TALENTO HUMANO', {
    x: col2x + 5,
    y: y - 48,
    size: 7,
    font: fontBold,
  })

  // Column 3: Version info
  page.drawText('Version: 3.0', { x: col3x + 5, y: y - 15, size: 7, font: fontRegular })
  page.drawLine({
    start: { x: col3x, y: y - 18 },
    end: { x: MR, y: y - 18 },
    thickness: 0.3,
    color: BLACK,
  })
  page.drawText('Fecha: 12/09/2019', { x: col3x + 5, y: y - 30, size: 7, font: fontRegular })
  page.drawLine({
    start: { x: col3x, y: y - 36 },
    end: { x: MR, y: y - 36 },
    thickness: 0.3,
    color: BLACK,
  })
  page.drawText('Codigo: GTH-F-56', { x: col3x + 5, y: y - 48, size: 7, font: fontRegular })

  return y - hh - 10
}

function newPageWithHeader(
  doc: PDFDocument,
  fontBold: PDFFont,
  fontRegular: PDFFont,
): { page: PDFPage; y: number } {
  const page = doc.addPage([PAGE_W, PAGE_H])
  const y = drawHeader(page, PAGE_H - MT, fontBold, fontRegular)
  return { page, y }
}

function drawDataRow(
  page: PDFPage,
  y: number,
  label: string,
  value: string,
  fontBold: PDFFont,
  fontRegular: PDFFont,
  labelWidth = 195,
): number {
  const rowH = 18

  // Label cell (gray bg)
  page.drawRectangle({
    x: ML,
    y: y - rowH,
    width: labelWidth,
    height: rowH,
    borderColor: BLACK,
    borderWidth: 0.5,
    color: GRAY_LIGHT,
  })
  // Value cell
  page.drawRectangle({
    x: ML + labelWidth,
    y: y - rowH,
    width: CW - labelWidth,
    height: rowH,
    borderColor: BLACK,
    borderWidth: 0.5,
  })

  page.drawText(label, { x: ML + 4, y: y - 13, size: FONT_SIZE, font: fontBold })
  page.drawText(value || '', {
    x: ML + labelWidth + 4,
    y: y - 13,
    size: FONT_SIZE,
    font: fontRegular,
  })

  return y - rowH
}

interface DrawBlockContext {
  doc: PDFDocument
  page: PDFPage
  y: number
  fontBold: PDFFont
  fontRegular: PDFFont
}

function drawTextBlock(
  ctx: DrawBlockContext,
  title: string,
  content: string | null,
  minHeight = 70,
): DrawBlockContext {
  const { doc } = ctx
  let { page, y } = ctx
  const { fontBold, fontRegular } = ctx
  const usableWidth = CW - 2 * PAD
  const lines = wrapText(content || '', usableWidth, FONT_SIZE)
  const titleH = 18

  // If not enough room for the title, start new page
  if (y - 30 < MB) {
    const np = newPageWithHeader(doc, fontBold, fontRegular)
    page = np.page
    y = np.y
  }

  // Draw title bar
  page.drawRectangle({
    x: ML,
    y: y - titleH,
    width: CW,
    height: titleH,
    borderColor: BLACK,
    borderWidth: 0.5,
    color: GRAY_HEADER,
  })
  page.drawText(title, { x: ML + 4, y: y - 13, size: FONT_SIZE, font: fontBold })
  y -= titleH

  // Draw content lines with page overflow support
  let lineIdx = 0

  while (lineIdx < lines.length || lineIdx === 0) {
    const availableH = y - MB
    const linesThatFit = Math.max(Math.floor((availableH - PAD) / LINE_H), 1)
    const batch = lines.slice(lineIdx, lineIdx + linesThatFit)

    let boxH = Math.max(batch.length * LINE_H + 2 * PAD, lineIdx === 0 ? minHeight : 30)
    if (y - boxH < MB) {
      boxH = y - MB
    }

    page.drawRectangle({
      x: ML,
      y: y - boxH,
      width: CW,
      height: boxH,
      borderColor: BLACK,
      borderWidth: 0.5,
    })

    let ty = y - PAD - LINE_H + 2
    for (const line of batch) {
      if (ty < y - boxH + 3) break
      page.drawText(line, { x: ML + PAD, y: ty, size: FONT_SIZE, font: fontRegular })
      ty -= LINE_H
    }

    y -= boxH
    lineIdx += batch.length

    if (lineIdx < lines.length) {
      const np = newPageWithHeader(doc, fontBold, fontRegular)
      page = np.page
      y = np.y
    }

    // If no lines at all, we've drawn the min-height box — break
    if (lines.length === 0) break
  }

  return { doc, page, y, fontBold, fontRegular }
}

// ── Main export ─────────────────────────────────────────────────────

export interface ReportInput {
  fields: ExtractedExamFields
  recommendations: ExtractedRecommendation[]
  /** Optional extra fields not in the exam (dependencia, sede, jefe, etc.) */
  externalFields?: Record<string, string>
}

export async function generateGTHF56Report(input: ReportInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

  const f = { ...input.fields, ...(input.externalFields || {}) }

  // Build recommendation text for the text block
  const recsText =
    input.recommendations.length > 0
      ? input.recommendations
          .map((r, i) => {
            const typeLabel =
              r.type === 'restriccion'
                ? 'RESTRICCION'
                : r.type === 'reubicacion'
                  ? 'REUBICACION'
                  : 'RECOMENDACION'
            const duration = r.duration_days ? ` (${r.duration_days} dias)` : ''
            return `${i + 1}. [${typeLabel}${duration}] ${r.text}`
          })
          .join('\n')
      : f.recomendaciones_medico_laborales || ''

  // === PAGE 1: Data rows + Diagnostico + Tratamiento + Funciones ===
  let { page, y } = newPageWithHeader(doc, fontBold, fontRegular)

  const dataRows: [string, string | null | number | undefined][] = [
    ['FECHA', f.fecha],
    ['NOMBRE DEL TRABAJADOR', f.nombre_trabajador],
    ['CEDULA', f.cedula],
    ['EPS', f.eps],
    ['CARGO', f.cargo],
    ['EDAD', f.edad != null ? String(f.edad) : null],
    ['PESO', f.peso],
    ['FECHA DE NACIMIENTO', f.fecha_nacimiento],
    ['DEPENDENCIA', f.dependencia],
    ['EN TRATAMIENTO MEDICO', f.en_tratamiento_medico],
    ['SEDE', f.sede],
    ['TIPO DE VINCULACION LABORAL', f.tipo_vinculacion_laboral],
    ['NOMBRE DEL JEFE INMEDIATO', f.nombre_jefe_inmediato],
  ]

  for (const [label, value] of dataRows) {
    if (y - 18 < MB) {
      const np = newPageWithHeader(doc, fontBold, fontRegular)
      page = np.page
      y = np.y
    }
    y = drawDataRow(page, y, label, String(value ?? ''), fontBold, fontRegular)
  }

  y -= 8

  let ctx: DrawBlockContext = { doc, page, y, fontBold, fontRegular }

  ctx = drawTextBlock(ctx, 'Diagnostico:', f.diagnostico, 70)
  ctx.y -= 8

  ctx = drawTextBlock(ctx, 'Tipo de tratamiento:', f.tipo_tratamiento, 70)
  ctx.y -= 8

  ctx = drawTextBlock(ctx, 'Funciones del cargo:', f.funciones_cargo, 70)

  // === PAGE 2+: Recomendaciones + Observaciones + Compromisos ===
  const np2 = newPageWithHeader(doc, fontBold, fontRegular)
  ctx = { ...ctx, page: np2.page, y: np2.y }

  ctx = drawTextBlock(
    ctx,
    'Estado y cumplimiento de las recomendaciones medico laborales:',
    recsText,
    100,
  )
  ctx.y -= 12

  ctx = drawTextBlock(ctx, 'Observaciones:', f.observaciones, 70)
  ctx.y -= 12

  ctx = drawTextBlock(ctx, 'Compromiso de funcionario:', f.compromiso_funcionario, 70)
  ctx.y -= 12

  ctx = drawTextBlock(ctx, 'Compromiso de la entidad y areas afines:', f.compromiso_entidad, 70)

  // === SIGNATURE PAGE ===
  const npSig = newPageWithHeader(doc, fontBold, fontRegular)
  const sy = npSig.y - 30

  npSig.page.drawRectangle({
    x: ML,
    y: sy - 20,
    width: CW,
    height: 20,
    borderColor: BLACK,
    borderWidth: 0.5,
    color: GRAY_HEADER,
  })
  npSig.page.drawText('Nombre, Cargo y Firma', {
    x: 200,
    y: sy - 14,
    size: 9,
    font: fontBold,
  })

  npSig.page.drawRectangle({
    x: ML,
    y: sy - 140,
    width: CW,
    height: 120,
    borderColor: BLACK,
    borderWidth: 0.5,
  })

  return doc.save()
}
