// =========================================================
// ByCycleChart — barras horizontales por ciclo PHVA.
// =========================================================
// Implementación pura CSS (Tailwind) — sin lib de gráficos.
// La spec dice "barras por ciclo PHVA". Cada ciclo muestra el
// porcentaje aportado al total y un peso máximo teórico (suma de los
// pesos del capítulo correspondientes a ese ciclo).
// =========================================================

import type { ByCycle } from '@/domain/compliance/types'

const ORDER: ReadonlyArray<keyof ByCycle> = ['Planear', 'Hacer', 'Verificar', 'Actuar']

const CYCLE_COLOR: Record<keyof ByCycle, string> = {
  Planear: 'bg-sky-500',
  Hacer: 'bg-emerald-500',
  Verificar: 'bg-amber-500',
  Actuar: 'bg-violet-500',
}

const CYCLE_HINT: Record<keyof ByCycle, string> = {
  Planear: 'Recursos, gestión integral, planificación.',
  Hacer: 'Implementación operativa, capacitación, salud, riesgos.',
  Verificar: 'Auditorías, indicadores, supervisión.',
  Actuar: 'Mejora continua, acciones correctivas.',
}

export default function ByCycleChart({
  byCycle,
  total,
}: {
  byCycle: ByCycle
  /** % global, para escalar la "barra completa" relativamente. */
  total: number
}) {
  // Para mostrar progreso visual escalamos el ancho de cada barra al
  // mayor valor por ciclo (si el total es bajo, las barras siguen
  // siendo legibles). Mínimo 2% para que se vea aunque sea 0.
  const max = Math.max(...ORDER.map((k) => byCycle[k]), 25)
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-slate-900">Ciclo PHVA</h2>
        <span className="text-xs text-slate-500">Aporte al total ({total.toFixed(1)}%)</span>
      </div>
      <ul className="flex flex-col gap-3">
        {ORDER.map((cycle) => {
          const value = byCycle[cycle] ?? 0
          const widthPct = Math.min(100, (value / max) * 100)
          return (
            <li key={cycle}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-slate-800">{cycle}</span>
                <span className="tabular-nums text-slate-600">{value.toFixed(2)}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${CYCLE_COLOR[cycle]}`}
                  style={{ width: `${Math.max(widthPct, 2)}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">{CYCLE_HINT[cycle]}</p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
