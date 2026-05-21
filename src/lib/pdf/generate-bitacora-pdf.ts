import { PDFDocument, PDFPage, StandardFonts, rgb, PDFFont } from 'pdf-lib'

const PAGE_W = 612
const PAGE_H = 792
const ML = 50
const MR = 562
const MT = 45
const MB = 55
const CW = MR - ML
const FONT_SIZE = 9
const LINE_H = 13
const PAD = 8

const BRAND_COLOR = rgb(0.02, 0.33, 0.63)
const GRAY_BG = rgb(0.94, 0.95, 0.96)
const GREEN_BG = rgb(0.91, 0.96, 0.91)
const RED_BG = rgb(0.97, 0.92, 0.92)
const BLUE_BG = rgb(0.91, 0.94, 0.98)
const GRAY_TEXT = rgb(0.45, 0.45, 0.45)
const SEPARATOR = rgb(0.82, 0.84, 0.86)

function wrapText(text: string, maxWidth: number, font: PDFFont, fontSize: number): string[] {
  const lines: string[] = []
  for (const paragraph of (text || '').split('\n')) {
    const trimmed = paragraph.trim()
    if (!trimmed) {
      lines.push('')
      continue
    }
    const words = trimmed.split(/\s+/)
    let current = ''
    for (const word of words) {
      const test = current ? `${current} ${word}` : word
      const w = font.widthOfTextAtSize(test, fontSize)
      if (w > maxWidth && current) {
        lines.push(current)
        current = word
      } else {
        current = test
      }
    }
    if (current) lines.push(current)
  }
  return lines
}

function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^>\s+/gm, '')
}

interface PageContext {
  doc: PDFDocument
  page: PDFPage
  y: number
  fontRegular: PDFFont
  fontBold: PDFFont
}

function drawFooter(page: PDFPage, font: PDFFont, pageNum: number): void {
  const text = `Pagina ${pageNum}`
  const w = font.widthOfTextAtSize(text, 7)
  page.drawText(text, { x: MR - w, y: 30, size: 7, font, color: GRAY_TEXT })
  page.drawLine({
    start: { x: ML, y: 42 },
    end: { x: MR, y: 42 },
    thickness: 0.5,
    color: SEPARATOR,
  })
  page.drawText('Plataforma Regis - Sistema de Gestion de Seguridad y Salud en el Trabajo', {
    x: ML,
    y: 30,
    size: 7,
    font,
    color: GRAY_TEXT,
  })
}

function newPage(ctx: PageContext, pageCount: { value: number }): PageContext {
  const page = ctx.doc.addPage([PAGE_W, PAGE_H])
  pageCount.value++
  drawFooter(page, ctx.fontRegular, pageCount.value)
  return { ...ctx, page, y: PAGE_H - MT }
}

function drawHeader(
  ctx: PageContext,
  companyName: string,
  monthLabel: string,
  generatedDate: string,
): number {
  const { page, fontBold, fontRegular } = ctx
  let y = ctx.y

  page.drawRectangle({
    x: ML,
    y: y - 65,
    width: CW,
    height: 65,
    color: BRAND_COLOR,
  })

  page.drawText('BITACORA MENSUAL SG-SST', {
    x: ML + 15,
    y: y - 22,
    size: 16,
    font: fontBold,
    color: rgb(1, 1, 1),
  })

  page.drawText('Informe de Avance del Sistema de Gestion de Seguridad y Salud en el Trabajo', {
    x: ML + 15,
    y: y - 38,
    size: 8,
    font: fontRegular,
    color: rgb(0.85, 0.88, 0.92),
  })

  page.drawText(`Periodo: ${monthLabel}`, {
    x: ML + 15,
    y: y - 55,
    size: 9,
    font: fontBold,
    color: rgb(1, 1, 1),
  })

  const dateText = `Generado: ${generatedDate}`
  const dateW = fontRegular.widthOfTextAtSize(dateText, 8)
  page.drawText(dateText, {
    x: MR - 15 - dateW,
    y: y - 55,
    size: 8,
    font: fontRegular,
    color: rgb(0.85, 0.88, 0.92),
  })

  y -= 65 + 12

  page.drawRectangle({
    x: ML,
    y: y - 22,
    width: CW,
    height: 22,
    color: GRAY_BG,
    borderColor: SEPARATOR,
    borderWidth: 0.5,
  })

  page.drawText(`Empresa: ${companyName}`, {
    x: ML + 10,
    y: y - 15,
    size: 9,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  })

  return y - 22 - 15
}

function drawSectionHeader(
  ctx: PageContext,
  title: string,
  bgColor: typeof GREEN_BG,
  textColor: typeof GREEN_BG,
  pageCount: { value: number },
): PageContext {
  let { page, y } = ctx

  if (y - 30 < MB) {
    const np = newPage(ctx, pageCount)
    page = np.page
    y = np.y
  }

  const headerH = 24
  page.drawRectangle({
    x: ML,
    y: y - headerH,
    width: CW,
    height: headerH,
    color: bgColor,
  })

  page.drawText(title.toUpperCase(), {
    x: ML + 12,
    y: y - 16,
    size: 9,
    font: ctx.fontBold,
    color: textColor,
  })

  return { ...ctx, page, y: y - headerH - 8 }
}

function drawSectionContent(
  ctx: PageContext,
  content: string,
  pageCount: { value: number },
): PageContext {
  let { page, y } = ctx
  const { fontRegular } = ctx

  const plainText = stripMarkdown(content)
  const contentLines = plainText.split('\n')

  for (const rawLine of contentLines) {
    const line = rawLine.trim()
    if (!line) {
      y -= 6
      continue
    }

    const isBullet = line.startsWith('-') || line.startsWith('*')
    const isNumbered = /^\d+\.\s/.test(line)
    const displayLine = isBullet
      ? line.slice(1).trim()
      : isNumbered
        ? line.replace(/^\d+\.\s/, '')
        : line

    const indent = isBullet || isNumbered ? 12 : 0
    const bulletPrefix = isBullet
      ? '  -  '
      : isNumbered
        ? `${line.match(/^\d+/)?.[0] || ''}.  `
        : ''

    const maxW = CW - indent - PAD * 2
    const wrapped = wrapText(displayLine, maxW, fontRegular, FONT_SIZE)

    for (let i = 0; i < wrapped.length; i++) {
      if (y - LINE_H < MB) {
        const np = newPage(ctx, pageCount)
        page = np.page
        y = np.y
      }

      const prefix = i === 0 ? bulletPrefix : '     '
      const text = prefix + wrapped[i]!

      page.drawText(text, {
        x: ML + PAD + indent,
        y,
        size: FONT_SIZE,
        font: fontRegular,
        color: rgb(0.15, 0.15, 0.15),
      })
      y -= LINE_H
    }
  }

  return { ...ctx, page, y: y - 6 }
}

export interface BitacoraPdfInput {
  companyName: string
  month: string
  completedSummary: string
  pendingSummary: string
  nextMonthPlan: string
}

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

export async function generateBitacoraPdf(input: BitacoraPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

  const pageCount = { value: 0 }

  const firstPage = doc.addPage([PAGE_W, PAGE_H])
  pageCount.value = 1
  drawFooter(firstPage, fontRegular, 1)

  let ctx: PageContext = {
    doc,
    page: firstPage,
    y: PAGE_H - MT,
    fontRegular,
    fontBold,
  }

  const [yearStr, monthStr] = input.month.split('-')
  const monthIdx = parseInt(monthStr || '1', 10) - 1
  const monthLabel = `${MONTH_NAMES[monthIdx] || 'Mes'} ${yearStr}`
  const generatedDate = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  ctx.y = drawHeader(ctx, input.companyName, monthLabel, generatedDate)

  ctx = drawSectionHeader(
    ctx,
    'Logros y Actividades Completadas',
    GREEN_BG,
    rgb(0.08, 0.49, 0.08),
    pageCount,
  )
  ctx = drawSectionContent(ctx, input.completedSummary, pageCount)

  ctx.y -= 10

  ctx = drawSectionHeader(
    ctx,
    'Pendientes y Alertas Activas',
    RED_BG,
    rgb(0.72, 0.11, 0.11),
    pageCount,
  )
  ctx = drawSectionContent(ctx, input.pendingSummary, pageCount)

  ctx.y -= 10

  ctx = drawSectionHeader(
    ctx,
    'Plan de Accion - Siguiente Periodo',
    BLUE_BG,
    rgb(0.01, 0.41, 0.63),
    pageCount,
  )
  ctx = drawSectionContent(ctx, input.nextMonthPlan, pageCount)

  ctx.y -= 20

  if (ctx.y - 40 < MB) {
    ctx = newPage(ctx, pageCount)
  }

  ctx.page.drawLine({
    start: { x: ML, y: ctx.y },
    end: { x: MR, y: ctx.y },
    thickness: 0.5,
    color: SEPARATOR,
  })
  ctx.y -= 15

  ctx.page.drawText('Reporte oficial del Sistema de Gestion de Seguridad y Salud en el Trabajo.', {
    x: ML,
    y: ctx.y,
    size: 7,
    font: fontRegular,
    color: GRAY_TEXT,
  })
  ctx.y -= 10
  ctx.page.drawText(`Generado automaticamente por la Plataforma Regis el ${generatedDate}.`, {
    x: ML,
    y: ctx.y,
    size: 7,
    font: fontRegular,
    color: GRAY_TEXT,
  })

  return doc.save()
}
