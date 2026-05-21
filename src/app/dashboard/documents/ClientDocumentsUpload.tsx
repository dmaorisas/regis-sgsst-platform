'use client'

import { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { hashFile } from '@/lib/utils/file-hash'

type ProgressCategory = {
  document_type_code: string
  document_type_name: string
  weight: number
  is_required: boolean
  justification: string | null
  sort_order: number
  uploaded_count: number
  has_document: boolean
  earned_weight: number
}

type ProgressData = {
  percentage: number
  total_weight_sum: number
  earned_weight_sum: number
  categories: ProgressCategory[]
  total_documents: number
}

type WeightRow = {
  id?: string
  document_type_code: string
  document_type_name: string
  weight: number
  is_required: boolean
  justification: string | null
  sort_order: number
  company_id?: string | null
}

type WeightsData = {
  weights: WeightRow[]
  total_weight: number
  is_valid: boolean
  is_company_override: boolean
  available_doc_types: Array<{ codigo: string; nombre: string }>
}

type DocumentRow = {
  id: string
  document_type_id: string
  file_url: string
  status: string
  created_at: string
  source: string
  metadata: { original_filename?: string; size_bytes?: number } | null
  document_types: { codigo: string; nombre: string } | null
}

type EditWeight = {
  document_type_code: string
  document_type_name: string
  weight: number
  is_required: boolean
  justification: string
  sort_order: number
}

export default function ClientDocumentsUpload({ companyId }: { companyId: string }) {
  const [isUploading, setIsUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [weightsData, setWeightsData] = useState<WeightsData | null>(null)
  const [showWeightsConfig, setShowWeightsConfig] = useState(false)
  const [editWeights, setEditWeights] = useState<EditWeight[]>([])
  const [availableTypes, setAvailableTypes] = useState<Array<{ codigo: string; nombre: string }>>(
    [],
  )
  const [savingWeights, setSavingWeights] = useState(false)
  const supabase = createSupabaseBrowserClient()

  const loadProgress = useCallback(async () => {
    const res = await fetch(`/api/documents/progress?company_id=${companyId}`)
    if (res.ok) {
      const data = await res.json()
      setProgress(data)
      if (!selectedCategory && data.categories.length > 0) {
        setSelectedCategory(data.categories[0].document_type_code)
      }
    }
  }, [companyId, selectedCategory])

  const loadDocuments = useCallback(async () => {
    const { data } = await supabase
      .from('documents')
      .select(
        'id, document_type_id, file_url, status, created_at, source, metadata, document_types(codigo, nombre)',
      )
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    setDocuments((data as DocumentRow[] | null) ?? [])
  }, [companyId, supabase])

  const loadWeights = useCallback(async () => {
    const res = await fetch(`/api/documents/weights?company_id=${companyId}`)
    if (res.ok) {
      const data = await res.json()
      setWeightsData(data)
    }
  }, [companyId])

  useEffect(() => {
    loadProgress()
    loadDocuments()
    loadWeights()
  }, [loadProgress, loadDocuments, loadWeights])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedCategory) return

    setIsUploading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const fileHash = await hashFile(file)

      const checkRes = await fetch('/api/documents/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          document_type_code: selectedCategory,
          file_hash: fileHash,
        }),
      })

      const checkData = await checkRes.json()
      if (checkData.is_duplicate) {
        setErrorMsg(checkData.message)
        setIsUploading(false)
        e.target.value = ''
        return
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('company_id', companyId)
      formData.append('document_type_code', selectedCategory)
      formData.append('file_hash', fileHash)

      const uploadRes = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      const uploadData = await uploadRes.json()

      if (!uploadRes.ok) {
        if (uploadData.error === 'duplicate') {
          setErrorMsg(uploadData.message)
        } else {
          setErrorMsg(uploadData.error || 'Error al subir el documento')
        }
      } else {
        setSuccessMsg('Documento subido exitosamente')
        await loadProgress()
        await loadDocuments()
        setTimeout(() => setSuccessMsg(null), 3000)
      }
    } catch {
      setErrorMsg('Error al procesar el archivo')
    }

    setIsUploading(false)
    e.target.value = ''
  }

  const handleDelete = async (doc: DocumentRow) => {
    if (!confirm('Estas seguro de eliminar este documento?')) return

    const { error } = await supabase
      .from('documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', doc.id)

    if (error) {
      setErrorMsg(error.message)
    } else {
      if (doc.file_url) {
        await supabase.storage.from('company_documents').remove([doc.file_url])
      }
      await loadProgress()
      await loadDocuments()
    }
  }

  const openWeightsEditor = () => {
    if (!weightsData) return
    setEditWeights(
      weightsData.weights.map((w) => ({
        document_type_code: w.document_type_code,
        document_type_name: w.document_type_name,
        weight: Number(w.weight),
        is_required: w.is_required,
        justification: w.justification ?? '',
        sort_order: w.sort_order,
      })),
    )
    setAvailableTypes(weightsData.available_doc_types ?? [])
    setShowWeightsConfig(true)
  }

  const handleAddType = (codigo: string, nombre: string) => {
    const maxOrder = editWeights.reduce((max, w) => Math.max(max, w.sort_order), 0)
    setEditWeights((prev) => [
      ...prev,
      {
        document_type_code: codigo,
        document_type_name: nombre,
        weight: 0,
        is_required: false,
        justification: '',
        sort_order: maxOrder + 1,
      },
    ])
    setAvailableTypes((prev) => prev.filter((t) => t.codigo !== codigo))
  }

  const handleRemoveType = (codigo: string, nombre: string) => {
    setEditWeights((prev) => prev.filter((w) => w.document_type_code !== codigo))
    setAvailableTypes((prev) =>
      [...prev, { codigo, nombre }].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    )
  }

  const editWeightTotal = editWeights.reduce((sum, w) => sum + w.weight, 0)
  const editWeightValid = Math.abs(editWeightTotal - 100) < 0.01

  const handleSaveWeights = async () => {
    if (!editWeightValid) return
    setSavingWeights(true)
    setErrorMsg(null)

    const res = await fetch('/api/documents/weights', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: weightsData?.is_company_override ? companyId : null,
        weights: editWeights,
      }),
    })

    const data = await res.json()
    setSavingWeights(false)

    if (!res.ok) {
      setErrorMsg(data.error)
    } else {
      setShowWeightsConfig(false)
      await loadWeights()
      await loadProgress()
    }
  }

  const sourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      manual: 'Manual',
      webhook_pila: 'PILA Automatico',
      webhook_n8n: 'Automatico',
      medical_mirror: 'Examen Medico',
    }
    return labels[source] ?? source
  }

  const percentage = progress?.percentage ?? 0

  return (
    <div className="space-y-6">
      {/* Progress Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Progreso de Documentacion Basica</h2>
          <button
            onClick={openWeightsEditor}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            Configurar pesos
          </button>
        </div>

        <div className="mb-2 flex justify-between text-sm font-medium text-slate-600">
          <span>Cumplimiento SG-SST</span>
          <span className={percentage === 100 ? 'text-emerald-600' : 'text-sky-600'}>
            {percentage}%
          </span>
        </div>
        <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full transition-all duration-500 ease-in-out ${percentage === 100 ? 'bg-emerald-500' : 'bg-sky-500'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {progress && (
          <div className="mt-4 space-y-2">
            {progress.categories.map((cat) => (
              <div key={cat.document_type_code} className="flex items-center gap-3">
                <div className="w-5 text-center">
                  {cat.has_document ? (
                    <span className="text-sm font-bold text-emerald-600">OK</span>
                  ) : (
                    <span className="text-sm text-slate-400">--</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-medium ${cat.has_document ? 'text-slate-800' : 'text-slate-500'}`}
                    >
                      {cat.document_type_name}
                      {cat.is_required && <span className="ml-1 text-xs text-rose-400">*</span>}
                    </span>
                    <span className="text-xs text-slate-400">{cat.weight}%</span>
                  </div>
                  <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full transition-all duration-300 ${cat.has_document ? 'bg-emerald-400' : 'bg-slate-200'}`}
                      style={{ width: cat.has_document ? '100%' : '0%' }}
                    />
                  </div>
                </div>
                <span className="w-8 text-right text-xs font-medium text-slate-500">
                  {cat.uploaded_count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h2 className="text-lg font-semibold text-slate-900">Documentos</h2>

          <div className="flex w-full items-center gap-3 rounded-lg border bg-slate-50 p-2 sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="cursor-pointer border-none bg-transparent text-sm font-medium text-slate-700 focus:ring-0"
            >
              {progress?.categories.map((cat) => (
                <option key={cat.document_type_code} value={cat.document_type_code}>
                  {cat.document_type_name}
                </option>
              ))}
            </select>

            <div className="h-6 w-px bg-slate-300" />

            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleUpload}
              disabled={isUploading}
            />
            <label
              htmlFor="file-upload"
              className={`cursor-pointer whitespace-nowrap rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
            >
              {isUploading ? 'Subiendo...' : 'Subir Archivo'}
            </label>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-md bg-rose-50 p-4 text-sm text-rose-700">{errorMsg}</div>
        )}
        {successMsg && (
          <div className="mb-4 rounded-md bg-emerald-50 p-4 text-sm text-emerald-700">
            {successMsg}
          </div>
        )}

        {documents.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed py-12 text-center">
            <h3 className="text-sm font-semibold text-slate-900">No hay documentos</h3>
            <p className="mt-1 text-sm text-slate-500">
              Comienza seleccionando una categoria y subiendo el primer archivo.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 border-t border-slate-100">
            {documents.map((doc) => {
              const fileName =
                doc.metadata?.original_filename || doc.file_url?.split('/').pop() || 'Documento'
              const sizeKB = doc.metadata?.size_bytes
                ? (doc.metadata.size_bytes / 1024).toFixed(1)
                : null
              const typeName = doc.document_types?.nombre ?? 'Sin tipo'

              return (
                <li
                  key={doc.id}
                  className="flex items-center justify-between rounded-md px-2 py-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {typeName}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900">{fileName}</span>
                      <span className="text-xs text-slate-500">
                        {sizeKB && `${sizeKB} KB · `}
                        {new Date(doc.created_at).toLocaleDateString('es-CO')}
                        {doc.source !== 'manual' && (
                          <span className="ml-2 rounded bg-sky-50 px-1.5 py-0.5 text-xs text-sky-700">
                            {sourceLabel(doc.source)}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  {doc.source === 'manual' && (
                    <button
                      onClick={() => handleDelete(doc)}
                      className="rounded-md px-3 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-800"
                    >
                      Eliminar
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Weights Configuration Modal */}
      {showWeightsConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                Configuracion de Pesos por Tipo de Documento
              </h3>
              <button
                onClick={() => setShowWeightsConfig(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                X
              </button>
            </div>

            <p className="mb-4 text-sm text-slate-600">
              Cada tipo de documento tiene un peso que representa su importancia en el porcentaje de
              cumplimiento. La suma de todos los pesos debe ser exactamente 100%.
            </p>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium uppercase text-slate-500">
                  <th className="pb-2">Tipo de documento</th>
                  <th className="pb-2 text-center">Peso (%)</th>
                  <th className="pb-2 text-center">Requerido</th>
                  <th className="pb-2">Justificacion</th>
                  <th className="w-10 pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {editWeights.map((w, idx) => (
                  <tr key={w.document_type_code} className="border-b border-slate-100">
                    <td className="py-3 font-medium text-slate-800">{w.document_type_name}</td>
                    <td className="py-3 text-center">
                      <input
                        type="number"
                        min="0.01"
                        max="100"
                        step="0.01"
                        value={w.weight}
                        onChange={(e) => {
                          setEditWeights((prev) =>
                            prev.map((item, i) =>
                              i === idx
                                ? { ...item, weight: parseFloat(e.target.value) || 0 }
                                : item,
                            ),
                          )
                        }}
                        className="w-20 rounded-md border border-slate-300 px-2 py-1 text-center text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      />
                    </td>
                    <td className="py-3 text-center">
                      <input
                        type="checkbox"
                        checked={w.is_required}
                        onChange={(e) => {
                          setEditWeights((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, is_required: e.target.checked } : item,
                            ),
                          )
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                    </td>
                    <td className="py-3">
                      <input
                        type="text"
                        value={w.justification}
                        onChange={(e) => {
                          setEditWeights((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, justification: e.target.value } : item,
                            ),
                          )
                        }}
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        placeholder="Justificacion..."
                      />
                    </td>
                    <td className="py-3 text-center">
                      <button
                        onClick={() => handleRemoveType(w.document_type_code, w.document_type_name)}
                        className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Quitar tipo"
                      >
                        X
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2">
                  <td className="py-3 font-bold text-slate-800">Total</td>
                  <td
                    className={`py-3 text-center font-bold ${editWeightValid ? 'text-emerald-600' : 'text-rose-600'}`}
                  >
                    {editWeightTotal.toFixed(2)}%
                  </td>
                  <td colSpan={3} className="py-3">
                    {!editWeightValid && (
                      <span className="text-xs text-rose-600">
                        {editWeightTotal > 100
                          ? `Excede por ${(editWeightTotal - 100).toFixed(2)}%`
                          : `Faltan ${(100 - editWeightTotal).toFixed(2)}%`}
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Add new type */}
            {availableTypes.length > 0 && (
              <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-3">
                <p className="mb-2 text-xs font-medium uppercase text-slate-500">
                  Agregar tipo de documento
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableTypes.map((dt) => (
                    <button
                      key={dt.codigo}
                      onClick={() => handleAddType(dt.codigo, dt.nombre)}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700"
                    >
                      + {dt.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowWeightsConfig(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveWeights}
                disabled={!editWeightValid || savingWeights}
                className={`rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm ${
                  editWeightValid && !savingWeights
                    ? 'bg-slate-900 hover:bg-slate-800'
                    : 'cursor-not-allowed bg-slate-400'
                }`}
              >
                {savingWeights ? 'Guardando...' : 'Guardar configuracion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
