// =========================================================
// CompanyCard — datos descriptivos de la empresa cliente.
// =========================================================

export type CompanySummary = {
  razon_social: string
  nit: string
  ciudad: string | null
  numero_trabajadores: number
  clase_riesgo: number | null
  capitulo_aplicable: 'I' | 'II' | 'III' | null
  ciiu_principal: string | null
  centros_count: number
}

const CHAPTER_LABEL: Record<string, string> = {
  I: 'Capítulo I — Microempresa',
  II: 'Capítulo II — Pequeña empresa',
  III: 'Capítulo III — Mediana o gran empresa',
}

export default function CompanyCard({ company }: { company: CompanySummary }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 sm:text-xl">{company.razon_social}</h1>
          <p className="mt-0.5 text-xs text-slate-500">NIT {company.nit}</p>
        </div>
        {company.capitulo_aplicable && (
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-200">
            {CHAPTER_LABEL[company.capitulo_aplicable] ?? company.capitulo_aplicable}
          </span>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
        <Field label="Trabajadores" value={String(company.numero_trabajadores)} />
        <Field
          label="Clase de riesgo"
          value={company.clase_riesgo !== null ? `${company.clase_riesgo}` : '—'}
          tooltip="Nivel de peligrosidad de las actividades de la empresa (I al V). Determina la cotización a la ARL y exigencias del Sistema de Gestión."
        />
        <Field label="CIIU principal" value={company.ciiu_principal ?? '—'} />
        <Field label="Centros de trabajo" value={String(company.centros_count)} />
        <Field label="Ciudad" value={company.ciudad ?? '—'} colSpan={'col-span-2 sm:col-span-4'} />
      </dl>
    </div>
  )
}

function Field({ label, value, colSpan, tooltip }: { label: string; value: string; colSpan?: string; tooltip?: string }) {
  return (
    <div className={colSpan}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500 flex items-center gap-1 group">
        {label}
        {tooltip && (
          <div className="relative flex items-center">
            <svg className="w-3.5 h-3.5 text-slate-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-[10px] leading-tight rounded shadow-lg z-10 normal-case tracking-normal">
              {tooltip}
              <svg className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 text-slate-800" fill="currentColor" viewBox="0 0 8 8"><path d="M0 0l4 4 4-4z" /></svg>
            </div>
          </div>
        )}
      </dt>
      <dd className="mt-0.5 font-medium text-slate-800">{value}</dd>
    </div>
  )
}
