import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import PilaDemoClient from './PilaDemoClient'

export default async function PilaDemoPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )

  // Fetch all companies to populate the dropdown
  const { data: companies } = await supabase.from('companies').select('id, razon_social, nit')

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <h1 className="text-3xl font-bold text-gray-900">
        Módulo 1: Automatización PILA (Demo Panel)
      </h1>
      <div className="rounded-r-md border-l-4 border-blue-500 bg-blue-50 p-4">
        <p className="text-blue-800">
          <strong>Propósito de este panel:</strong> Esta vista es oculta y sirve para grabar el
          video del concurso. Al simular la recepción del correo, el sistema inyecta un PDF ficticio
          de la PILA en el Webhook (`/api/webhooks/pila-received`), evalúa el documento y cambia el
          estado del Estándar 1.2.1 de la Resolución 0312 a &quot;Cumple&quot;, subiendo el
          porcentaje global en el Dashboard.
        </p>
      </div>

      <PilaDemoClient companies={companies || []} />
    </div>
  )
}
