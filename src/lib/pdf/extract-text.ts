// Extrae texto de un PDF en base64.
// Aislado en su propio módulo para evitar problemas de bundling con pdf-parse.

import { createLogger } from '@/lib/logger'

const log = createLogger({ module: 'pdf:extract' })

export async function extractTextFromPdfBase64(pdfBase64: string): Promise<string> {
  const pdfBuffer = Buffer.from(pdfBase64, 'base64')

  // Validación básica: un PDF válido empieza con %PDF
  const header = pdfBuffer.slice(0, 5).toString('ascii')
  if (!header.startsWith('%PDF')) {
    throw new Error('El archivo no es un PDF válido (header incorrecto).')
  }

  try {
    // Dynamic import to avoid Next.js bundling issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse')
    const result = await pdfParse(pdfBuffer)
    const text = result.text || ''

    log.info({ pages: result.numpages, textLength: text.length }, 'pdf text extracted')
    return text
  } catch (err) {
    log.error({ err, bufferSize: pdfBuffer.length }, 'pdf-parse failed')
    throw new Error(
      `No se pudo extraer texto del PDF: ${err instanceof Error ? err.message : 'error desconocido'}`,
    )
  }
}
