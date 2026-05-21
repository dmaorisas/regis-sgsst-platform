'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Archive, Loader2 } from 'lucide-react'

type Company = {
  id: string
  nit: string
  razon_social: string
  numero_trabajadores: number
  clase_riesgo: number | null
  capitulo_aplicable: string | null
  ciudad: string | null
  direccion: string | null
}

export default function CompanyManagementClient() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Modal state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    nit: '',
    razon_social: '',
    numero_trabajadores: '',
    clase_riesgo: '',
    capitulo_aplicable: '',
    ciudad: '',
    direccion: '',
  })

  useEffect(() => {
    fetchCompanies()
  }, [])

  const fetchCompanies = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/regis/companies')
      if (!res.ok) throw new Error('Error al cargar empresas')
      const data = await res.json()
      setCompanies(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const openModal = (company?: Company) => {
    setError(null)
    if (company) {
      setEditingId(company.id)
      setFormData({
        nit: company.nit,
        razon_social: company.razon_social,
        numero_trabajadores: company.numero_trabajadores.toString(),
        clase_riesgo: company.clase_riesgo ? company.clase_riesgo.toString() : '',
        capitulo_aplicable: company.capitulo_aplicable || '',
        ciudad: company.ciudad || '',
        direccion: company.direccion || '',
      })
    } else {
      setEditingId(null)
      setFormData({
        nit: '',
        razon_social: '',
        numero_trabajadores: '',
        clase_riesgo: '',
        capitulo_aplicable: '',
        ciudad: '',
        direccion: '',
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      ...formData,
      numero_trabajadores: parseInt(formData.numero_trabajadores, 10),
      clase_riesgo: formData.clase_riesgo ? parseInt(formData.clase_riesgo, 10) : null,
      capitulo_aplicable: formData.capitulo_aplicable || null,
    }

    try {
      const url = editingId ? `/api/regis/companies/${editingId}` : '/api/regis/companies'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar empresa')

      if (editingId) {
        setCompanies((prev) => prev.map((c) => (c.id === editingId ? data.company : c)))
      } else {
        setCompanies((prev) => [data.company, ...prev])
      }

      closeModal()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async (id: string, name: string) => {
    if (
      !window.confirm(`¿Seguro que deseas archivar la empresa ${name}? Esto no se puede deshacer.`)
    )
      return

    try {
      const res = await fetch(`/api/regis/companies/${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al archivar')

      setCompanies((prev) => prev.filter((c) => c.id !== id))
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err))
    }
  }

  const filteredCompanies = companies.filter(
    (c) =>
      c.razon_social.toLowerCase().includes(search.toLowerCase()) ||
      c.nit.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4 sm:flex sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por NIT o Razón Social..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-4 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            Nueva Empresa
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-slate-900">NIT</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-900">Razón Social</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-900">Trabajadores</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-900">Clase Riesgo</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-900">Capítulo</th>
              <th className="px-6 py-3 text-right font-semibold text-slate-900">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-sky-600" />
                  <p className="mt-2 text-sm">Cargando empresas...</p>
                </td>
              </tr>
            ) : filteredCompanies.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  No se encontraron empresas.
                </td>
              </tr>
            ) : (
              filteredCompanies.map((company) => (
                <tr key={company.id} className="transition hover:bg-slate-50">
                  <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900">
                    {company.nit}
                  </td>
                  <td className="px-6 py-4 text-slate-700">{company.razon_social}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-center text-slate-700">
                    {company.numero_trabajadores}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center">
                    {company.clase_riesgo ? (
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                        {company.clase_riesgo}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center">
                    {company.capitulo_aplicable ? (
                      <span className="inline-flex rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                        {company.capitulo_aplicable}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <button
                      onClick={() => openModal(company)}
                      className="rounded p-2 text-sky-600 transition hover:bg-sky-50 hover:text-sky-900"
                      title="Editar Empresa"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleArchive(company.id, company.razon_social)}
                      className="ml-1 rounded p-2 text-red-600 transition hover:bg-red-50 hover:text-red-900"
                      title="Archivar Empresa"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-6 text-xl font-bold text-slate-900">
              {editingId ? 'Editar Empresa' : 'Nueva Empresa'}
            </h2>

            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">NIT *</label>
                  <input
                    type="text"
                    required
                    value={formData.nit}
                    onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    placeholder="Ej. 900123456-1"
                  />
                </div>

                <div className="col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Razón Social *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.razon_social}
                    onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Nº Trabajadores *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.numero_trabajadores}
                    onChange={(e) =>
                      setFormData({ ...formData, numero_trabajadores: e.target.value })
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Clase de Riesgo
                  </label>
                  <select
                    value={formData.clase_riesgo}
                    onChange={(e) => setFormData({ ...formData, clase_riesgo: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="">Seleccione...</option>
                    <option value="1">I - Riesgo Mínimo</option>
                    <option value="2">II - Riesgo Bajo</option>
                    <option value="3">III - Riesgo Medio</option>
                    <option value="4">IV - Riesgo Alto</option>
                    <option value="5">V - Riesgo Máximo</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Capítulo Aplicable
                  </label>
                  <select
                    value={formData.capitulo_aplicable}
                    onChange={(e) =>
                      setFormData({ ...formData, capitulo_aplicable: e.target.value })
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="">Automático o Seleccione...</option>
                    <option value="I">Capítulo I (&lt;10 emp, Riesgo I-III)</option>
                    <option value="II">Capítulo II (11-50 emp, Riesgo I-III)</option>
                    <option value="III">Capítulo III (&gt;50 emp o Riesgo IV-V)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Ciudad</label>
                  <input
                    type="text"
                    value={formData.ciudad}
                    onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Dirección Principal
                  </label>
                  <input
                    type="text"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {saving ? 'Guardando...' : 'Guardar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
