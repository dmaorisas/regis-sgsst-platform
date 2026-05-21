'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

const REQUIRED_CATEGORIES = [
  { id: 'politica', name: 'Políticas SG-SST', color: 'bg-blue-100 text-blue-800' },
  { id: 'actas_recursos', name: 'Actas de Recursos', color: 'bg-amber-100 text-amber-800' },
  {
    id: 'plan_capacitacion',
    name: 'Plan de Capacitaciones',
    color: 'bg-emerald-100 text-emerald-800',
  },
  { id: 'cronograma', name: 'Cronograma Anual', color: 'bg-purple-100 text-purple-800' },
  { id: 'otros', name: 'Otros Documentos', color: 'bg-gray-100 text-gray-800' },
]

interface StorageFile {
  name: string
  created_at: string | null
  metadata?: { size: number } | null
}

export default function ClientDocumentsUpload({
  companyId,
  initialFiles,
}: {
  companyId: string
  initialFiles: StorageFile[]
}) {
  const [isUploading, setIsUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('politica')
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setErrorMsg(null)

    // Formato: idCategoria---timestamp_nombre_archivo.pdf
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    const filePath = `${companyId}/${selectedCategory}---${Date.now()}_${cleanFileName}`

    const { error } = await supabase.storage.from('company_documents').upload(filePath, file)

    setIsUploading(false)

    if (error) {
      if (error.message.includes('Bucket not found')) {
        setErrorMsg('El bucket "company_documents" no ha sido creado en Supabase.')
      } else {
        setErrorMsg(error.message)
      }
    } else {
      router.refresh()
    }
  }

  const handleDelete = async (fileName: string) => {
    if (!confirm('¿Estás seguro de eliminar este documento?')) return

    const { error } = await supabase.storage
      .from('company_documents')
      .remove([`${companyId}/${fileName}`])

    if (error) {
      alert(error.message)
    } else {
      router.refresh()
    }
  }

  // Calcular porcentaje de cumplimiento
  const validFiles = initialFiles.filter((f) => f.name !== '.emptyFolderPlaceholder')
  const uploadedCategoryIds = new Set(
    validFiles.map((f) => {
      const parts = f.name.split('---')
      return parts.length > 1 ? parts[0] : 'otros'
    }),
  )

  const requiredIds = REQUIRED_CATEGORIES.filter((c) => c.id !== 'otros').map((c) => c.id)
  const coveredRequiredCategories = requiredIds.filter((id) => uploadedCategoryIds.has(id))
  const compliancePercentage = Math.round(
    (coveredRequiredCategories.length / requiredIds.length) * 100,
  )

  return (
    <div className="space-y-6">
      {/* Tarjeta de Cumplimiento */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-bold text-slate-800">Progreso de Documentación Básica</h2>
        <div className="mb-2 flex justify-between text-sm font-medium text-slate-600">
          <span>Cumplimiento SG-SST</span>
          <span className={compliancePercentage === 100 ? 'text-emerald-600' : 'text-sky-600'}>
            {compliancePercentage}%
          </span>
        </div>
        <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full transition-all duration-500 ease-in-out ${compliancePercentage === 100 ? 'bg-emerald-500' : 'bg-sky-500'}`}
            style={{ width: `${compliancePercentage}%` }}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {requiredIds.map((reqId) => {
            const cat = REQUIRED_CATEGORIES.find((c) => c.id === reqId)!
            const isCovered = uploadedCategoryIds.has(reqId)
            return (
              <span
                key={reqId}
                className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${isCovered ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-slate-50 text-slate-500 ring-slate-400/20'}`}
              >
                {isCovered ? '✅ ' : '⏳ '}
                {cat.name}
              </span>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h2 className="text-lg font-semibold text-slate-900">Archivos Subidos</h2>

          <div className="flex w-full items-center gap-3 rounded-lg border bg-slate-50 p-2 sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="cursor-pointer border-none bg-transparent text-sm font-medium text-slate-700 focus:ring-0"
            >
              {REQUIRED_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <div className="h-6 w-px bg-slate-300"></div>

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

        {validFiles.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed py-12 text-center">
            <div className="mb-2 text-4xl">📁</div>
            <h3 className="text-sm font-semibold text-slate-900">No hay documentos</h3>
            <p className="mt-1 text-sm text-slate-500">
              Comienza seleccionando una categoría y subiendo el primer archivo.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 border-t border-slate-100">
            {validFiles.map((file) => {
              const parts = file.name.split('---')
              const catId = parts.length > 1 ? parts[0] : 'otros'
              const realName = parts.length > 1 ? parts[1]!.replace(/^\d+_/, '') : file.name
              const category =
                REQUIRED_CATEGORIES.find((c) => c.id === catId) ||
                REQUIRED_CATEGORIES[REQUIRED_CATEGORIES.length - 1]!

              return (
                <li
                  key={file.name}
                  className="flex items-center justify-between rounded-md px-2 py-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${category.color}`}
                    >
                      {category.name}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900">{realName}</span>
                      <span className="text-xs text-slate-500">
                        {((file.metadata?.size ?? 0) / 1024).toFixed(1)} KB •{' '}
                        {file.created_at ? new Date(file.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(file.name)}
                    className="rounded-md px-3 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-800"
                  >
                    Eliminar
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
