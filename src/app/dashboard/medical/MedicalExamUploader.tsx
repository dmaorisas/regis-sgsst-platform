'use client'

import { useState, useEffect, useRef } from 'react'

interface ExamFields {
  fecha: string | null
  nombre_trabajador: string | null
  cedula: string | null
  eps: string | null
  cargo: string | null
  edad: number | null
  peso: string | null
  fecha_nacimiento: string | null
  dependencia: string | null
  en_tratamiento_medico: string | null
  sede: string | null
  tipo_vinculacion_laboral: string | null
  nombre_jefe_inmediato: string | null
  diagnostico: string | null
  tipo_tratamiento: string | null
  funciones_cargo: string | null
  recomendaciones_medico_laborales: string | null
  observaciones: string | null
  compromiso_funcionario: string | null
  compromiso_entidad: string | null
}

interface Recommendation {
  text: string
  type: string
  duration_days: number | null
}

export default function MedicalExamUploader({ companyId }: { companyId: string }) {
  const [file, setFile] = useState<File | null>(null)

  // Async Search State
  const [searchTerm, setSearchTerm] = useState('')
  const [workers, setWorkers] = useState<
    { id: string; nombres: string; apellidos: string; cedula: string }[]
  >([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState<{
    id: string
    nombres: string
    apellidos: string
    cedula: string
  } | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)

  const [examType, setExamType] = useState('ingreso')
  const [isUploading, setIsUploading] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [results, setResults] = useState<Recommendation[] | null>(null)
  const [extractedFields, setExtractedFields] = useState<ExamFields | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const fetchWorkers = async () => {
      if (searchTerm.length < 2 && !showDropdown) return
      setIsSearching(true)
      try {
        const res = await fetch(
          `/api/workers/search?companyId=${companyId}&q=${encodeURIComponent(searchTerm)}`,
        )
        const data = await res.json()
        if (res.ok) setWorkers(data.workers || [])
      } catch (err) {
        console.error('Error fetching workers', err)
      } finally {
        setIsSearching(false)
      }
    }

    const debounceTimer = setTimeout(fetchWorkers, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchTerm, companyId, showDropdown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !selectedWorker) {
      setError('Por favor selecciona un trabajador y un archivo PDF.')
      return
    }

    setIsUploading(true)
    setError(null)
    setResults(null)
    setExtractedFields(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('worker_id', selectedWorker.id)
      formData.append('company_id', companyId)
      formData.append('type', examType)

      const response = await fetch('/api/medical-exams/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar el examen')
      }

      setResults(data.extracted)
      setExtractedFields(data.fields || null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error interno')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownloadReport = async () => {
    if (!extractedFields || !results) return

    setIsGeneratingPdf(true)
    try {
      const response = await fetch('/api/medical-exams/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: extractedFields,
          recommendations: results,
        }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Error generando reporte')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const workerName = (extractedFields.nombre_trabajador || 'trabajador').replace(/\s+/g, '_')
      a.href = url
      a.download = `GTH-F-56_${workerName}_${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error generando reporte PDF')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const FIELD_LABELS: [keyof ExamFields, string][] = [
    ['fecha', 'Fecha del examen'],
    ['nombre_trabajador', 'Nombre del trabajador'],
    ['cedula', 'Cedula'],
    ['eps', 'EPS'],
    ['cargo', 'Cargo'],
    ['edad', 'Edad'],
    ['peso', 'Peso'],
    ['fecha_nacimiento', 'Fecha de nacimiento'],
    ['dependencia', 'Dependencia'],
    ['en_tratamiento_medico', 'En tratamiento medico'],
    ['sede', 'Sede'],
    ['tipo_vinculacion_laboral', 'Tipo de vinculacion laboral'],
    ['nombre_jefe_inmediato', 'Nombre del jefe inmediato'],
  ]

  const TEXT_BLOCK_LABELS: [keyof ExamFields, string][] = [
    ['diagnostico', 'Diagnostico'],
    ['tipo_tratamiento', 'Tipo de tratamiento'],
    ['funciones_cargo', 'Funciones del cargo'],
    ['recomendaciones_medico_laborales', 'Recomendaciones medico laborales'],
    ['observaciones', 'Observaciones'],
    ['compromiso_funcionario', 'Compromiso de funcionario'],
    ['compromiso_entidad', 'Compromiso de la entidad'],
  ]

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="relative" ref={dropdownRef}>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#64748b]">
              Trabajador
            </label>
            {selectedWorker ? (
              <div className="flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3">
                <div className="text-sm font-medium text-emerald-900">
                  {selectedWorker.nombres} {selectedWorker.apellidos}{' '}
                  <span className="text-emerald-700 opacity-70">({selectedWorker.cedula})</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedWorker(null)
                    setSearchTerm('')
                  }}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  placeholder="Buscar por cedula o nombre..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setShowDropdown(true)
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="block w-full rounded-lg border border-slate-300 bg-[#fbf8fa] px-4 py-3 text-sm transition-colors focus:border-[#1e293b] focus:ring-[#1e293b]"
                  required
                />
                {showDropdown && (
                  <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                    {isSearching ? (
                      <div className="p-4 text-center text-sm text-slate-500">Buscando...</div>
                    ) : workers.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-500">
                        No se encontraron trabajadores.
                      </div>
                    ) : (
                      <ul className="py-1">
                        {workers.map((w) => (
                          <li
                            key={w.id}
                            onClick={() => {
                              setSelectedWorker(w)
                              setShowDropdown(false)
                            }}
                            className="cursor-pointer border-b border-slate-100 px-4 py-2 text-sm text-slate-700 last:border-0 hover:bg-slate-50"
                          >
                            <div className="font-medium">
                              {w.nombres} {w.apellidos}
                            </div>
                            <div className="text-xs text-slate-500">CC: {w.cedula}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#64748b]">
              Tipo de Examen
            </label>
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 bg-[#fbf8fa] px-4 py-3 text-sm transition-colors focus:border-[#1e293b] focus:ring-[#1e293b]"
            >
              <option value="ingreso">Ingreso</option>
              <option value="periodico">Periodico</option>
              <option value="egreso">Egreso</option>
              <option value="post_incapacidad">Post Incapacidad</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#64748b]">
            Archivo PDF del Examen
          </label>
          <div className="group relative mt-1 flex justify-center rounded-lg border-2 border-dashed border-slate-300 bg-[#fbf8fa] px-6 py-10 transition-colors hover:bg-slate-50">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-slate-400 transition-colors group-hover:text-[#1e293b]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <div className="mt-4 flex justify-center text-sm leading-6 text-slate-600">
                <label className="relative cursor-pointer rounded-md bg-transparent font-semibold text-[#1e293b] focus-within:outline-none hover:text-sky-600">
                  <span>Sube un archivo PDF</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="sr-only"
                    required
                  />
                </label>
                <p className="pl-1">o arrastra y suelta</p>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {file ? (
                  <span className="font-semibold text-emerald-600">{file.name}</span>
                ) : (
                  'PDF hasta 10MB'
                )}
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isUploading || !file || !selectedWorker}
          className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#1e293b] px-6 py-4 font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Procesando y extrayendo con IA...
            </>
          ) : (
            'Analizar Examen y Extraer Recomendaciones'
          )}
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            ></path>
          </svg>
          {error}
        </div>
      )}

      {/* ── Extracted Fields ── */}
      {extractedFields && (
        <div className="mt-8 border-t border-slate-200 pt-8">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#1e293b]">Campos Extraidos del Examen</h3>
            <button
              type="button"
              onClick={handleDownloadReport}
              disabled={isGeneratingPdf}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generando PDF...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Descargar Reporte GTH-F-56
                </>
              )}
            </button>
          </div>

          {/* Data fields grid */}
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <tbody className="divide-y divide-slate-100">
                {FIELD_LABELS.map(([key, label]) => {
                  const value = extractedFields[key]
                  return (
                    <tr key={key}>
                      <td className="whitespace-nowrap bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
                        {label}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-[#1e293b]">
                        {value != null ? (
                          String(value)
                        ) : (
                          <span className="text-slate-400">No identificado</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Text blocks */}
          <div className="mt-6 space-y-4">
            {TEXT_BLOCK_LABELS.map(([key, label]) => {
              const value = extractedFields[key]
              return (
                <div key={key} className="overflow-hidden rounded-lg border border-slate-200">
                  <div className="bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
                    {label}
                  </div>
                  <div className="px-4 py-3 text-sm leading-relaxed text-[#1e293b]">
                    {value ? (
                      String(value)
                    ) : (
                      <span className="text-slate-400">No identificado en el examen</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Recommendations List ── */}
      {results && (
        <div className="border-t border-slate-200 pt-8">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#1e293b]">
            Recomendaciones y Restricciones
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
              {results.length}
            </span>
          </h3>

          {results.length === 0 ? (
            <div className="rounded-lg border border-[#10b981]/20 bg-[#d1fae5] p-6 text-center">
              <svg
                className="mx-auto mb-2 h-12 w-12 text-emerald-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <p className="font-medium text-[#065f46]">
                El trabajador esta APTO sin restricciones medicas operativas.
              </p>
            </div>
          ) : (
            <ul className="grid gap-4">
              {results.map((rec, idx) => (
                <li
                  key={idx}
                  className={`flex flex-col gap-3 rounded-lg border p-5 transition-colors ${
                    rec.type === 'restriccion'
                      ? 'border-[#f59e0b]/30 bg-[#fef3c7]'
                      : rec.type === 'reubicacion'
                        ? 'border-[#ef4444]/30 bg-[#fee2e2]'
                        : 'border-sky-200 bg-sky-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        rec.type === 'restriccion'
                          ? 'bg-[#f59e0b] text-white'
                          : rec.type === 'reubicacion'
                            ? 'bg-[#ef4444] text-white'
                            : 'bg-sky-600 text-white'
                      }`}
                    >
                      {rec.type}
                    </span>
                    {rec.duration_days && (
                      <span className="flex items-center gap-1 text-xs font-medium text-slate-600">
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          ></path>
                        </svg>
                        {rec.duration_days} dias
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium leading-relaxed text-[#1e293b]">{rec.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
