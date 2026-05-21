function inline(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" rel="noopener" target="_blank" class="text-sky-600 hover:underline">$1</a>',
    )
}

/**
 * Conversor markdown→HTML mínimo y seguro para renderizar texto estructurado.
 */
export function simpleMarkdownToHtml(md: string): string {
  if (!md) return ''
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
      out.push('<hr class="my-4 border-slate-200">')
      continue
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      closeList()
      closeTable()
      const level = (h[1] ?? '#').length
      let sizeClass = 'text-base font-semibold mt-4 mb-2 text-slate-800'
      if (level === 1) sizeClass = 'text-xl font-bold mt-6 mb-3 text-slate-900 border-b pb-1'
      if (level === 2) sizeClass = 'text-lg font-bold mt-5 mb-2 text-slate-800'
      if (level === 3) sizeClass = 'text-base font-semibold mt-4 mb-2 text-slate-800'
      out.push(`<h${level} class="${sizeClass}">${inline(h[2] ?? '')}</h${level}>`)
      continue
    }
    if (line.startsWith('> ')) {
      closeList()
      closeTable()
      out.push(
        `<blockquote class="border-l-4 border-slate-300 pl-4 italic text-slate-600 my-2">${inline(line.slice(2))}</blockquote>`,
      )
      continue
    }
    const li = line.match(/^[-*]\s+(.*)$/)
    if (li) {
      closeTable()
      if (!inList) {
        out.push('<ul class="list-disc pl-5 space-y-1 my-2">')
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
        out.push(
          '<table class="min-w-full divide-y divide-slate-200 border my-4 text-sm"><tbody class="divide-y divide-slate-200">',
        )
        inTable = true
      }
      out.push(
        '<tr class="hover:bg-slate-50">' +
          cells.map((c) => `<td class="px-3 py-2 text-slate-700">${inline(c)}</td>`).join('') +
          '</tr>',
      )
      continue
    }
    closeList()
    closeTable()
    out.push(`<p class="text-slate-700 leading-relaxed mb-2">${inline(line)}</p>`)
  }
  closeList()
  closeTable()
  return out.join('\n')
}
