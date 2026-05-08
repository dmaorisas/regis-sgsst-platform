'use client'

import { useState } from 'react'

export default function ActaGeneratorForm({
  companyId,
  defaultAttendees = '',
}: {
  companyId: string
  defaultAttendees?: string
}) {
  const [tipoComite, setTipoComite] = useState('COPASST')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [asistentes, setAsistentes] = useState(defaultAttendees)
  const [notasBreves, setNotasBreves] = useState('')

  const [acta, setActa] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setActa(null)
    setCopied(false)

    try {
      const response = await fetch('/api/actas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, tipoComite, fecha, asistentes, notasBreves }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error generando el acta')
      }

      setActa(data.acta)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error interno')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = () => {
    if (acta) {
      navigator.clipboard.writeText(acta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      {/* Formulario */}
      <div className="h-fit rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Detalles de la Reunión</h2>
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tipo de Comité</label>
            <select
              value={tipoComite}
              onChange={(e) => setTipoComite(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            >
              <option value="COPASST">COPASST</option>
              <option value="Convivencia">Comité de Convivencia Laboral</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Fecha de Reunión</label>
            <input
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Asistentes (Nombres separados por coma)
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Carlos Mejía, Ana López, Juan Pérez"
              value={asistentes}
              onChange={(e) => setAsistentes(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Notas Rápidas (Lo que se habló)
            </label>
            <textarea
              required
              rows={5}
              placeholder="Ej: Nos reunimos para hablar de los accidentes. Carlos dice que falta señalización en bodega. Acordamos comprar 3 señales para el viernes."
              value={notasBreves}
              onChange={(e) => setNotasBreves(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full justify-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? 'Redactando acta con IA...' : 'Generar Acta Profesional'}
          </button>

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </form>
      </div>

      {/* Resultado */}
      <div className="flex h-full min-h-[500px] flex-col rounded-lg border bg-gray-50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Resultado Generado</h2>
          {acta && (
            <button
              onClick={handleCopy}
              className={`rounded-md px-3 py-1 text-sm font-medium ${copied ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              {copied ? '¡Copiado!' : '📋 Copiar al portapapeles'}
            </button>
          )}
        </div>

        {acta ? (
          <div className="flex-1 overflow-y-auto whitespace-pre-wrap rounded-md border bg-white p-4 font-mono text-sm">
            {acta}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm italic text-gray-400">
            El acta generada aparecerá aquí...
          </div>
        )}
      </div>
    </div>
  )
}
