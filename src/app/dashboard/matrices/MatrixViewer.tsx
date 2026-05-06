'use client'

import { useState } from 'react'

export default function MatrixViewer({ companyId }: { companyId: string }) {
  const [matrix, setMatrix] = useState<any[] | null>(null)
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
        body: JSON.stringify({ companyId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error generando la matriz')
      }

      setMatrix(data.matrix)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadCSV = () => {
    if (!matrix) return

    const headers = ['Proceso', 'Zona/Lugar', 'Actividad', 'Clasificación Peligro', 'Descripción Peligro', 'Efectos Posibles', 'Nivel Riesgo', 'Medida de Intervención']
    const csvContent = [
      headers.join(','),
      ...matrix.map(row => [
        `"${row.proceso || ''}"`,
        `"${row.zona || ''}"`,
        `"${row.actividad || ''}"`,
        `"${row.peligro_clasificacion || ''}"`,
        `"${row.peligro_descripcion || ''}"`,
        `"${row.efectos_posibles || ''}"`,
        `"${row.nivel_riesgo_inicial || ''}"`,
        `"${row.medida_intervencion_sugerida || ''}"`
      ].join(','))
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
        <div className="text-center py-16 px-4">
          <div className="max-w-md mx-auto">
            <svg className="mx-auto h-12 w-12 text-[#64748b] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-[#1e293b] mb-2">No hay matriz generada</h3>
            <p className="text-sm text-[#64748b] mb-6">Haz clic en el botón de abajo para que la inteligencia artificial analice tu CIIU y redacte la matriz GTC-45.</p>
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full bg-[#1e293b] text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-3 transition-colors shadow-sm"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  Analizando industria y generando matriz...
                </>
              ) : (
                '🚀 Generar Matriz Base (IA)'
              )}
            </button>
            {error && <p className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-[#1e293b] flex items-center gap-2">
              Borrador de Matriz
              <span className="bg-[#e4e2e3] text-[#45474c] text-xs font-semibold px-2.5 py-0.5 rounded-full">{matrix.length} filas</span>
            </h2>
            <button
              onClick={handleDownloadCSV}
              className="bg-[#10b981] text-white px-4 py-2 rounded-lg hover:bg-emerald-600 font-medium text-sm flex items-center gap-2 shadow-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              Descargar a Excel (CSV)
            </button>
          </div>

          <div className="overflow-x-auto border border-[#e4e2e3] rounded-xl shadow-sm">
            <table className="min-w-full divide-y divide-[#e4e2e3]">
              <thead className="bg-[#f5f3f4]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-[#64748b] uppercase tracking-wider">Peligro</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-[#64748b] uppercase tracking-wider">Actividad / Zona</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-[#64748b] uppercase tracking-wider">Efectos Posibles</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-[#64748b] uppercase tracking-wider">Nivel Riesgo</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-[#64748b] uppercase tracking-wider">Medida Sugerida</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#e4e2e3]">
                {matrix.map((row, i) => (
                  <tr key={i} className="hover:bg-[#fbf8fa] transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-semibold block text-sm text-[#1e293b]">{row.peligro_clasificacion}</span>
                      <span className="text-sm text-[#64748b]">{row.peligro_descripcion}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#45474c]">
                      <span className="block font-medium">{row.actividad}</span>
                      <span className="text-[#64748b]">{row.zona}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#45474c] max-w-xs truncate" title={row.efectos_posibles}>{row.efectos_posibles}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 inline-flex text-xs font-bold uppercase tracking-wider rounded-full ${
                        row.nivel_riesgo_inicial?.toLowerCase().includes('alto') ? 'bg-[#fee2e2] text-[#ef4444]' :
                        row.nivel_riesgo_inicial?.toLowerCase().includes('medio') ? 'bg-[#fef3c7] text-[#f59e0b]' :
                        'bg-[#d1fae5] text-[#10b981]'
                      }`}>
                        {row.nivel_riesgo_inicial}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#45474c] max-w-xs">{row.medida_intervencion_sugerida}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-center mt-6">
            <button
              onClick={handleGenerate}
              className="text-[#64748b] hover:text-[#1e293b] text-sm font-medium transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              Volver a generar con IA
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
