// =========================================================
// ScoreCard — tarjeta del % global de cumplimiento.
// =========================================================
// Muestra el número grande, el semáforo y los conteos
// (cumple / no_cumple / no_aplica / pendiente).
// =========================================================

import SemaforoBadge, { semaforoTextColor } from './SemaforoBadge'

type Counters = {
  cumple: number
  no_cumple: number
  no_aplica: number
  pendiente: number
}

export default function ScoreCard({
  percentage,
  asOf,
  counters,
  totalAplicables,
}: {
  percentage: number
  asOf: Date | string
  counters: Counters
  totalAplicables: number
}) {
  const dateStr = typeof asOf === 'string' ? asOf : asOf.toISOString().slice(0, 10)
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Cumplimiento global
          </p>
          <p className="mt-1 text-xs text-slate-500">Corte al {dateStr}</p>
        </div>
        <SemaforoBadge pct={percentage} />
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className={`text-5xl font-bold leading-none ${semaforoTextColor(percentage)}`}>
          {percentage.toFixed(2)}
        </span>
        <span className="text-2xl font-medium text-slate-400">%</span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Counter label="Cumple" value={counters.cumple} tone="verde" />
        <Counter label="No cumple" value={counters.no_cumple} tone="rojo" />
        <Counter label="Pendiente" value={counters.pendiente} tone="amarillo" />
      </dl>

      <p className="mt-3 text-xs text-slate-500">
        {totalAplicables} estándares aplicables a la empresa según Resolución 0312/2019.
      </p>
    </div>
  )
}

function Counter({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'verde' | 'rojo' | 'amarillo' | 'gris'
}) {
  const color =
    tone === 'verde'
      ? 'text-emerald-700 bg-emerald-50'
      : tone === 'rojo'
        ? 'text-rose-700 bg-rose-50'
        : tone === 'amarillo'
          ? 'text-amber-700 bg-amber-50'
          : 'text-slate-700 bg-slate-100'
  return (
    <div className={`rounded-lg px-3 py-2 ${color}`}>
      <dt className="text-[11px] font-medium uppercase tracking-wide opacity-80">{label}</dt>
      <dd className="mt-0.5 text-lg font-bold leading-none">{value}</dd>
    </div>
  )
}
