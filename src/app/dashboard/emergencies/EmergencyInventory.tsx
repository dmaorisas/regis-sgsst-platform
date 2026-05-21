'use client'

import { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

interface Centro {
  id: string
  nombre: string
}

interface Equipment {
  id: string
  tipo: 'extintor' | 'botiquin' | 'camilla' | 'otro'
  codigo_interno: string
  descripcion: string | null
  ubicacion: string | null
  fecha_ultima_revision: string
  fecha_vencimiento: string
  estado: 'operativo' | 'alerta_vencimiento' | 'vencido'
  centro_id: string | null
  centros_de_trabajo?: {
    nombre: string
  } | null
}

export default function EmergencyInventory({ companyId }: { companyId: string }) {
  const supabase = createSupabaseBrowserClient()

  // State
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([])
  const [centros, setCentros] = useState<Centro[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitLoading, setIsSubmitLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [centroFilter, setCentroFilter] = useState('all')

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Equipment | null>(null)

  // Form Fields
  const [tipo, setTipo] = useState<'extintor' | 'botiquin' | 'camilla' | 'otro'>('extintor')
  const [codigoInterno, setCodigoInterno] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [fechaUltimaRevision, setFechaUltimaRevision] = useState(
    new Date().toISOString().split('T')[0] || '',
  )
  const [isManualExpiry, setIsManualExpiry] = useState(false)
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [centroId, setCentroId] = useState('')

  // Calculate default expiration
  const calculateExpiry = useCallback((type: string, revisionDate: string): string => {
    if (!revisionDate) return ''
    const date = new Date(revisionDate + 'T00:00:00')
    if (isNaN(date.getTime())) return ''

    if (type === 'extintor') {
      date.setFullYear(date.getFullYear() + 1)
    } else if (type === 'botiquin') {
      date.setMonth(date.getMonth() + 6)
    } else if (type === 'camilla') {
      date.setFullYear(date.getFullYear() + 2)
    } else {
      date.setFullYear(date.getFullYear() + 1) // default 1 year
    }

    return date.toISOString().split('T')[0] || ''
  }, [])

  // Auto calculate expiration when type or revision date changes
  useEffect(() => {
    if (!isManualExpiry) {
      const calculated = calculateExpiry(tipo, fechaUltimaRevision)
      setFechaVencimiento(calculated)
    }
  }, [tipo, fechaUltimaRevision, isManualExpiry, calculateExpiry])

  // Determine status from expiration date
  const determineStatus = (
    expiryDateStr: string,
  ): 'operativo' | 'alerta_vencimiento' | 'vencido' => {
    if (!expiryDateStr) return 'operativo'

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const expiry = new Date(expiryDateStr + 'T00:00:00')
    expiry.setHours(0, 0, 0, 0)

    const diffTime = expiry.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) return 'vencido'
    if (diffDays <= 30) return 'alerta_vencimiento'
    return 'operativo'
  }

  // Load Initial Data
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // 1. Fetch Centers
      const { data: centrosData, error: centrosError } = await supabase
        .from('centros_de_trabajo')
        .select('id, nombre')
        .eq('company_id', companyId)
        .order('nombre', { ascending: true })

      if (centrosError) throw centrosError
      setCentros(centrosData || [])

      // 2. Fetch Equipment List
      const { data: equipmentData, error: eqError } = await supabase
        .from('emergency_equipment')
        .select(
          `
          id,
          tipo,
          codigo_interno,
          descripcion,
          ubicacion,
          fecha_ultima_revision,
          fecha_vencimiento,
          estado,
          centro_id,
          centros_de_trabajo(nombre)
        `,
        )
        .eq('company_id', companyId)
        .order('fecha_vencimiento', { ascending: true })

      if (eqError) throw eqError
      setEquipmentList((equipmentData as unknown as Equipment[]) || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error cargando datos del inventario')
    } finally {
      setIsLoading(false)
    }
  }, [companyId, supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingItem(null)
    setTipo('extintor')
    setCodigoInterno('')
    setDescripcion('')
    setUbicacion('')
    setFechaUltimaRevision(new Date().toISOString().split('T')[0] || '')
    setIsManualExpiry(false)
    setCentroId(centros[0]?.id || '')
    setIsModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEditModal = (item: Equipment) => {
    setEditingItem(item)
    setTipo(item.tipo)
    setCodigoInterno(item.codigo_interno)
    setDescripcion(item.descripcion || '')
    setUbicacion(item.ubicacion || '')
    setFechaUltimaRevision(item.fecha_ultima_revision)

    // Check if expiry date matches default calculation to set manual toggle
    const defaultCalculated = calculateExpiry(item.tipo, item.fecha_ultima_revision)
    const isManual = item.fecha_vencimiento !== defaultCalculated
    setIsManualExpiry(isManual)
    setFechaVencimiento(item.fecha_vencimiento)
    setCentroId(item.centro_id || '')
    setIsModalOpen(true)
  }

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitLoading(true)
    setError(null)

    const status = determineStatus(fechaVencimiento)

    const payload = {
      company_id: companyId,
      centro_id: centroId || null,
      tipo,
      codigo_interno: codigoInterno.trim().toUpperCase(),
      descripcion: descripcion.trim() || null,
      ubicacion: ubicacion.trim() || null,
      fecha_ultima_revision: fechaUltimaRevision,
      fecha_vencimiento: fechaVencimiento,
      estado: status,
    }

    try {
      if (editingItem) {
        // Update
        const { error: updErr } = await supabase
          .from('emergency_equipment')
          .update(payload)
          .eq('id', editingItem.id)

        if (updErr) throw updErr
      } else {
        // Insert
        const { error: insErr } = await supabase.from('emergency_equipment').insert(payload)

        if (insErr) throw insErr
      }

      setIsModalOpen(false)
      loadData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar el equipo')
    } finally {
      setIsSubmitLoading(false)
    }
  }

  // Handle Delete
  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este equipo del inventario?')) return

    setError(null)
    try {
      const { error: delErr } = await supabase.from('emergency_equipment').delete().eq('id', id)

      if (delErr) throw delErr
      loadData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el equipo')
    }
  }

  // Filter Equipment List
  const filteredList = equipmentList.filter((item) => {
    const matchesSearch =
      item.codigo_interno.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.ubicacion && item.ubicacion.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.descripcion && item.descripcion.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesType = typeFilter === 'all' || item.tipo === typeFilter
    const matchesStatus = statusFilter === 'all' || item.estado === statusFilter
    const matchesCentro = centroFilter === 'all' || item.centro_id === centroFilter

    return matchesSearch && matchesType && matchesStatus && matchesCentro
  })

  // Statistics counters
  const stats = {
    total: equipmentList.length,
    operativos: equipmentList.filter((e) => e.estado === 'operativo').length,
    alerta: equipmentList.filter((e) => e.estado === 'alerta_vencimiento').length,
    vencidos: equipmentList.filter((e) => e.estado === 'vencido').length,
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Total Equipos</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{stats.total}</div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
          <div className="text-sm font-medium text-emerald-700">Operativos</div>
          <div className="mt-2 text-3xl font-bold text-emerald-900">{stats.operativos}</div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
          <div className="text-sm font-medium text-amber-700">Próximos a Vencer</div>
          <div className="mt-2 text-3xl font-bold text-amber-900">{stats.alerta}</div>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-5 shadow-sm">
          <div className="text-sm font-medium text-rose-700">Vencidos</div>
          <div className="mt-2 text-3xl font-bold text-rose-900">{stats.vencidos}</div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          ⚠️ {error}
        </div>
      )}

      {/* Toolbar / Filters */}
      <div className="flex flex-col gap-4 rounded-lg border bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-4">
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por código, ubicación..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 pl-9 text-sm focus:border-red-500 focus:outline-none"
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              🔍
            </div>
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
          >
            <option value="all">Todos los Tipos</option>
            <option value="extintor">🧯 Extintor</option>
            <option value="botiquin">🩹 Botiquín</option>
            <option value="camilla">🚑 Camilla</option>
            <option value="otro">🛠️ Otro</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
          >
            <option value="all">Todos los Estados</option>
            <option value="operativo">Operativo</option>
            <option value="alerta_vencimiento">Próximo a vencer</option>
            <option value="vencido">Vencido</option>
          </select>

          {/* Center Filter */}
          <select
            value={centroFilter}
            onChange={(e) => setCentroFilter(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
          >
            <option value="all">Todos los Centros</option>
            {centros.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-red-700"
        >
          ➕ Registrar Equipo
        </button>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex h-32 flex-col items-center justify-center text-slate-400">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-red-600" />
            <span className="mt-2 text-sm">Cargando inventario...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-sm italic text-slate-400">
            No se encontraron equipos registrados que coincidan con la búsqueda.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3">Código</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3">Centro de Trabajo</th>
                <th className="px-6 py-3">Ubicación</th>
                <th className="px-6 py-3">Última Revisión</th>
                <th className="px-6 py-3">Fecha Vencimiento</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredList.map((item) => {
                const isOverdue = item.estado === 'vencido'
                const isWarning = item.estado === 'alerta_vencimiento'

                return (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="whitespace-nowrap px-6 py-4 font-mono font-bold text-slate-900">
                      {item.codigo_interno}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 capitalize">
                      {item.tipo === 'extintor' && '🧯 Extintor'}
                      {item.tipo === 'botiquin' && '🩹 Botiquín'}
                      {item.tipo === 'camilla' && '🚑 Camilla'}
                      {item.tipo === 'otro' && '🛠️ Otro'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {item.centros_de_trabajo?.nombre || 'No asignado'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{item.ubicacion || '—'}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                      {item.fecha_ultima_revision}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={
                          isOverdue
                            ? 'font-bold text-red-600'
                            : isWarning
                              ? 'font-semibold text-amber-600'
                              : 'text-slate-600'
                        }
                      >
                        {item.fecha_vencimiento}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {item.estado === 'operativo' && (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          Operativo
                        </span>
                      )}
                      {item.estado === 'alerta_vencimiento' && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                          Próximo a Vencer
                        </span>
                      )}
                      {item.estado === 'vencido' && (
                        <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                          Vencido
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="text-sm font-semibold text-slate-600 transition-colors hover:text-red-600"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-sm font-semibold text-rose-600 transition-colors hover:text-rose-800"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="animate-in zoom-in-95 w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl duration-200">
            <h3 className="mb-4 text-lg font-bold text-slate-900">
              {editingItem ? 'Editar Equipo de Emergencia' : 'Registrar Equipo de Emergencia'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Internal Code */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Código Interno *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: EXT-001"
                  value={codigoInterno}
                  onChange={(e) => setCodigoInterno(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                />
              </div>

              {/* Type & Center in a grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Tipo de Equipo
                  </label>
                  <select
                    value={tipo}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setTipo(e.target.value as 'extintor' | 'botiquin' | 'camilla' | 'otro')
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                  >
                    <option value="extintor">🧯 Extintor</option>
                    <option value="botiquin">🩹 Botiquín</option>
                    <option value="camilla">🚑 Camilla</option>
                    <option value="otro">🛠️ Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Centro de Trabajo
                  </label>
                  <select
                    required
                    value={centroId}
                    onChange={(e) => setCentroId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                  >
                    <option value="">Selecciona un centro...</option>
                    {centros.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location & Last Revision Date */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Ubicación Específica
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Piso 2, Cafetería"
                    value={ubicacion}
                    onChange={(e) => setUbicacion(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Última Revisión *
                  </label>
                  <input
                    type="date"
                    required
                    value={fechaUltimaRevision}
                    onChange={(e) => setFechaUltimaRevision(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Expiration date with manual override toggle */}
              <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Fecha de Vencimiento
                  </span>
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={isManualExpiry}
                      onChange={(e) => setIsManualExpiry(e.target.checked)}
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    Ajustar manualmente
                  </label>
                </div>

                <input
                  type="date"
                  required
                  disabled={!isManualExpiry}
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
                {!isManualExpiry && (
                  <p className="text-xs italic text-slate-500">
                    Calculado automáticamente:
                    {tipo === 'extintor' && ' +1 Año (Extintor)'}
                    {tipo === 'botiquin' && ' +6 Meses (Botiquín)'}
                    {tipo === 'camilla' && ' +2 Años (Camilla)'}
                    {tipo === 'otro' && ' +1 Año (Otro)'}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Descripción / Observaciones
                </label>
                <textarea
                  placeholder="Detalles sobre el equipo, estado físico, marca, etc."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={2}
                  className="mt-1 w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitLoading}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitLoading}
                  className="flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-red-700"
                >
                  {isSubmitLoading && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  {editingItem ? 'Guardar Cambios' : 'Registrar Equipo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
