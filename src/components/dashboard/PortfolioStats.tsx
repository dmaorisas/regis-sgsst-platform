// =========================================================
// PortfolioStats — KPIs agregados de la cartera Regis.
// =========================================================

import { semaforoFor } from './SemaforoBadge'

export type PortfolioMetrics = {
  totalCompanies: number
  avgScore: number
  alertCount: number
  topScore: number
}

export default function PortfolioStats({ metrics }: { metrics: PortfolioMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card label="Empresas piloto" value={String(metrics.totalCompanies)} hint="bajo gestión" />
      <Card
        label="Cumplimiento promedio"
        value={`${metrics.avgScore.toFixed(1)}%`}
        tone={semaforoFor(metrics.avgScore)}
        hint="ponderado por empresa"
      />
      <Card
        label="Cumplimiento más alto"
        value={`${metrics.topScore.toFixed(1)}%`}
        tone={semaforoFor(metrics.topScore)}
        hint="mejor empresa de la cartera"
      />
      <Card
        label="Alertas críticas"
        value={String(metrics.alertCount)}
        tone={metrics.alertCount > 0 ? 'rojo' : 'verde'}
        hint="empresas con < 60%"
      />
    </div>
  )
}

function Card({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint: string
  tone?: 'verde' | 'amarillo' | 'rojo'
}) {
  const valueColor =
    tone === 'verde'
      ? 'text-emerald-600'
      : tone === 'amarillo'
        ? 'text-amber-600'
        : tone === 'rojo'
          ? 'text-rose-600'
          : 'text-slate-900'
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold leading-none ${valueColor}`}>{value}</p>
      <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
    </div>
  )
}
