'use client'

import { useState, useMemo, useCallback } from 'react'
import { Check, Loader2, Link2 } from 'lucide-react'

type Status = 'cumple' | 'no_cumple' | 'no_aplica' | 'pendiente'

type StandardInput = {
  id: string
  standard_number: string
  name: string
  cycle_phva: string
}

type EvalInput = {
  standard_id: string
  status: Status
}

type Props = {
  standards: StandardInput[]
  initialEvaluations: EvalInput[]
  centroId: string
  chapter: 'I' | 'II' | 'III'
}

// ──────────────────────────────────────────────────────────────
// Ciclos PHVA con estilos
// ──────────────────────────────────────────────────────────────
const CYCLES = [
  {
    key: 'Planear',
    label: 'PLANEAR',
    weight: 25,
    color: 'from-sky-500 to-indigo-500',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    barBg: 'bg-sky-100',
    badge: 'bg-sky-100 text-sky-700',
  },
  {
    key: 'Hacer',
    label: 'HACER',
    weight: 60,
    color: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    barBg: 'bg-emerald-100',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  {
    key: 'Verificar',
    label: 'VERIFICAR',
    weight: 5,
    color: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    barBg: 'bg-amber-100',
    badge: 'bg-amber-100 text-amber-700',
  },
  {
    key: 'Actuar',
    label: 'ACTUAR',
    weight: 10,
    color: 'from-purple-500 to-fuchsia-500',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    barBg: 'bg-purple-100',
    badge: 'bg-purple-100 text-purple-700',
  },
] as const

// ──────────────────────────────────────────────────────────────
// 7 Macroestándares oficiales
// ──────────────────────────────────────────────────────────────
const MACROS = [
  { name: 'Recursos', weight: 10, cycle: 'Planear' },
  { name: 'Gestión integral SG-SST', weight: 15, cycle: 'Planear' },
  { name: 'Gestión de la salud', weight: 20, cycle: 'Hacer' },
  { name: 'Gestión de peligros y riesgos', weight: 30, cycle: 'Hacer' },
  { name: 'Gestión de amenazas', weight: 10, cycle: 'Hacer' },
  { name: 'Verificación', weight: 5, cycle: 'Verificar' },
  { name: 'Mejoramiento', weight: 10, cycle: 'Actuar' },
] as const

// ──────────────────────────────────────────────────────────────
// Configuración por capítulo
// ──────────────────────────────────────────────────────────────
const SHARED_LINKS_BY_CHAPTER: Record<string, Record<string, string[]>> = {
  I: {
    '4.1.2': ['Gestión de amenazas'],
    '4.2.1': ['Gestión de amenazas'],
    '3.2.2': ['Mejoramiento'],
  },
  II: {},
  III: {},
}

const MACRO_OVERRIDE_BY_CHAPTER: Record<string, Record<string, string>> = {
  I: { '3.2.2': 'Verificación' },
  II: { '3.2.2': 'Verificación' },
  III: {},
}

// ──────────────────────────────────────────────────────────────
// Nombres cortos de estándares
// ──────────────────────────────────────────────────────────────
const STANDARD_NAMES: Record<string, string> = {
  '1.1.1': 'Asignación de persona responsable SG-SST',
  '1.1.2': 'Responsabilidades asignadas en SST',
  '1.1.3': 'Presupuesto y recursos para el sistema',
  '1.1.4': 'Afiliación al Sistema de Seguridad Social',
  '1.1.5': 'Identificación y cotización de alto riesgo',
  '1.1.6': 'Conformación del COPASST / Vigía',
  '1.1.7': 'Capacitación del COPASST / Vigía',
  '1.1.8': 'Conformación del Comité de Convivencia',
  '1.2.1': 'Capacitación SST',
  '1.2.2': 'Inducción y reinducción de trabajadores',
  '1.2.3': 'Responsable con curso virtual de 50 horas',
  '2.1.1': 'Política del SG-SST firmada y comunicada',
  '2.2.1': 'Objetivos del SG-SST claros y medibles',
  '2.3.1': 'Evaluación inicial del sistema',
  '2.4.1': 'Plan anual de trabajo',
  '2.5.1': 'Archivo y retención documental del SG-SST',
  '2.6.1': 'Rendición de cuentas sobre el desempeño',
  '2.7.1': 'Matriz legal de SST actualizada',
  '2.8.1': 'Mecanismos de comunicación del SG-SST',
  '2.9.1': 'Procedimiento para adquisición de productos/servicios',
  '2.10.1': 'Evaluación y selección de proveedores/contratistas',
  '2.11.1': 'Gestión del impacto de cambios internos/externos',
  '3.1.1': 'Descripción sociodemográfica y diagnóstico de salud',
  '3.1.2': 'Actividades de medicina del trabajo y PyP',
  '3.1.3': 'Información sobre perfiles de cargos al médico',
  '3.1.4': 'Evaluaciones médicas ocupacionales',
  '3.1.5': 'Custodia de historias clínicas bajo reserva',
  '3.1.6': 'Restricciones y recomendaciones médico-laborales',
  '3.1.7': 'Programa de estilos de vida y entornos saludables',
  '3.1.8': 'Servicios de agua potable, sanitarios y basuras',
  '3.1.9': 'Disposición final adecuada de residuos',
  '3.2.1': 'Reporte de accidentes de trabajo y enfermedad laboral',
  '3.2.2': 'Investigación de incidentes, accidentes y enfermedades laborales',
  '3.2.3': 'Registro y análisis estadístico de accidentes',
  '3.3.1': 'Medición de frecuencia de accidentalidad',
  '3.3.2': 'Medición de severidad de accidentalidad',
  '3.3.3': 'Medición de mortalidad por accidentes de trabajo',
  '3.3.4': 'Medición de prevalencia de enfermedad laboral',
  '3.3.5': 'Medición de incidencia de enfermedad laboral',
  '3.3.6': 'Medición del ausentismo por causas médicas',
  '4.1.1': 'Metodología para identificación de peligros',
  '4.1.2': 'Identificación de peligros y evaluación de riesgos',
  '4.1.3': 'Identificación de sustancias carcinógenas/tóxicas',
  '4.1.4': 'Realización de mediciones higiénicas ambientales',
  '4.2.1': 'Medidas de prevención y control',
  '4.2.2': 'Verificación de aplicación de medidas por trabajadores',
  '4.2.3': 'Procedimientos e instructivos de seguridad escritos',
  '4.2.4': 'Inspecciones periódicas planeadas con COPASST',
  '4.2.5': 'Mantenimiento preventivo periódico de equipos/instalaciones',
  '4.2.6': 'Entrega verificable de Elementos de Protección Personal',
  '5.1.1': 'Plan de prevención, preparación y respuesta ante emergencias',
  '5.1.2': 'Brigada de emergencia conformada, dotada y capacitada',
  '6.1.1': 'Definición de indicadores del SG-SST',
  '6.1.2': 'Auditoría interna anual planificada y ejecutada',
  '6.1.3': 'Revisión anual del sistema por la Alta Dirección',
  '6.1.4': 'Planificación de auditorías conjuntas con COPASST',
  '7.1.1': 'Acciones correctivas/preventivas definidas por auditoría',
  '7.1.2': 'Acciones de mejora basadas en revisión directiva',
  '7.1.3': 'Acciones de mejora por accidentes e investigaciones',
  '7.1.4': 'Plan de mejoramiento e implementación de requerimientos ARL',
}

function getDefaultMacro(stdNum: string): string {
  if (stdNum.startsWith('1.1.') || stdNum.startsWith('1.2.')) return 'Recursos'
  if (stdNum.startsWith('2.')) return 'Gestión integral SG-SST'
  if (stdNum.startsWith('3.')) return 'Gestión de la salud'
  if (stdNum.startsWith('4.')) return 'Gestión de peligros y riesgos'
  if (stdNum.startsWith('5.')) return 'Gestión de amenazas'
  if (stdNum.startsWith('6.')) return 'Verificación'
  if (stdNum.startsWith('7.')) return 'Mejoramiento'
  return 'Otros'
}

function getPrimaryMacro(stdNum: string, chapter: string): string {
  const overrides = MACRO_OVERRIDE_BY_CHAPTER[chapter] ?? {}
  return overrides[stdNum] ?? getDefaultMacro(stdNum)
}

function pctColor(pct: number) {
  if (pct >= 86) return 'text-emerald-600'
  if (pct >= 61) return 'text-amber-500'
  return 'text-rose-500'
}

type MacroStandard = {
  std: StandardInput
  isShared: boolean
}

export default function StandardsChecklistTable({
  standards,
  initialEvaluations,
  centroId,
  chapter,
}: Props) {
  const [statuses, setStatuses] = useState<Map<string, Status>>(() => {
    const map = new Map<string, Status>()
    for (const e of initialEvaluations) map.set(e.standard_id, e.status)
    return map
  })

  const [saving, setSaving] = useState<Set<string>>(new Set())

  const stdByNumber = useMemo(() => {
    const map = new Map<string, StandardInput>()
    for (const s of standards) map.set(s.standard_number, s)
    return map
  }, [standards])

  const saveEvaluation = useCallback(
    async (standardId: string, status: Status) => {
      setSaving((prev) => new Set(prev).add(standardId))
      try {
        const res = await fetch('/api/evaluations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ centro_id: centroId, standard_id: standardId, status }),
        })
        if (!res.ok) throw new Error()
      } catch {
        setStatuses((prev) => {
          const next = new Map(prev)
          const old = initialEvaluations.find((e) => e.standard_id === standardId)
          if (old) next.set(standardId, old.status)
          else next.delete(standardId)
          return next
        })
      } finally {
        setSaving((prev) => {
          const next = new Set(prev)
          next.delete(standardId)
          return next
        })
      }
    },
    [centroId, initialEvaluations],
  )

  const toggleCumple = useCallback(
    (standardId: string) => {
      const current = statuses.get(standardId) ?? 'pendiente'
      const next: Status = current === 'cumple' ? 'no_cumple' : 'cumple'
      setStatuses((prev) => new Map(prev).set(standardId, next))
      saveEvaluation(standardId, next)
    },
    [statuses, saveEvaluation],
  )

  // Build grouped data: cycle → macros → standards (including shared)
  const sharedLinks = useMemo(() => SHARED_LINKS_BY_CHAPTER[chapter] ?? {}, [chapter])

  const cycleData = useMemo(() => {
    return CYCLES.map((cycle) => {
      const cycleMacros = MACROS.filter((m) => m.cycle === cycle.key)
      let cycleCumple = 0
      let cycleApplicable = 0

      const macrosWithData = cycleMacros.map((macro) => {
        // Primary standards: standards whose primary macro is this one
        const primaryStds: MacroStandard[] = standards
          .filter((s) => getPrimaryMacro(s.standard_number, chapter) === macro.name)
          .map((s) => ({ std: s, isShared: false }))

        // Shared standards: standards linked to this macro via SHARED_LINKS
        const sharedStds: MacroStandard[] = []
        for (const [stdNum, linkedMacros] of Object.entries(sharedLinks)) {
          if (linkedMacros.includes(macro.name)) {
            const std = stdByNumber.get(stdNum)
            if (std) {
              const alreadyIncluded = primaryStds.some((p) => p.std.id === std.id)
              if (!alreadyIncluded) {
                sharedStds.push({ std, isShared: true })
              }
            }
          }
        }

        const allStds = [...primaryStds, ...sharedStds].sort((a, b) =>
          a.std.standard_number.localeCompare(b.std.standard_number, undefined, { numeric: true }),
        )

        let cumple = 0
        for (const { std } of allStds) {
          const st = statuses.get(std.id) ?? 'pendiente'
          if (st === 'cumple') cumple++
        }

        const applicable = allStds.length
        const pct = applicable > 0 ? (cumple / applicable) * 100 : 0

        cycleCumple += cumple
        cycleApplicable += applicable

        return { ...macro, allStds, cumple, applicable, pct }
      })

      const cyclePct = cycleApplicable > 0 ? (cycleCumple / cycleApplicable) * 100 : 0

      return { ...cycle, macros: macrosWithData, cyclePct, cycleCumple, cycleApplicable }
    })
  }, [standards, statuses, stdByNumber, chapter, sharedLinks])

  // Total score (weighted by macro)
  const totalScore = useMemo(() => {
    let sumAportes = 0
    let wActive = 0
    for (const cycle of cycleData) {
      for (const macro of cycle.macros) {
        if (macro.applicable > 0) {
          sumAportes += macro.weight * (macro.cumple / macro.applicable)
          wActive += macro.weight
        }
      }
    }
    return wActive > 0 ? (sumAportes / wActive) * 100 : 0
  }, [cycleData])

  const counters = useMemo(() => {
    let cumple = 0
    let noCumple = 0
    let pendiente = 0
    for (const s of standards) {
      const st = statuses.get(s.id) ?? 'pendiente'
      if (st === 'cumple') cumple++
      else if (st === 'no_cumple') noCumple++
      else pendiente++
    }
    return { cumple, noCumple, pendiente, total: standards.length }
  }, [standards, statuses])

  return (
    <div className="space-y-6">
      {/* Header with total score */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Evaluación de Estándares Mínimos</h2>
            <p className="mt-1 text-sm text-slate-500">
              Resolución 0312 / 2019 — Cap. {chapter} ({standards.length} estándares)
            </p>
          </div>
          <div className="text-right">
            <div className={`text-5xl font-black tabular-nums ${pctColor(totalScore)}`}>
              {totalScore.toFixed(1)}%
            </div>
            <p className="mt-1 text-sm text-slate-500">Cumplimiento total</p>
          </div>
        </div>
        <div className="mt-4 h-4 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-4 rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${Math.min(totalScore, 100)}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
            <div className="text-2xl font-black text-emerald-600">{counters.cumple}</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600/70">
              Cumple
            </div>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-center">
            <div className="text-2xl font-black text-rose-600">{counters.noCumple}</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-rose-600/70">
              No cumple
            </div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
            <div className="text-2xl font-black text-amber-600">{counters.pendiente}</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-600/70">
              Pendiente
            </div>
          </div>
        </div>
      </div>

      {/* Cycles */}
      {cycleData.map((cycle) => (
        <div
          key={cycle.key}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          {/* Cycle header */}
          <div className={`p-6 ${cycle.bg} border-b ${cycle.border}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${cycle.badge}`}
                >
                  {cycle.label}
                </span>
                <span className="text-sm font-medium text-slate-500">Peso: {cycle.weight}%</span>
              </div>
              <div className="text-right">
                <span className={`text-3xl font-black tabular-nums ${pctColor(cycle.cyclePct)}`}>
                  {cycle.cyclePct.toFixed(1)}%
                </span>
                <p className="mt-0.5 text-xs text-slate-500">
                  {cycle.cycleCumple} de {cycle.cycleApplicable} estándares
                </p>
              </div>
            </div>
            <div className={`mt-4 w-full ${cycle.barBg} h-5 overflow-hidden rounded-full`}>
              <div
                className={`h-5 rounded-full bg-gradient-to-r ${cycle.color} transition-all duration-500 ease-out`}
                style={{ width: `${Math.min(cycle.cyclePct, 100)}%` }}
              />
            </div>
          </div>

          {/* Macroestándares */}
          <div className="divide-y divide-slate-100">
            {cycle.macros.map((macro) => (
              <div key={macro.name} className="p-5">
                {/* Macro header */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">{macro.name}</h3>
                    <span className="text-xs font-medium text-slate-400">
                      Peso: {macro.weight}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xl font-black tabular-nums ${pctColor(macro.pct)}`}>
                      {macro.pct.toFixed(0)}%
                    </span>
                    <span className="text-xs text-slate-400">
                      {macro.cumple}/{macro.applicable}
                    </span>
                  </div>
                </div>

                {/* Macro progress bar */}
                <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-3 rounded-full bg-gradient-to-r ${cycle.color} transition-all duration-500 ease-out`}
                    style={{ width: `${Math.min(macro.pct, 100)}%` }}
                  />
                </div>

                {/* Standards checklist */}
                {macro.allStds.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {macro.allStds.map(({ std, isShared }) => {
                      const status = statuses.get(std.id) ?? 'pendiente'
                      const isCumple = status === 'cumple'
                      const isNoCumple = status === 'no_cumple'
                      const isBusy = saving.has(std.id)
                      const label = STANDARD_NAMES[std.standard_number] || std.name

                      const rowBg = isCumple
                        ? 'bg-emerald-50 border-emerald-200'
                        : isNoCumple
                          ? 'bg-rose-50 border-rose-200'
                          : 'bg-amber-50/50 border-amber-200/60'

                      const statusBadge = isCumple
                        ? 'bg-emerald-500 text-white'
                        : isNoCumple
                          ? 'bg-rose-500 text-white'
                          : 'bg-amber-400 text-white'

                      const statusLabel = isCumple
                        ? 'Cumple'
                        : isNoCumple
                          ? 'No cumple'
                          : 'Pendiente'

                      return (
                        <div
                          key={`${macro.name}-${std.id}`}
                          className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${rowBg}`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleCumple(std.id)}
                            disabled={isBusy}
                            className="shrink-0 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                          >
                            {isBusy ? (
                              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                            ) : isCumple ? (
                              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500 shadow-sm">
                                <Check className="h-4 w-4 text-white" strokeWidth={3} />
                              </div>
                            ) : (
                              <div className="h-6 w-6 rounded-md border-2 border-slate-300 transition-colors hover:border-slate-400" />
                            )}
                          </button>

                          <span
                            className={`flex-1 cursor-pointer select-none text-sm ${
                              isCumple ? 'font-semibold text-slate-800' : 'text-slate-700'
                            }`}
                            onClick={() => !isBusy && toggleCumple(std.id)}
                          >
                            {label}
                          </span>

                          {isShared && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-sky-200 bg-sky-100 px-2 py-1 text-[10px] font-semibold text-sky-600">
                              <Link2 className="h-3 w-3" />
                              enlazado
                            </span>
                          )}

                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${statusBadge}`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="mt-4 text-sm italic text-slate-400">
                    Sin estándares aplicables para el capítulo de esta empresa.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
