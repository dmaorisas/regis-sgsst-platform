'use client'

import { useState } from 'react'

interface MatrixRow {
  proceso?: string
  zona?: string
  actividad?: string
  peligro_clasificacion?: string
  peligro_descripcion?: string
  efectos_posibles?: string
  nivel_riesgo_inicial?: string
  medida_intervencion_sugerida?: string
}

export default function MatrixViewer({ companyId }: { companyId: string }) {
  const [matrix, setMatrix] = useState<MatrixRow[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setIsLoading(true)
    setError(null)
    setMatrix(null)

    try {
      const response = await fetch('/api/matrices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
        cache: 'no-store',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error generando la matriz')
      }

      setMatrix(data.matrix)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error interno')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadCSV = () => {
    if (!matrix) return

    const headers = [
      'Proceso',
      'Zona/Lugar',
      'Actividad',
      'Clasificación Peligro',
      'Descripción Peligro',
      'Efectos Posibles',
      'Nivel Riesgo',
      'Medida de Intervención',
    ]
    const csvContent = [
      headers.join(','),
      ...matrix.map((row) =>
        [
          `"${row.proceso || ''}"`,
          `"${row.zona || ''}"`,
          `"${row.actividad || ''}"`,
          `"${row.peligro_clasificacion || ''}"`,
          `"${row.peligro_descripcion || ''}"`,
          `"${row.efectos_posibles || ''}"`,
          `"${row.nivel_riesgo_inicial || ''}"`,
          `"${row.medida_intervencion_sugerida || ''}"`,
        ].join(','),
      ),
    ].join('\\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'matriz_peligros_gtc45.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {!matrix ? (
        <div className="px-4 py-16 text-center">
          <div className="mx-auto max-w-md">
            <svg
              className="mx-auto mb-4 h-12 w-12 text-[#64748b]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mb-2 text-lg font-medium text-[#1e293b]">No hay matriz generada</h3>
            <p className="mb-6 text-sm text-[#64748b]">
              Haz clic en el botón de abajo para que la inteligencia artificial analice tu CIIU y
              redacte la matriz GTC-45.
            </p>
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#1e293b] px-6 py-3 font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Analizando industria y generando matriz...
                </>
              ) : (
                'PROCESAR MATRIZ GTC-45 (v2.2)'
              )}
            </button>
            {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in space-y-6 duration-500">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-bold text-[#1e293b]">
              Borrador de Matriz
              <span className="rounded-full bg-[#e4e2e3] px-2.5 py-0.5 text-xs font-semibold text-[#45474c]">
                {matrix.length} filas
              </span>
            </h2>
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-2 rounded-lg bg-[#10b981] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-600"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                ></path>
              </svg>
              Descargar a Excel (CSV)
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#e4e2e3] shadow-sm">
            <table className="min-w-full divide-y divide-[#e4e2e3]">
              <thead className="bg-[#f5f3f4]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#64748b]">
                    Peligro
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#64748b]">
                    Actividad / Zona
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#64748b]">
                    Efectos Posibles
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#64748b]">
                    Nivel Riesgo
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#64748b]">
                    Medida Sugerida
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e2e3] bg-white">
                {matrix.map((row, i) => (
                  <tr key={i} className="transition-colors hover:bg-[#fbf8fa]">
                    <td className="px-6 py-4">
                      <span className="block text-sm font-semibold text-[#1e293b]">
                        {row.peligro_clasificacion}
                      </span>
                      <span className="text-sm text-[#64748b]">{row.peligro_descripcion}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#45474c]">
                      <span className="block font-medium">{row.actividad}</span>
                      <span className="text-[#64748b]">{row.zona}</span>
                    </td>
                    <td
                      className="max-w-xs truncate px-6 py-4 text-sm text-[#45474c]"
                      title={row.efectos_posibles}
                    >
                      {row.efectos_posibles}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                          row.nivel_riesgo_inicial?.toLowerCase().includes('alto')
                            ? 'bg-[#fee2e2] text-[#ef4444]'
                            : row.nivel_riesgo_inicial?.toLowerCase().includes('medio')
                              ? 'bg-[#fef3c7] text-[#f59e0b]'
                              : 'bg-[#d1fae5] text-[#10b981]'
                        }`}
                      >
                        {row.nivel_riesgo_inicial}
                      </span>
                    </td>
                    <td className="max-w-xs px-6 py-4 text-sm text-[#45474c]">
                      {row.medida_intervencion_sugerida}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={handleGenerate}
              className="flex items-center gap-1 text-sm font-medium text-[#64748b] transition-colors hover:text-[#1e293b]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                ></path>
              </svg>
              Volver a generar con IA
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
