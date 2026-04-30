// =========================================================
// ReviewItemsList — tabla de items pendientes (Server Component)
// =========================================================

import Link from 'next/link'

export type ReviewItemRow = {
  id: string
  module: string
  task_id: string | null
  confidence: number | null
  reason_for_review: string | null
  status: 'pending'
  created_at: string
  company_id: string | null
}

const REASON_LABEL: Record<string, string> = {
  low_confidence: 'Baja confianza',
  critical_module: 'Módulo crítico',
  schema_mismatch: 'Esquema inválido',
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function ConfidenceBadge({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-xs text-slate-400">—</span>
  }
  const pct = (value * 100).toFixed(0)
  let color = 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (value < 0.7) color = 'bg-rose-50 text-rose-700 ring-rose-200'
  else if (value < 0.85) color = 'bg-amber-50 text-amber-800 ring-amber-200'
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${color}`}
    >
      {pct}%
    </span>
  )
}

export default function ReviewItemsList({ items }: { items: ReviewItemRow[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
        <p className="text-sm">No hay items pendientes de revisión.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600"
            >
              Módulo
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600"
            >
              Razón
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600"
            >
              Confianza
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600"
            >
              Tarea
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600"
            >
              Creado
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50">
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                {item.module}
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">
                {item.reason_for_review
                  ? (REASON_LABEL[item.reason_for_review] ?? item.reason_for_review)
                  : '—'}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm">
                <ConfidenceBadge value={item.confidence} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                {item.task_id ?? '—'}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                {formatDate(item.created_at)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <Link
                  href={`/regis/review-queue/${item.id}`}
                  className="text-sm font-medium text-sky-700 hover:text-sky-900"
                >
                  Revisar →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
