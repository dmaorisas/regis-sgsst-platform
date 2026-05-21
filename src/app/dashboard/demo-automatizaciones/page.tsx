import Link from 'next/link'
import DemoButtons from './DemoButtons'

export const dynamic = 'force-dynamic'

export default function DemoAutomatizacionesPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <Link
          href="/dashboard"
          className="mb-4 inline-block text-sm font-medium text-sky-600 hover:text-sky-800"
        >
          ← Volver al Dashboard
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-[#1e293b]">Demo Automatizaciones</h1>
        <p className="mt-2 text-sm text-[#64748b]">
          Panel temporal para ejecutar manualmente las automatizaciones n8n durante la presentacion.
          Cada boton dispara un webhook GET que ejecuta el workflow completo y retorna el resultado.
        </p>
      </div>

      <DemoButtons />

      <p className="text-center text-xs text-slate-400">
        Este modulo es temporal y puede eliminarse sin afectar ningun otro componente de la
        plataforma.
      </p>
    </main>
  )
}
