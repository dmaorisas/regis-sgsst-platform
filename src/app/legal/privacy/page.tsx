// =========================================================
// /legal/privacy — Aviso de privacidad (texto público)
// =========================================================
// Tarea: T-F15-007
// Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/27
//
// Renderiza el aviso de privacidad almacenado en `legal/aviso_privacidad.md`.
// Server Component: lee el archivo en build/SSR y lo formatea como HTML
// preservando la estructura del markdown (sin engine completo: replace
// ligeros para los elementos clave — encabezados, párrafos, listas,
// tablas, citas — suficiente para un documento legal estático).
//
// Decisión técnica (R7):
//  - Sin librería markdown para no añadir dependencia. El archivo es
//    nuestro y la formatación es predecible. Si crece el corpus legal
//    se puede migrar a `marked` o `unified` en F2.
// =========================================================

import fs from 'node:fs/promises'
import path from 'node:path'

export const metadata = {
  title: 'Aviso de privacidad · Regis SG-SST',
}

export default async function PrivacyPage() {
  let raw = ''
  try {
    const file = path.join(process.cwd(), 'legal', 'aviso_privacidad.md')
    raw = await fs.readFile(file, 'utf-8')
  } catch {
    raw = '# Documento no disponible\n\nContacta a soporte.'
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <article
        className="prose prose-slate max-w-none"
        dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(raw) }}
      />
    </main>
  )
}

/**
 * Conversor markdown→HTML mínimo. Cubre encabezados (#–######),
 * negritas, itálicas, listas, blockquotes, hr y links — suficiente
 * para los avisos legales versionados del repo.
 */
function simpleMarkdownToHtml(md: string): string {
  const escaped = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const lines = escaped.split(/\r?\n/)
  const out: string[] = []
  let inList = false
  let inTable = false

  const closeList = () => {
    if (inList) {
      out.push('</ul>')
      inList = false
    }
  }
  const closeTable = () => {
    if (inTable) {
      out.push('</tbody></table>')
      inTable = false
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    if (line === '') {
      closeList()
      closeTable()
      out.push('')
      continue
    }
    if (/^---+$/.test(line)) {
      closeList()
      closeTable()
      out.push('<hr>')
      continue
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      closeList()
      closeTable()
      const level = (h[1] ?? '#').length
      out.push(`<h${level}>${inline(h[2] ?? '')}</h${level}>`)
      continue
    }
    if (line.startsWith('> ')) {
      closeList()
      closeTable()
      out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`)
      continue
    }
    const li = line.match(/^[-*]\s+(.*)$/)
    if (li) {
      closeTable()
      if (!inList) {
        out.push('<ul>')
        inList = true
      }
      out.push(`<li>${inline(li[1] ?? '')}</li>`)
      continue
    }
    if (line.startsWith('|') && line.endsWith('|')) {
      closeList()
      const cells = line
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim())
      if (/^[-:\s|]+$/.test(line.replace(/\|/g, ''))) {
        // separador del head — ignorar
        continue
      }
      if (!inTable) {
        out.push('<table><tbody>')
        inTable = true
      }
      out.push('<tr>' + cells.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>')
      continue
    }
    closeList()
    closeTable()
    out.push(`<p>${inline(line)}</p>`)
  }
  closeList()
  closeTable()
  return out.join('\n')
}

function inline(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" rel="noopener">$1</a>')
}
