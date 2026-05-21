'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { simpleMarkdownToHtml } from '@/lib/utils/simple-markdown'

interface MonthlyLog {
  id: string
  company_id: string
  month: string
  completed_summary: string
  pending_summary: string
  next_month_plan: string
  created_at: string
  updated_at: string
}

export default function MonthlyLogsList({
  initialLogs,
  companyId,
  isRegisStaff,
}: {
  initialLogs: MonthlyLog[]
  companyId: string
  isRegisStaff: boolean
}) {
  const supabase = createSupabaseBrowserClient()

  const [logs, setLogs] = useState<MonthlyLog[]>(initialLogs)
  const [expandedLogId, setExpandedLogId] = useState<string | null>(
    initialLogs.length > 0 ? initialLogs[0]!.id : null,
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const currentYear = new Date().getFullYear()
  const currentMonthNum = new Date().getMonth() + 1
  const [selectMonth, setSelectMonth] = useState(
    `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`,
  )

  const [editingLogId, setEditingLogId] = useState<string | null>(null)
  const [editCompleted, setEditCompleted] = useState('')
  const [editPending, setEditPending] = useState('')
  const [editNextPlan, setEditNextPlan] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleGenerateLog = async () => {
    setIsGenerating(true)
    setGenerationError(null)
    try {
      const response = await fetch('/api/monthly-logs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, month: selectMonth }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Error al generar la bitacora')
      }

      const updatedLog = data.log as MonthlyLog
      setLogs((prev) => {
        const filtered = prev.filter((l) => l.id !== updatedLog.id && l.month !== updatedLog.month)
        const newLogs = [updatedLog, ...filtered]
        return newLogs.sort((a, b) => b.month.localeCompare(a.month))
      })
      setExpandedLogId(updatedLog.id)
    } catch (err: unknown) {
      setGenerationError(err instanceof Error ? err.message : 'Error de red')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleStartEdit = (log: MonthlyLog) => {
    setEditingLogId(log.id)
    setEditCompleted(log.completed_summary)
    setEditPending(log.pending_summary)
    setEditNextPlan(log.next_month_plan)
    setSaveError(null)
  }

  const handleSaveEdit = async (logId: string) => {
    setIsSaving(true)
    setSaveError(null)
    try {
      const { data, error } = await supabase
        .from('monthly_logs')
        .update({
          completed_summary: editCompleted,
          pending_summary: editPending,
          next_month_plan: editNextPlan,
          updated_at: new Date().toISOString(),
        })
        .eq('id', logId)
        .select()
        .single()

      if (error) throw error

      setLogs((prev) => prev.map((l) => (l.id === logId ? (data as MonthlyLog) : l)))
      setEditingLogId(null)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar los cambios')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownloadPdf = async (log: MonthlyLog) => {
    setDownloadingId(log.id)
    try {
      const response = await fetch(`/api/monthly-logs/${log.id}/pdf`)
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Error descargando PDF' }))
        throw new Error(errData.error || 'Error descargando PDF')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bitacora-sgsst-${log.month}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al descargar el PDF')
    } finally {
      setDownloadingId(null)
    }
  }

  const handlePrint = (log: MonthlyLog) => {
    const printContent = `
      <html>
        <head>
          <title>Bitacora de Cumplimiento SST - ${log.month}</title>
          <style>
            body { font-family: -apple-system, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            h1 { font-size: 24px; border-bottom: 2px solid #0284c7; padding-bottom: 8px; color: #0f172a; margin-bottom: 4px; }
            h2 { font-size: 16px; font-weight: normal; color: #64748b; margin-top: 0; margin-bottom: 30px; }
            h3 { font-size: 18px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 24px; }
            .section { margin-bottom: 30px; }
            .badge { display: inline-block; padding: 4px 8px; font-size: 12px; font-weight: bold; border-radius: 4px; text-transform: uppercase; }
            .completed { background: #dcfce7; color: #15803d; }
            .pending { background: #fee2e2; color: #b91c1c; }
            .next { background: #e0f2fe; color: #0369a1; }
            ul { padding-left: 20px; }
            li { margin-bottom: 6px; }
            hr { border: 0; border-top: 1px solid #e2e8f0; margin: 40px 0; }
            .footer { font-size: 12px; text-align: center; color: #94a3b8; margin-top: 50px; }
          </style>
        </head>
        <body>
          <h1>Bitacora Mensual SG-SST</h1>
          <h2>Periodo: ${log.month} | Plataforma Regis</h2>

          <div class="section">
            <span class="badge completed">Completado / Logros del Periodo</span>
            <div>${simpleMarkdownToHtml(log.completed_summary)}</div>
          </div>

          <div class="section">
            <span class="badge pending">Pendientes / Alertas Activas</span>
            <div>${simpleMarkdownToHtml(log.pending_summary)}</div>
          </div>

          <div class="section">
            <span class="badge next">Plan de Accion / Siguiente Periodo</span>
            <div>${simpleMarkdownToHtml(log.next_month_plan)}</div>
          </div>

          <hr />
          <div class="footer">
            Reporte oficial del Sistema de Gestion de Seguridad y Salud en el Trabajo. Generado el ${new Date().toLocaleDateString()}.
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
    }
  }

  const formatFriendlyMonth = (m: string) => {
    const [year, monthNum] = m.split('-')
    const months = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ]
    const idx = parseInt(monthNum || '1', 10) - 1
    return `${months[idx] ?? 'Mes'} ${year}`
  }

  return (
    <div className="space-y-6">
      {/* Generation Controls */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Generar Bitacora Mensual</h2>
            <p className="mt-1 text-sm text-slate-500">
              Generar el resumen del mes basado en los avances registrados en la plataforma.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectMonth}
              onChange={(e) => setSelectMonth(e.target.value)}
              disabled={isGenerating}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-50"
            >
              {Array.from({ length: 4 }).map((_, i) => {
                const d = new Date()
                d.setMonth(d.getMonth() - i)
                const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                return (
                  <option key={val} value={val}>
                    {formatFriendlyMonth(val)}
                  </option>
                )
              })}
            </select>

            <button
              onClick={handleGenerateLog}
              disabled={isGenerating}
              className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <svg
                    className="-ml-1 mr-2 h-4 w-4 animate-spin text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Generando...
                </>
              ) : (
                'Generar por IA'
              )}
            </button>
          </div>
        </div>

        {generationError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {generationError}
          </div>
        )}
      </div>

      {/* Logs List */}
      <div className="space-y-4">
        {logs.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              No hay bitacoras generadas
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Las bitacoras mensuales se generan automaticamente al finalizar cada mes o puede
              generarlas manualmente con el boton anterior.
            </p>
          </div>
        ) : (
          logs.map((log) => {
            const isExpanded = expandedLogId === log.id
            const isEditing = editingLogId === log.id
            const isDownloading = downloadingId === log.id

            return (
              <div
                key={log.id}
                className={`rounded-xl border bg-white transition-all duration-200 ${
                  isExpanded
                    ? 'border-slate-300 shadow-md'
                    : 'border-slate-200 shadow-sm hover:border-slate-300'
                }`}
              >
                {/* Card Header */}
                <div
                  onClick={() => !isEditing && setExpandedLogId(isExpanded ? null : log.id)}
                  className={`flex items-center justify-between p-5 ${
                    isEditing ? 'cursor-default' : 'cursor-pointer select-none'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                      <svg
                        className="h-5 w-5 text-slate-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        {formatFriendlyMonth(log.month)}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Actualizado: {new Date(log.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {/* Download PDF */}
                    <button
                      onClick={() => handleDownloadPdf(log)}
                      disabled={isDownloading}
                      className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                      title="Descargar PDF"
                    >
                      {isDownloading ? (
                        <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      )}
                    </button>

                    {/* Print */}
                    <button
                      onClick={() => handlePrint(log)}
                      className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      title="Imprimir"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                        />
                      </svg>
                    </button>

                    {/* Edit (Regis staff only) */}
                    {isRegisStaff && !isEditing && (
                      <button
                        onClick={() => handleStartEdit(log)}
                        className="rounded-lg p-1.5 text-sky-600 transition hover:bg-sky-50 hover:text-sky-800"
                        title="Editar Bitacora"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </button>
                    )}

                    {/* Expand/Collapse */}
                    {!isEditing && (
                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600"
                      >
                        <svg
                          className={`h-5 w-5 transform transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : 'rotate-0'
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Card Details */}
                {isExpanded && (
                  <div className="space-y-6 border-t border-slate-100 p-6">
                    {saveError && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {saveError}
                      </div>
                    )}

                    {isEditing ? (
                      <div className="space-y-5">
                        <div>
                          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-green-700">
                            Logros y Completados (Markdown)
                          </label>
                          <textarea
                            value={editCompleted}
                            onChange={(e) => setEditCompleted(e.target.value)}
                            rows={6}
                            className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-red-700">
                            Pendientes y Alertas (Markdown)
                          </label>
                          <textarea
                            value={editPending}
                            onChange={(e) => setEditPending(e.target.value)}
                            rows={6}
                            className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-sky-700">
                            Plan de Trabajo Siguiente Mes (Markdown)
                          </label>
                          <textarea
                            value={editNextPlan}
                            onChange={(e) => setEditNextPlan(e.target.value)}
                            rows={6}
                            className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                          <button
                            onClick={() => setEditingLogId(null)}
                            disabled={isSaving}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleSaveEdit(log.id)}
                            disabled={isSaving}
                            className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-sky-500 disabled:opacity-50"
                          >
                            {isSaving && (
                              <svg
                                className="h-4 w-4 animate-spin text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                            )}
                            Guardar Cambios
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {/* Completed */}
                        <div className="space-y-4 rounded-xl border border-green-100 bg-green-50/30 p-5">
                          <div className="flex items-center gap-2 border-b border-green-100 pb-2">
                            <span className="text-green-600">
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2.5"
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            </span>
                            <h4 className="text-sm font-bold uppercase tracking-wider text-green-800">
                              Logros del Periodo
                            </h4>
                          </div>
                          <div
                            className="prose prose-slate max-w-none text-sm text-slate-700"
                            dangerouslySetInnerHTML={{
                              __html: simpleMarkdownToHtml(log.completed_summary),
                            }}
                          />
                        </div>

                        {/* Pending */}
                        <div className="space-y-4 rounded-xl border border-red-100 bg-red-50/20 p-5">
                          <div className="flex items-center gap-2 border-b border-red-100 pb-2">
                            <span className="text-red-500">
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2.5"
                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                              </svg>
                            </span>
                            <h4 className="text-sm font-bold uppercase tracking-wider text-red-800">
                              Pendientes y Alertas
                            </h4>
                          </div>
                          <div
                            className="prose prose-slate max-w-none text-sm text-slate-700"
                            dangerouslySetInnerHTML={{
                              __html: simpleMarkdownToHtml(log.pending_summary),
                            }}
                          />
                        </div>

                        {/* Next Month */}
                        <div className="space-y-4 rounded-xl border border-sky-100 bg-sky-50/20 p-5">
                          <div className="flex items-center gap-2 border-b border-sky-100 pb-2">
                            <span className="text-sky-600">
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2.5"
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </span>
                            <h4 className="text-sm font-bold uppercase tracking-wider text-sky-800">
                              Plan Siguiente Periodo
                            </h4>
                          </div>
                          <div
                            className="prose prose-slate max-w-none text-sm text-slate-700"
                            dangerouslySetInnerHTML={{
                              __html: simpleMarkdownToHtml(log.next_month_plan),
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
