// =========================================================
// /legal/authorization — Autorización de tratamiento (texto público)
// =========================================================
// Tarea: T-F15-007
// Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/27
//
// Renderiza `legal/autorizacion_tratamiento.md`. Reusa el conversor
// md→html mínimo de la página de privacidad para mantener un solo
// estilo / un solo punto de mantenimiento.
// =========================================================

import fs from 'node:fs/promises'
import path from 'node:path'

export const metadata = {
  title: 'Autorización de tratamiento · Regis SG-SST',
}

export default async function AuthorizationPage() {
  let raw = ''
  try {
    const file = path.join(process.cwd(), 'legal', 'autorizacion_tratamiento.md')
    raw = await fs.readFile(file, 'utf-8')
  } catch {
    raw = '# Documento no disponible\n\nContacta a soporte.'
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <article className="prose prose-slate max-w-none whitespace-pre-wrap font-sans text-sm text-slate-800">
        {raw}
      </article>
    </main>
  )
}
