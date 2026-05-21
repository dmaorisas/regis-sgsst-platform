'use client'

import { useState } from 'react'

interface AutomationConfig {
  id: string
  title: string
  description: string
  url: string
  borderColor: string
  btnClass: string
  dotColor: string
}

const AUTOMATIONS: AutomationConfig[] = [
  {
    id: 'solicitud',
    title: 'Solicitud Mensual PILA',
    description:
      'Consulta todas las empresas activas en Supabase y envia la solicitud de PILA del periodo actual via Outlook Graph API. Cada email se envia con 3 s de intervalo para evitar rate limits de Microsoft.',
    url: 'https://N8N.dmaori.com/webhook/pila-solicitud',
    borderColor: 'border-sky-500',
    btnClass: 'bg-sky-600 hover:bg-sky-700 focus-visible:ring-sky-500',
    dotColor: 'bg-sky-500',
  },
  {
    id: 'recordatorios',
    title: 'Recordatorios Diarios',
    description:
      'Rama A: recordatorios para PILAs pendientes con +5 dias sin respuesta, incluyendo escalacion automatica tras 2 intentos. Rama B: alertas de examenes medicos que vencen en los proximos 30 dias.',
    url: 'https://N8N.dmaori.com/webhook/pila-recordatorios',
    borderColor: 'border-amber-500',
    btnClass: 'bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500',
    dotColor: 'bg-amber-500',
  },
  {
    id: 'watcher',
    title: 'Watcher Outlook',
    description:
      'Revisa el inbox de Outlook por emails no leidos con adjuntos, identifica la empresa remitente via Supabase, sube el archivo a Storage, crea el registro PILA y marca el email como leido.',
    url: 'https://N8N.dmaori.com/webhook/pila-watcher',
    borderColor: 'border-emerald-500',
    btnClass: 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500',
    dotColor: 'bg-emerald-500',
  },
  {
    id: 'equipos-vencimiento',
    title: 'Vencimiento Equipos Emergencia',
    description:
      'Consulta extintores, botiquines, camillas y otros equipos cuya fecha de vencimiento o vida util esta dentro de los proximos 10 dias. Agrupa por empresa y envia alerta al consultor responsable via Outlook.',
    url: 'https://N8N.dmaori.com/webhook/equipos-vencimiento',
    borderColor: 'border-rose-500',
    btnClass: 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500',
    dotColor: 'bg-rose-500',
  },
  {
    id: 'bitacora-mensual',
    title: 'Bitacora Mensual Automatica',
    description:
      'Consulta las bitacoras generadas del mes actual para cada empresa, formatea un resumen HTML con logros del periodo, novedades y alertas pendientes, y plan para el siguiente mes. Envia el reporte al consultor responsable via Outlook.',
    url: 'https://N8N.dmaori.com/webhook/bitacora-mensual',
    borderColor: 'border-violet-500',
    btnClass: 'bg-violet-600 hover:bg-violet-700 focus-visible:ring-violet-500',
    dotColor: 'bg-violet-500',
  },
  {
    id: 'actas-firma',
    title: 'Recordatorio Firma Actas',
    description:
      'Revisa cada 48h las actas COPASST y Convivencia con estado pendiente o en revision. Agrupa por empresa, calcula dias de antiguedad, clasifica prioridad (reciente, pendiente, urgente) y envia recordatorio de firma al consultor responsable via Outlook.',
    url: 'https://N8N.dmaori.com/webhook/actas-firma-recordatorio',
    borderColor: 'border-fuchsia-500',
    btnClass: 'bg-fuchsia-600 hover:bg-fuchsia-700 focus-visible:ring-fuchsia-500',
    dotColor: 'bg-fuchsia-500',
  },
  {
    id: 'resumen-semanal',
    title: 'Resumen Semanal por Consultor',
    description:
      'Lunes: envia planeacion semanal con todos los documentos pendientes segmentados por empresa. Viernes: envia balance contrastando lo completado en la semana vs lo que sigue abierto. Incluye dashboard con contadores de pendientes, completados y empresas activas.',
    url: 'https://N8N.dmaori.com/webhook/resumen-semanal',
    borderColor: 'border-indigo-500',
    btnClass: 'bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-500',
    dotColor: 'bg-indigo-500',
  },
]

interface RunState {
  loading: boolean
  result?: string
  error?: string
  duration?: number
}

export default function DemoButtons() {
  const [states, setStates] = useState<Record<string, RunState>>({})

  const execute = async (auto: AutomationConfig) => {
    setStates((prev) => ({ ...prev, [auto.id]: { loading: true } }))
    const start = Date.now()
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 120_000)
      const res = await fetch(auto.url, { signal: controller.signal })
      clearTimeout(timeout)
      const text = await res.text()
      let display: string
      try {
        display = JSON.stringify(JSON.parse(text), null, 2)
      } catch {
        display = text
      }
      setStates((prev) => ({
        ...prev,
        [auto.id]: { loading: false, result: display, duration: elapsed(start) },
      }))
    } catch (err) {
      setStates((prev) => ({
        ...prev,
        [auto.id]: {
          loading: false,
          error: err instanceof Error ? err.message : 'Error desconocido',
          duration: elapsed(start),
        },
      }))
    }
  }

  return (
    <div className="grid gap-6">
      {AUTOMATIONS.map((auto) => {
        const state: RunState = states[auto.id] ?? { loading: false }
        return (
          <div
            key={auto.id}
            className={`rounded-xl border border-l-4 border-slate-100 ${auto.borderColor} bg-white p-6 shadow-sm`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${auto.dotColor}`} />
                  <h2 className="text-lg font-semibold text-slate-900">{auto.title}</h2>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{auto.description}</p>
                <p className="mt-2 font-mono text-xs text-slate-400">{auto.url}</p>
              </div>
              <button
                onClick={() => execute(auto)}
                disabled={state.loading}
                className={`shrink-0 rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 ${auto.btnClass}`}
              >
                {state.loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Ejecutando...
                  </span>
                ) : (
                  'Ejecutar'
                )}
              </button>
            </div>

            {state.result != null && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-emerald-700">
                  Completado en {state.duration} s
                </p>
                <pre className="max-h-48 overflow-auto rounded-lg border border-slate-100 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">
                  {state.result}
                </pre>
              </div>
            )}

            {state.error != null && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-rose-700">
                  Error tras {state.duration} s
                </p>
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {state.error}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function elapsed(start: number): number {
  return Math.round((Date.now() - start) / 100) / 10
}
