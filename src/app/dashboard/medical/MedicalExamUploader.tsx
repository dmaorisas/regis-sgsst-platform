'use client'

import { useState, useEffect, useRef } from 'react'

export default function MedicalExamUploader({ companyId }: { companyId: string }) {
  const [file, setFile] = useState<File | null>(null)
  
  // Async Search State
  const [searchTerm, setSearchTerm] = useState('')
  const [workers, setWorkers] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState<any>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [examType, setExamType] = useState('ingreso')
  const [isUploading, setIsUploading] = useState(false)
  const [results, setResults] = useState<any[] | null>(null)
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
        const res = await fetch(`/api/workers/search?companyId=${companyId}&q=${encodeURIComponent(searchTerm)}`)
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

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('worker_id', selectedWorker.id)
      formData.append('company_id', companyId)
      formData.append('type', examType)

      const response = await fetch('/api/medical-exams/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar el examen')
      }

      setResults(data.extracted)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-2">Trabajador</label>
            {selectedWorker ? (
              <div className="flex items-center justify-between border border-emerald-300 bg-emerald-50 px-4 py-3 rounded-lg">
                <div className="text-sm text-emerald-900 font-medium">
                  {selectedWorker.nombres} {selectedWorker.apellidos} <span className="text-emerald-700 opacity-70">({selectedWorker.cedula})</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => {
                    setSelectedWorker(null)
                    setSearchTerm('')
                  }}
                  className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div>
                <input 
                  type="text"
                  placeholder="Buscar por cédula o nombre..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setShowDropdown(true)
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="block w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-[#1e293b] focus:ring-[#1e293b] bg-[#fbf8fa] transition-colors"
                  required
                />
                {showDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {isSearching ? (
                      <div className="p-4 text-sm text-slate-500 text-center">Buscando...</div>
                    ) : workers.length === 0 ? (
                      <div className="p-4 text-sm text-slate-500 text-center">No se encontraron trabajadores.</div>
                    ) : (
                      <ul className="py-1">
                        {workers.map(w => (
                          <li 
                            key={w.id} 
                            onClick={() => {
                              setSelectedWorker(w)
                              setShowDropdown(false)
                            }}
                            className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 border-b border-slate-100 last:border-0"
                          >
                            <div className="font-medium">{w.nombres} {w.apellidos}</div>
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
            <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-2">Tipo de Examen</label>
            <select 
              value={examType} 
              onChange={(e) => setExamType(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-[#1e293b] focus:ring-[#1e293b] bg-[#fbf8fa] transition-colors"
            >
              <option value="ingreso">Ingreso</option>
              <option value="periodico">Periódico</option>
              <option value="egreso">Egreso</option>
              <option value="post_incapacidad">Post Incapacidad</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-2">Archivo PDF del Examen</label>
          <div className="mt-1 flex justify-center rounded-lg border-2 border-dashed border-slate-300 px-6 py-10 bg-[#fbf8fa] hover:bg-slate-50 transition-colors group relative">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-slate-400 group-hover:text-[#1e293b] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="mt-4 flex text-sm leading-6 text-slate-600 justify-center">
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
              <p className="text-xs leading-5 text-slate-500 mt-2">
                {file ? <span className="font-semibold text-emerald-600">{file.name}</span> : 'PDF hasta 10MB'}
              </p>
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isUploading || !file || !selectedWorker}
          className="w-full bg-[#1e293b] text-white px-6 py-4 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-3 transition-colors shadow-sm"
        >
          {isUploading ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              Procesando y extrayendo con IA...
            </>
          ) : 'Analizar Examen y Extraer Recomendaciones'}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm font-medium flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
          {error}
        </div>
      )}

      {results && (
        <div className="mt-8 pt-8 border-t border-slate-200 animate-in fade-in duration-500">
          <h3 className="text-lg font-semibold text-[#1e293b] mb-4 flex items-center gap-2">
            Resultados del Análisis IA
            <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-0.5 rounded-full">{results.length}</span>
          </h3>
          
          {results.length === 0 ? (
            <div className="bg-[#d1fae5] border border-[#10b981]/20 rounded-lg p-6 text-center">
              <svg className="w-12 h-12 text-emerald-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <p className="text-[#065f46] font-medium">El trabajador está APTO sin restricciones médicas operativas.</p>
            </div>
          ) : (
            <ul className="grid gap-4">
              {results.map((rec, idx) => (
                <li key={idx} className={`p-5 rounded-lg border flex flex-col gap-3 transition-colors ${
                  rec.type === 'restriccion' ? 'bg-[#fef3c7] border-[#f59e0b]/30' :
                  rec.type === 'reubicacion' ? 'bg-[#fee2e2] border-[#ef4444]/30' :
                  'bg-sky-50 border-sky-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${
                      rec.type === 'restriccion' ? 'bg-[#f59e0b] text-white' :
                      rec.type === 'reubicacion' ? 'bg-[#ef4444] text-white' :
                      'bg-sky-600 text-white'
                    }`}>
                      {rec.type}
                    </span>
                    {rec.duration_days && (
                      <span className="text-xs text-slate-600 font-medium flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        {rec.duration_days} días
                      </span>
                    )}
                  </div>
                  <p className="text-[#1e293b] text-sm leading-relaxed font-medium">{rec.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
