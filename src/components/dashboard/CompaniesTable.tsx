// =========================================================
// CompaniesTable — listado de empresas de la cartera Regis.
// =========================================================

import { selectCompanyAction } from '@/app/regis/actions'
import SemaforoBadge from './SemaforoBadge'

export type CompanyRow = {
  id: string
  razon_social: string
  nit: string
  ciudad: string | null
  capitulo_aplicable: 'I' | 'II' | 'III' | null
  numero_trabajadores: number
  total_percentage: number | null
  centros_count: number
}

export default function CompaniesTable({ companies }: { companies: CompanyRow[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5 sm:p-6">
        <h2 className="text-base font-semibold text-slate-900">Empresas en la cartera</h2>
        <p className="text-xs text-slate-500">
          % de cumplimiento del último snapshot del centro principal de cada empresa.
        </p>
      </div>

      {/* Mobile cards */}
      <ul className="flex flex-col divide-y divide-slate-100 sm:hidden">
        {companies.map((c) => (
          <li key={c.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">{c.razon_social}</p>
                <p className="text-[11px] text-slate-500">
                  NIT {c.nit} · Cap {c.capitulo_aplicable ?? '—'}
                </p>
              </div>
              {c.total_percentage !== null ? <SemaforoBadge pct={c.total_percentage} /> : null}
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {c.total_percentage !== null ? c.total_percentage.toFixed(1) : '—'}
                </span>
                <span className="text-sm text-slate-500">%</span>
              </div>
              <form action={selectCompanyAction}>
                <input type="hidden" name="companyId" value={c.id} />
                <button type="submit" className="text-xs bg-sky-100 text-sky-700 px-3 py-1.5 rounded-md font-semibold">
                  Ver Dashboard
                </button>
              </form>
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              {c.numero_trabajadores} trab · {c.centros_count} centros · {c.ciudad ?? '—'}
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <Th>Razón social</Th>
              <Th>NIT</Th>
              <Th>Ciudad</Th>
              <Th>Capítulo</Th>
              <Th right>Trabajadores</Th>
              <Th right>Centros</Th>
              <Th right>Cumplimiento</Th>
              <Th>Estado</Th>
              <Th right>Acción</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {companies.map((c) => (
              <tr key={c.id} className="transition hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-slate-900">{c.razon_social}</td>
                <td className="px-4 py-2.5 text-slate-600">{c.nit}</td>
                <td className="px-4 py-2.5 text-slate-600">{c.ciudad ?? '—'}</td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex rounded bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-inset ring-sky-200">
                    {c.capitulo_aplicable ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{c.numero_trabajadores}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{c.centros_count}</td>
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-900">
                  {c.total_percentage !== null ? `${c.total_percentage.toFixed(2)}%` : '—'}
                </td>
                <td className="px-4 py-2.5">
                  {c.total_percentage !== null ? <SemaforoBadge pct={c.total_percentage} /> : '—'}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <form action={selectCompanyAction}>
                    <input type="hidden" name="companyId" value={c.id} />
                    <button type="submit" className="text-xs bg-sky-100 hover:bg-sky-200 transition text-sky-700 px-3 py-1.5 rounded-md font-semibold whitespace-nowrap">
                      Entrar →
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({ children, right = false }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600 ${right ? 'text-right' : 'text-left'}`}
    >
      {children}
    </th>
  )
}
