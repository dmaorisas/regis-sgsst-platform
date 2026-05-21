// Extrae texto de un PDF en base64.
// Estrategia dual:
//   1. Intenta pdf-parse (PDFs digitales con capa de texto) — rapido, ~100ms
//   2. Si el texto es insuficiente, usa OCR via Python (PyMuPDF render + EasyOCR) — ~5-15s
// Aislado en su propio modulo para evitar problemas de bundling con pdf-parse.

import { createLogger } from '@/lib/logger'
import { execFile } from 'child_process'
import { resolve } from 'path'

const log = createLogger({ module: 'pdf:extract' })

/** Minimum characters to consider a PDF as having usable text content. */
const MIN_TEXT_THRESHOLD = 50

/** Path to the Python OCR bridge script. */
const OCR_SCRIPT = resolve(process.cwd(), 'scripts/ocr-extract.py')

/**
 * Extract text from a base64-encoded PDF.
 * First tries fast digital extraction (pdf-parse).
 * Falls back to OCR (Python + EasyOCR) for scanned documents.
 */
export async function extractTextFromPdfBase64(pdfBase64: string): Promise<string> {
  const pdfBuffer = Buffer.from(pdfBase64, 'base64')

  // Basic validation: a valid PDF starts with %PDF
  const header = pdfBuffer.slice(0, 5).toString('ascii')
  if (!header.startsWith('%PDF')) {
    throw new Error('El archivo no es un PDF valido (header incorrecto).')
  }

  // Step 1: Try fast digital text extraction
  let digitalText = ''
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse')
    const result = await pdfParse(pdfBuffer)
    digitalText = (result.text || '').trim()

    log.info(
      { pages: result.numpages, textLength: digitalText.length },
      'pdf-parse extraction done',
    )
  } catch (err) {
    log.warn({ err }, 'pdf-parse failed, will attempt OCR')
  }

  // If digital extraction returned enough text, use it
  if (digitalText.length >= MIN_TEXT_THRESHOLD) {
    log.info({ method: 'digital', chars: digitalText.length }, 'using digital text')
    return digitalText
  }

  // Step 2: Fall back to OCR via Python subprocess
  log.info(
    { digitalChars: digitalText.length, threshold: MIN_TEXT_THRESHOLD },
    'insufficient digital text, starting OCR',
  )

  const ocrText = await extractWithOCR(pdfBase64)
  return ocrText
}

/**
 * Call the Python OCR script, sending base64 PDF via stdin.
 * Returns extracted text or throws on failure.
 */
function extractWithOCR(pdfBase64: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      'python3',
      [OCR_SCRIPT],
      {
        maxBuffer: 10 * 1024 * 1024, // 10MB for large OCR output
        timeout: 120_000, // 2 minutes max for heavy OCR
      },
      (error, stdout, stderr) => {
        if (stderr) {
          log.warn({ stderr: stderr.slice(0, 500) }, 'OCR stderr output')
        }

        if (error) {
          log.error({ err: error }, 'OCR subprocess failed')
          reject(
            new Error(
              'No se pudo extraer texto del PDF. El documento puede estar danado o ser una imagen de baja calidad.',
            ),
          )
          return
        }

        try {
          const result = JSON.parse(stdout)

          if (!result.success) {
            reject(new Error(result.error || 'OCR fallo sin mensaje de error'))
            return
          }

          log.info({ method: result.method, chars: result.char_count }, 'OCR extraction successful')

          resolve(result.text)
        } catch {
          log.error({ stdout: stdout.slice(0, 200) }, 'failed to parse OCR output')
          reject(new Error('Error procesando resultado del OCR'))
        }
      },
    )

    // Send base64 via stdin
    if (child.stdin) {
      child.stdin.write(pdfBase64)
      child.stdin.end()
    }
  })
}
