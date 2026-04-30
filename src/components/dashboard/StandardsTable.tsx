// =========================================================
// StandardsTable — listado de estándares con su status.
// =========================================================
// Tabla responsiva: en mobile (<sm) se vuelve cards apiladas; en
// desktop muestra columnas. Cada fila es link al drill-down.
// =========================================================

import Link from 'next/link'
import type { StandardScoreDetail } from '@/domain/compliance/types'

const STATUS_STYLE: Record<string, string> = {
  cumple: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  no_cumple: 'bg-rose-50 text-rose-700 ring-rose-200',
  no_aplica: 'bg-slate-100 text-slate-600 ring-slate-200',
  pendiente: 'bg-amber-50 text-amber-700 ring-amber-200',
}

const STATUS_LABEL: Record<string, string> = {
  cumple: 'Cumple',
  no_cumple: 'No cumple',
  no_aplica: 'No aplica',
  pendiente: 'Pendiente',
}

const CYCLE_COLOR: Record<string, string> = {
  Planear: 'bg-sky-100 text-sky-800',
  Hacer: 'bg-emerald-100 text-emerald-800',
  Verificar: 'bg-amber-100 text-amber-800',
  Actuar: 'bg-violet-100 text-violet-800',
}

export default function StandardsTable({
  standards,
  drillBaseHref,
}: {
  standards: StandardScoreDetail[]
  /** prefix para link de drill-down. Ej. '/dashboard/standards' */
  drillBaseHref: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-baseline justify-between border-b border-slate-200 p-5 sm:p-6">
        <h2 className="text-base font-semibold text-slate-900">Estándares aplicables</h2>
        <span className="text-xs text-slate-500">{standards.length} ítems</span>
      </div>

      {/* Mobile / card view */}
      <ul className="flex flex-col divide-y divide-slate-100 sm:hidden">
        {standards.map((s) => (
          <li key={s.standard_id}>
            <Link
              href={`${drillBaseHref}/${s.standard_id}`}
              className="block px-4 py-3 transition hover:bg-slate-50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-medium text-slate-900">
                  {s.standard_number}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${STATUS_STYLE[s.status] ?? ''}`}
                >
                  {STATUS_LABEL[s.status] ?? s.status}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px]">
                <span
                  className={`rounded px-1.5 py-0.5 ${CYCLE_COLOR[s.cycle_phva] ?? 'bg-slate-100'}`}
                >
                  {s.cycle_phva}
                </span>
                <span className="text-slate-500">
                  Peso {s.original_weight} · Aporta {s.contributes_to_score.toFixed(2)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Desktop / table view */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Estándar
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Ciclo
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Status
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                Peso
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                Aporta
              </th>
              <th className="w-8 px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {standards.map((s) => (
              <tr key={s.standard_id} className="cursor-pointer transition hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <Link
                    href={`${drillBaseHref}/${s.standard_id}`}
                    className="font-mono font-medium text-slate-900 hover:text-sky-700"
                  >
                    {s.standard_number}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${CYCLE_COLOR[s.cycle_phva] ?? 'bg-slate-100'}`}
                  >
                    {s.cycle_phva}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${STATUS_STYLE[s.status] ?? ''}`}
                  >
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                  {s.original_weight.toFixed(2)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                  {s.contributes_to_score.toFixed(2)}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Link
                    href={`${drillBaseHref}/${s.standard_id}`}
                    className="text-xs text-sky-600 hover:underline"
                  >
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
