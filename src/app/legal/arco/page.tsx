// =========================================================
// /legal/arco — Formulario público de solicitudes ARCO
// =========================================================
// Tarea: T-F15-008
// Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/27
//
// Server Component que monta un Client Component con el formulario.
// =========================================================

import ArcoForm from './arco-form'

export const metadata = {
  title: 'Solicitudes ARCO · Regis SG-SST',
}

export default function ArcoPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Solicitudes ARCO</h1>
        <p className="mt-2 text-sm text-slate-600">
          Como titular de tus datos personales, la Ley 1581 de 2012 te garantiza los derechos de
          Acceso, Rectificación, Cancelación, Oposición y Revocación. Usa este formulario para
          ejercerlos. Recibirás respuesta al correo indicado en máximo 15 días hábiles (Decreto
          1377/2013).
        </p>
      </header>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <ArcoForm />
      </div>
    </main>
  )
}
