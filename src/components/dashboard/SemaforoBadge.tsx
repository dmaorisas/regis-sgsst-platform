// =========================================================
// SemaforoBadge — etiqueta de color según % de cumplimiento.
// =========================================================
// Decisión técnica (R7) — colores y rangos:
//   - Verde     ≥ 90  ("Aceptable") · Tailwind emerald-600
//   - Amarillo  60-89 ("Moderadamente aceptable") · amber-500
//   - Rojo      < 60  ("Crítico") · rose-600
//
// Origen del rango: la propia Resolución 0312/2019 Art. 28
// "Criterios de evaluación": ≥86 cumple, 61-85 moderado, ≤60 crítico.
// Aproximamos al ≥90 / 60-89 / <60 que ya solicita el spec del Issue
// para mantener un solo umbral en toda la app.
// =========================================================

export type Semaforo = 'verde' | 'amarillo' | 'rojo'

export function semaforoFor(pct: number): Semaforo {
  if (pct >= 90) return 'verde'
  if (pct >= 60) return 'amarillo'
  return 'rojo'
}

const STYLE: Record<Semaforo, string> = {
  verde: 'bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200',
  amarillo: 'bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200',
  rojo: 'bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-200',
}

const LABEL: Record<Semaforo, string> = {
  verde: 'Aceptable',
  amarillo: 'Moderado',
  rojo: 'Crítico',
}

export default function SemaforoBadge({ pct, size = 'md' }: { pct: number; size?: 'sm' | 'md' }) {
  const sem = semaforoFor(pct)
  const sizeCls = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${STYLE[sem]} ${sizeCls}`}>
      {LABEL[sem]}
    </span>
  )
}

export function semaforoTextColor(pct: number): string {
  const sem = semaforoFor(pct)
  if (sem === 'verde') return 'text-emerald-600'
  if (sem === 'amarillo') return 'text-amber-600'
  return 'text-rose-600'
}
