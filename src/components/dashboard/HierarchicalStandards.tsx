// src/components/dashboard/HierarchicalStandards.tsx
'use client'

import React, { useState, useMemo } from 'react'
import type { StandardScoreDetail, EvaluationStatus } from '@/domain/compliance/types'
import Link from 'next/link'
import {
  ChevronDown,
  CheckCircle2,
  XCircle,
  Clock,
  MinusCircle,
  Search,
  Activity,
  SlidersHorizontal,
  ChevronRight,
} from 'lucide-react'

// ──────────────────────────────────────────────────────────────
// Pesos oficiales por ciclo PHVA (Resolución 0312 / 2019)
// ──────────────────────────────────────────────────────────────
const MACRO_WEIGHTS: Record<string, number> = {
  Planear: 25,
  Hacer: 60,
  Verificar: 5,
  Actuar: 10,
}

// ──────────────────────────────────────────────────────────────
// 7 Macroestándares con sus pesos oficiales
// ──────────────────────────────────────────────────────────────
const MACRO_STANDARDS: Record<string, { weight: number; desc: string }> = {
  Recursos: { weight: 10, desc: 'Recursos financieros, humanos, técnicos y físicos necesarios.' },
  'Gestión integral SG-SST': {
    weight: 15,
    desc: 'Política, objetivos, matriz legal, auditoría, planificación y comunicación.',
  },
  'Gestión de la salud': {
    weight: 20,
    desc: 'Condiciones de salud, exámenes médicos, perfil sociodemográfico y estilo de vida.',
  },
  'Gestión de peligros y riesgos': {
    weight: 30,
    desc: 'Identificación de peligros, evaluación, valoración de riesgos y medidas de control.',
  },
  'Gestión de amenazas': {
    weight: 10,
    desc: 'Plan de preparación, prevención y respuesta ante emergencias y brigada.',
  },
  Verificación: {
    weight: 5,
    desc: 'Auditoría interna, revisión anual por la alta dirección y COPASST.',
  },
  Mejoramiento: {
    weight: 10,
    desc: 'Acciones preventivas y correctivas con base en resultados y plan de mejoramiento.',
  },
}

// ──────────────────────────────────────────────────────────────
// Estética por ciclo PHVA
// ──────────────────────────────────────────────────────────────
const CYCLE_THEME: Record<
  string,
  {
    bg: string
    border: string
    text: string
    bar: string
    badge: string
    lightBg: string
  }
> = {
  Planear: {
    bg: 'bg-gradient-to-r from-sky-50 to-indigo-50/50',
    border: 'border-sky-200/80 focus-within:ring-sky-500',
    text: 'text-sky-800',
    bar: 'bg-gradient-to-r from-sky-400 to-indigo-500',
    badge: 'bg-sky-100/80 text-sky-800 border-sky-200',
    lightBg: 'bg-sky-50/30',
  },
  Hacer: {
    bg: 'bg-gradient-to-r from-emerald-50 to-teal-50/50',
    border: 'border-emerald-200/80 focus-within:ring-emerald-500',
    text: 'text-emerald-800',
    bar: 'bg-gradient-to-r from-emerald-400 to-teal-500',
    badge: 'bg-emerald-100/80 text-emerald-800 border-emerald-200',
    lightBg: 'bg-emerald-50/30',
  },
  Verificar: {
    bg: 'bg-gradient-to-r from-amber-50 to-orange-50/50',
    border: 'border-amber-200/80 focus-within:ring-amber-500',
    text: 'text-amber-800',
    bar: 'bg-gradient-to-r from-amber-400 to-orange-500',
    badge: 'bg-amber-100/80 text-amber-800 border-amber-200',
    lightBg: 'bg-amber-50/30',
  },
  Actuar: {
    bg: 'bg-gradient-to-r from-purple-50 to-fuchsia-50/50',
    border: 'border-purple-200/80 focus-within:ring-purple-500',
    text: 'text-purple-800',
    bar: 'bg-gradient-to-r from-purple-400 to-fuchsia-500',
    badge: 'bg-purple-100/80 text-purple-800 border-purple-200',
    lightBg: 'bg-purple-50/30',
  },
}

// ──────────────────────────────────────────────────────────────
// Mapeo detallado de nombres cortos de estándares en español
// ──────────────────────────────────────────────────────────────
const STANDARD_NAMES: Record<string, string> = {
  '1.1.1': 'Responsable del diseño del SG-SST',
  '1.1.2': 'Responsabilidades asignadas en SST',
  '1.1.3': 'Presupuesto y recursos para el sistema',
  '1.1.4': 'Afiliación al Sistema de Seguridad Social Integral',
  '1.1.5': 'Identificación y cotización de alto riesgo',
  '1.1.6': 'Conformación del COPASST / Vigía',
  '1.1.7': 'Capacitación del COPASST / Vigía',
  '1.1.8': 'Conformación del Comité de Convivencia',
  '1.2.1': 'Programa de capacitación anual de SST',
  '1.2.2': 'Inducción y reinducción de trabajadores',
  '1.2.3': 'Responsable con curso virtual de 50 horas',
  '2.1.1': 'Política del SG-SST firmada y comunicada',
  '2.2.1': 'Objetivos del SG-SST claros y medibles',
  '2.3.1': 'Evaluación inicial del sistema',
  '2.4.1': 'Plan anual de trabajo firmado con cronograma',
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
  '3.2.2': 'Investigación de incidentes, accidentes y enfermedades',
  '3.2.3': 'Registro y análisis estadístico de accidentes',
  '3.3.1': 'Medición de frecuencia de accidentalidad',
  '3.3.2': 'Medición de severidad de accidentalidad',
  '3.3.3': 'Medición de mortalidad por accidentes de trabajo',
  '3.3.4': 'Medición de prevalencia de enfermedad laboral',
  '3.3.5': 'Medición de incidencia de enfermedad laboral',
  '3.3.6': 'Medición del ausentismo por causas médicas',
  '4.1.1': 'Metodología para identificación de peligros',
  '4.1.2': 'Identificación de peligros con participación activa',
  '4.1.3': 'Identificación de sustancias carcinógenas/tóxicas',
  '4.1.4': 'Realización de mediciones higiénicas ambientales',
  '4.2.1': 'Implementación de medidas de prevención y control',
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

// ──────────────────────────────────────────────────────────────
// Mapeador dinámico de estándar a su macroestándar legal
// ──────────────────────────────────────────────────────────────
function getMacroStandardName(stdNum: string): string {
  if (stdNum.startsWith('1.1.') || stdNum.startsWith('1.2.')) {
    return 'Recursos'
  }
  if (stdNum.startsWith('2.')) {
    return 'Gestión integral SG-SST'
  }
  if (stdNum.startsWith('3.')) {
    return 'Gestión de la salud'
  }
  if (stdNum.startsWith('4.')) {
    return 'Gestión de peligros y riesgos'
  }
  if (stdNum.startsWith('5.')) {
    return 'Gestión de amenazas'
  }
  if (stdNum.startsWith('6.')) {
    return 'Verificación'
  }
  if (stdNum.startsWith('7.')) {
    return 'Mejoramiento'
  }
  return 'Otros'
}

const STATUS_STYLE: Record<
  string,
  { bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  cumple: {
    bg: 'bg-emerald-50/60',
    text: 'text-emerald-700 font-semibold',
    border: 'border-emerald-100 ring-emerald-600/10',
    icon: CheckCircle2,
  },
  no_cumple: {
    bg: 'bg-rose-50/60',
    text: 'text-rose-700 font-semibold',
    border: 'border-rose-100 ring-rose-600/10',
    icon: XCircle,
  },
  pendiente: {
    bg: 'bg-amber-50/60',
    text: 'text-amber-700 font-semibold',
    border: 'border-amber-100 ring-amber-600/10',
    icon: Clock,
  },
  no_aplica: {
    bg: 'bg-slate-50',
    text: 'text-slate-500 font-medium',
    border: 'border-slate-100 ring-slate-600/10',
    icon: MinusCircle,
  },
}

const STATUS_LABEL: Record<string, string> = {
  cumple: 'Cumple',
  no_cumple: 'No cumple',
  pendiente: 'Pendiente',
  no_aplica: 'No aplica',
}

function semaphoreColor(pct: number) {
  if (pct >= 86) return 'text-emerald-600'
  if (pct >= 61) return 'text-amber-500'
  return 'text-rose-600'
}

function semaphoreBg(pct: number) {
  if (pct >= 86) return 'bg-emerald-500'
  if (pct >= 61) return 'bg-amber-500'
  return 'bg-rose-500'
}

// Agrupación y jerarquía
const cycleOrder = ['Planear', 'Hacer', 'Verificar', 'Actuar']

export default function HierarchicalStandards({
  standards,
  drillBaseHref,
}: {
  standards: StandardScoreDetail[]
  drillBaseHref: string
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | EvaluationStatus>('all')

  // Calcular conteo dinámico para filtros
  const counts = useMemo(() => {
    const c = { total: 0, cumple: 0, no_cumple: 0, pendiente: 0, no_aplica: 0 }
    standards.forEach((s) => {
      c.total++
      c[s.status]++
    })
    return c
  }, [standards])

  // Filtrar estándares basándonos en búsqueda y filtro de estado
  const filteredStandards = useMemo(() => {
    return standards.filter((s) => {
      const matchStatus = statusFilter === 'all' || s.status === statusFilter
      const shortName = STANDARD_NAMES[s.standard_number] || ''
      const matchSearch =
        s.standard_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shortName.toLowerCase().includes(searchQuery.toLowerCase())
      return matchStatus && matchSearch
    })
  }, [standards, searchQuery, statusFilter])

  // Determinar macroestándares que tienen estándares coincidentes
  const _activeMacros = useMemo(() => {
    const macros = new Set<string>()
    filteredStandards.forEach((s) => {
      macros.add(`${s.cycle_phva}|${getMacroStandardName(s.standard_number)}`)
    })
    return macros
  }, [filteredStandards])

  // Estado para colapsar/expandir macroestándares (por defecto todos expandidos)
  const [expandedMacros, setExpandedMacros] = useState<Record<string, boolean>>({})

  const toggleMacro = (key: string) => {
    setExpandedMacros((prev) => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key], // undefined significa expandido por defecto
    }))
  }

  const isExpanded = (key: string) => {
    return expandedMacros[key] !== false // Verdadero si no se ha colapsado explícitamente
  }

  const expandAll = () => {
    setExpandedMacros({})
  }

  const collapseAll = () => {
    const collapsed: Record<string, boolean> = {}
    cycleOrder.forEach((cycle) => {
      Object.keys(MACRO_STANDARDS).forEach((macro) => {
        collapsed[`${cycle}|${macro}`] = false
      })
    })
    setExpandedMacros(collapsed)
  }

  // Agrupar estándares filtrados por Ciclo -> Macroestándar
  const groupedData = useMemo(() => {
    const data: Record<string, Record<string, StandardScoreDetail[]>> = {}

    cycleOrder.forEach((cycle) => {
      data[cycle] = {}
    })

    filteredStandards.forEach((s) => {
      const cycle = s.cycle_phva
      const macro = getMacroStandardName(s.standard_number)
      if (!data[cycle]) data[cycle] = {}
      if (!data[cycle][macro]) data[cycle][macro] = []
      data[cycle][macro].push(s)
    })

    return data
  }, [filteredStandards])

  // ── CÓMPUTO DE PRIORIDADES Y ESTÁNDARES PENDIENTES ──
  const pendingAndNoCumple = useMemo(() => {
    return standards
      .filter((s) => s.status === 'pendiente' || s.status === 'no_cumple')
      .map((s) => {
        const macroName = getMacroStandardName(s.standard_number)
        const macroMeta = MACRO_STANDARDS[macroName] ?? { weight: 0, desc: '' }
        const weight = macroMeta.weight

        let priorityLabel = 'Baja'
        let priorityTone = 'baja'
        if (weight === 30) {
          priorityLabel = 'Crítica'
          priorityTone = 'critica'
        } else if (weight === 20 || weight === 15) {
          priorityLabel = 'Alta'
          priorityTone = 'alta'
        } else if (weight === 10) {
          priorityLabel = 'Media'
          priorityTone = 'media'
        }

        return {
          ...s,
          macroName,
          weight,
          priorityLabel,
          priorityTone,
        }
      })
      .sort((a, b) => {
        if (b.weight !== a.weight) {
          return b.weight - a.weight
        }
        return a.standard_number.localeCompare(b.standard_number, undefined, { numeric: true })
      })
  }, [standards])

  return (
    <div className="space-y-6">
      {/* ── BARRA DE BÚSQUEDA Y FILTROS INTEGRADOS ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Filtros y Búsqueda</h3>
              <p className="text-xs text-slate-500">
                Optimiza tu navegación por los 60 Estándares Mínimos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={expandAll}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Expandir todo
            </button>
            <button
              onClick={collapseAll}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Colapsar todo
            </button>
          </div>
        </div>

        {/* Input de Búsqueda */}
        <div className="relative mt-4 rounded-xl border border-slate-200 transition-all focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar estándar por código o palabra clave... (ej. COPASST, emergencias)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
          />
        </div>

        {/* Botones de Filtro de Estado */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
              statusFilter === 'all'
                ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Todos <span className="ml-1 opacity-70">({counts.total})</span>
          </button>
          <button
            onClick={() => setStatusFilter('cumple')}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
              statusFilter === 'cumple'
                ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                : 'border-slate-200 bg-white text-emerald-600 hover:bg-emerald-50/50'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Cumple <span className="opacity-70">({counts.cumple})</span>
          </button>
          <button
            onClick={() => setStatusFilter('no_cumple')}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
              statusFilter === 'no_cumple'
                ? 'border-rose-600 bg-rose-600 text-white shadow-sm'
                : 'border-slate-200 bg-white text-rose-600 hover:bg-rose-50/50'
            }`}
          >
            <XCircle className="h-3.5 w-3.5" />
            No cumple <span className="opacity-70">({counts.no_cumple})</span>
          </button>
          <button
            onClick={() => setStatusFilter('pendiente')}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
              statusFilter === 'pendiente'
                ? 'border-amber-500 bg-amber-500 text-white shadow-sm'
                : 'border-slate-200 bg-white text-amber-600 hover:bg-amber-50/50'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Pendiente <span className="opacity-70">({counts.pendiente})</span>
          </button>
          <button
            onClick={() => setStatusFilter('no_aplica')}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
              statusFilter === 'no_aplica'
                ? 'border-slate-600 bg-slate-600 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <MinusCircle className="h-3.5 w-3.5" />
            No aplica <span className="opacity-70">({counts.no_aplica})</span>
          </button>
        </div>
      </div>

      {/* ── SECCIÓN DE ALERTAS TEMPRANAS Y PRIORIDADES ── */}
      {pendingAndNoCumple.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="animate-pulse rounded-lg bg-rose-50 p-2 text-rose-600">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Alertas Tempranas y Prioridades
                </h3>
                <p className="text-xs text-slate-500">
                  Estándares pendientes de mayor impacto en tu cumplimiento global (según peso
                  oficial)
                </p>
              </div>
            </div>
            <span className="self-start rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 sm:self-auto">
              {pendingAndNoCumple.length} pendientes
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {pendingAndNoCumple.slice(0, 4).map((s) => {
              const shortName = STANDARD_NAMES[s.standard_number] || 'Estándar específico'

              // Estilo del badge de prioridad
              const badgeStyle =
                s.priorityTone === 'critica'
                  ? 'bg-rose-500 text-white border-rose-600'
                  : s.priorityTone === 'alta'
                    ? 'bg-orange-500 text-white border-orange-600'
                    : s.priorityTone === 'media'
                      ? 'bg-amber-500 text-white border-amber-600'
                      : 'bg-sky-500 text-white border-sky-600'

              const cardBorder =
                s.priorityTone === 'critica'
                  ? 'hover:border-rose-300 hover:ring-2 hover:ring-rose-50'
                  : s.priorityTone === 'alta'
                    ? 'hover:border-orange-300 hover:ring-2 hover:ring-orange-50'
                    : 'hover:border-amber-300 hover:ring-2 hover:ring-amber-50'

              return (
                <Link
                  key={s.standard_id}
                  href={`${drillBaseHref}/${s.standard_id}`}
                  className={`block rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-200 ${cardBorder}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="border-b border-dashed border-slate-300 font-mono text-xs font-black text-slate-900">
                      {s.standard_number}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-sm ${badgeStyle}`}
                    >
                      {s.priorityLabel}
                    </span>
                  </div>

                  <h4 className="mt-2 line-clamp-2 min-h-[2rem] text-xs font-bold text-slate-700">
                    {shortName}
                  </h4>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-2 text-[10px] font-medium text-slate-400">
                    <span>Impacto Macro:</span>
                    <span className="font-black text-slate-700">{s.weight}%</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] font-medium text-slate-400">
                    <span>Estado:</span>
                    <span
                      className={`font-semibold ${s.status === 'no_cumple' ? 'text-rose-600' : 'text-amber-600'}`}
                    >
                      {s.status === 'no_cumple' ? 'No cumple' : 'Pendiente'}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>

          {pendingAndNoCumple.length > 4 && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('pendiente')
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 transition-colors hover:text-sky-700"
              >
                Ver los {pendingAndNoCumple.length - 4} pendientes adicionales en el listado
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── PHVA CYCLES ── */}
      {cycleOrder.map((cycle) => {
        const macros = groupedData[cycle] ?? {}
        const macroKeys = Object.keys(macros) // Show all macro standards, even if empty
        if (macroKeys.length === 0) return null

        // Calcular cumplimiento general del ciclo en base a estándares del snapshot
        const cycleAllStandards = standards.filter((s) => s.cycle_phva === cycle)
        const totalRedistributedWeight = cycleAllStandards.reduce(
          (sum, s) => sum + s.redistributed_weight,
          0,
        )
        const totalContributes = cycleAllStandards.reduce(
          (sum, s) => sum + s.contributes_to_score,
          0,
        )
        const cyclePct =
          totalRedistributedWeight > 0 ? (totalContributes / totalRedistributedWeight) * 100 : 0
        const macroWeight = MACRO_WEIGHTS[cycle] ?? 0
        const theme = CYCLE_THEME[cycle] ?? {
          bg: 'bg-gradient-to-r from-sky-50 to-indigo-50/50',
          border: 'border-sky-200/80 focus-within:ring-sky-500',
          text: 'text-sky-800',
          bar: 'bg-gradient-to-r from-sky-400 to-indigo-500',
          badge: 'bg-sky-100/80 text-sky-800 border-sky-200',
          lightBg: 'bg-sky-50/30',
        }

        return (
          <section
            key={cycle}
            className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md`}
          >
            {/* Cabecera del Ciclo PHVA */}
            <div className={`border-b border-slate-100 p-6 ${theme.bg}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${theme.badge}`}
                    >
                      Ciclo PHVA
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      Resolución 0312 / 2019
                    </span>
                  </div>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-800">
                    {cycle}
                  </h2>
                </div>

                <div className="text-right sm:self-center">
                  <div className="flex items-baseline justify-end gap-1 text-slate-800">
                    <span
                      className={`text-3xl font-black tabular-nums leading-none ${semaphoreColor(cyclePct)}`}
                    >
                      {cyclePct.toFixed(1)}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    Aporte total: {totalContributes.toFixed(2)} de {macroWeight.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Progress bar del Ciclo */}
              <div className="relative mt-4 h-3 w-full overflow-hidden rounded-full border border-slate-200/50 bg-slate-100/80">
                <div
                  className={`${theme.bar} h-3 rounded-full transition-all duration-500 ease-out`}
                  style={{ width: `${cyclePct}%` }}
                />
              </div>
            </div>

            {/* Listado de Macroestándares y sus Estándares */}
            <div className="divide-y divide-slate-100">
              {macroKeys.map((macroName) => {
                const items = macros[macroName] || []
                const macroKey = `${cycle}|${macroName}`
                const expanded = isExpanded(macroKey)
                const macroMeta = MACRO_STANDARDS[macroName] ?? { weight: 0, desc: '' }

                // Cumplimiento del macroestándar
                const macroAllStandards = standards.filter(
                  (s) =>
                    s.cycle_phva === cycle && getMacroStandardName(s.standard_number) === macroName,
                )
                const macroRedistWeight = macroAllStandards.reduce(
                  (sum, s) => sum + s.redistributed_weight,
                  0,
                )
                const macroContributes = macroAllStandards.reduce(
                  (sum, s) => sum + s.contributes_to_score,
                  0,
                )
                const macroPct =
                  macroRedistWeight > 0 ? (macroContributes / macroRedistWeight) * 100 : 0

                return (
                  <div key={macroName} className="bg-white transition-all">
                    {/* Fila del Macroestándar */}
                    <button
                      type="button"
                      onClick={() => toggleMacro(macroKey)}
                      className="group flex w-full flex-col gap-4 p-5 text-left transition-all hover:bg-slate-50/50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex flex-1 items-start gap-3">
                        <div className="mt-1 shrink-0 rounded-lg bg-slate-100 p-2 text-slate-500 transition-colors group-hover:bg-slate-200 group-hover:text-slate-700">
                          {expanded ? (
                            <ChevronDown className="h-4 w-4 transition-transform" />
                          ) : (
                            <ChevronRight className="h-4 w-4 transition-transform" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-800">{macroName}</h3>
                            <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                              Peso macro: {macroMeta.weight}%
                            </span>
                          </div>
                          <p className="mt-0.5 line-clamp-2 max-w-2xl text-xs text-slate-500 md:line-clamp-none">
                            {macroMeta.desc}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-4 self-end sm:self-auto">
                        <div className="text-right">
                          <span
                            className={`text-lg font-extrabold tabular-nums leading-none ${semaphoreColor(macroPct)}`}
                          >
                            {macroPct.toFixed(1)}%
                          </span>
                          <div className="mt-0.5 text-[11px] font-medium text-slate-400">
                            {macroContributes.toFixed(2)} / {macroRedistWeight.toFixed(2)} pts
                          </div>
                        </div>

                        {/* Semáforo en Miniatura */}
                        <div
                          className={`h-3.5 w-3.5 shrink-0 rounded-full border border-white shadow-sm ${semaphoreBg(macroPct)}`}
                        />
                      </div>
                    </button>

                    {/* Progress Bar del Macroestándar */}
                    <div className="px-5 pb-1">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`${theme.bar} h-1.5 rounded-full transition-all duration-500 ease-out`}
                          style={{ width: `${macroPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Estándares Específicos (Nivel 3) */}
                    {expanded && (
                      <div className={`border-t border-slate-100 px-5 py-4 ${theme.lightBg}`}>
                        {items.length === 0 ? (
                          <p className="p-4 text-sm italic text-slate-500">
                            No hay estándares específicos para este macroestándar.
                          </p>
                        ) : (
                          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {items.map((s) => {
                              const itemPct =
                                s.redistributed_weight > 0
                                  ? (s.contributes_to_score / s.redistributed_weight) * 100
                                  : 0
                              const shortName =
                                STANDARD_NAMES[s.standard_number] || 'Estándar específico'
                              const style = STATUS_STYLE[s.status] || {
                                bg: 'bg-slate-50',
                                text: 'text-slate-500',
                                border: 'border-slate-100',
                                icon: MinusCircle,
                              }
                              const StatusIcon = style.icon

                              return (
                                <li key={s.standard_id} className="group relative">
                                  <Link
                                    href={`${drillBaseHref}/${s.standard_id}`}
                                    className="block h-full rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md"
                                  >
                                    {/* Cabecera Estándar */}
                                    <div className="flex items-start justify-between gap-3">
                                      <span className="border-b border-dashed border-slate-300 font-mono text-sm font-black text-slate-900 transition-all group-hover:border-sky-500 group-hover:text-sky-600">
                                        {s.standard_number}
                                      </span>

                                      <span
                                        className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${style.bg} ${style.text} ${style.border} shadow-sm`}
                                      >
                                        <StatusIcon className="h-3 w-3 shrink-0" />
                                        {STATUS_LABEL[s.status] || s.status}
                                      </span>
                                    </div>

                                    {/* Nombre Estándar */}
                                    <h4 className="mt-2 line-clamp-2 min-h-[2rem] text-xs font-semibold text-slate-700 transition-colors group-hover:text-slate-900">
                                      {shortName}
                                    </h4>

                                    {/* Progress Bar Estándar */}
                                    <div className="relative mt-3 h-2 w-full overflow-hidden rounded-full border border-slate-200/20 bg-slate-100">
                                      <div
                                        className={`${theme.bar} h-2 rounded-full transition-all duration-500 ease-out`}
                                        style={{ width: `${itemPct}%` }}
                                      />
                                    </div>

                                    {/* Detalle Puntos */}
                                    <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-slate-400">
                                      <span>
                                        {s.contributes_to_score.toFixed(2)} /{' '}
                                        {s.redistributed_weight.toFixed(2)} pts
                                      </span>
                                      <span className={`font-bold ${semaphoreColor(itemPct)}`}>
                                        {itemPct.toFixed(0)}%
                                      </span>
                                    </div>
                                  </Link>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
