// ============================================================
// PROTECTED FILE — Do NOT modify without explicit user approval.
// Module: Actas (Comites y Actas de Reunion)
// See: memory/protection_actas_module.md
// ============================================================
'use client'

import { useState, useEffect, useCallback } from 'react'

interface Centro {
  id: string
  nombre: string
}

interface WorkerSearchResult {
  id: string
  nombres: string
  apellidos: string
  cedula: string
  cargo?: string
}

interface CommitteeMember {
  id?: string
  worker_id: string
  name: string
  cedula: string
  cargo: string
  rol: 'presidente' | 'secretario' | 'principal' | 'suplente' | 'brigadista'
  representacion?: 'empleador' | 'trabajadores' | ''
}

interface Committee {
  id: string
  tipo: 'copasst' | 'vigia_sst' | 'convivencia' | 'brigada_emergencias'
  nombre: string
  fecha_eleccion: string | null
  fecha_vigencia_fin: string | null
  is_active: boolean
  centro_id: string
  centro_nombre: string
  members: CommitteeMember[]
}

interface CommitteeManagerProps {
  companyId: string
  centros: Centro[]
}

const COMITE_TIPO_LABEL: Record<string, string> = {
  copasst: 'COPASST',
  vigia_sst: 'Vigía SST',
  convivencia: 'Comité de Convivencia',
  brigada_emergencias: 'Brigada de Emergencias',
}

const COMITE_TIPO_COLORS: Record<string, string> = {
  copasst: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  vigia_sst: 'bg-teal-50 text-teal-700 border-teal-200',
  convivencia: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  brigada_emergencias: 'bg-orange-50 text-orange-700 border-orange-200',
}

export default function CommitteeManager({ companyId, centros }: CommitteeManagerProps) {
  const [committees, setCommittees] = useState<Committee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estados del Formulario (Crear/Editar)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCommittee, setEditingCommittee] = useState<Committee | null>(null)

  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<'copasst' | 'vigia_sst' | 'convivencia' | 'brigada_emergencias'>(
    'copasst',
  )
  const [centroId, setCentroId] = useState('')
  const [fechaEleccion, setFechaEleccion] = useState('')
  const [fechaVigenciaFin, setFechaVigenciaFin] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [members, setMembers] = useState<CommitteeMember[]>([])

  // Búsqueda de Trabajadores
  const [workerSearch, setWorkerSearch] = useState('')
  const [foundWorkers, setFoundWorkers] = useState<WorkerSearchResult[]>([])
  const [searchingWorkers, setSearchingWorkers] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState<WorkerSearchResult | null>(null)

  // Roles de integrantes
  const [memberRol, setMemberRol] = useState<
    'presidente' | 'secretario' | 'principal' | 'suplente' | 'brigadista'
  >('principal')
  const [memberRepresentacion, setMemberRepresentacion] = useState<
    'empleador' | 'trabajadores' | ''
  >('')

  const [submitSubmitting, setSubmitSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const fetchCommittees = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/committees?companyId=${companyId}`)
      if (!res.ok) throw new Error('Error al cargar comités')
      const data = await res.json()
      setCommittees(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchCommittees()
  }, [fetchCommittees])

  // Buscar trabajadores
  useEffect(() => {
    if (workerSearch.trim().length < 2) {
      setFoundWorkers([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingWorkers(true)
        const res = await fetch(
          `/api/workers/search?companyId=${companyId}&q=${encodeURIComponent(workerSearch)}`,
        )
        if (res.ok) {
          const data = await res.json()
          setFoundWorkers(data.workers || [])
        }
      } catch (err) {
        console.error('Error searching workers', err)
      } finally {
        setSearchingWorkers(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [workerSearch, companyId])

  // Abrir formulario de creación
  const openCreateForm = () => {
    setEditingCommittee(null)
    setNombre('')
    setTipo('copasst')
    setCentroId(centros[0]?.id || '')
    setFechaEleccion('')
    setFechaVigenciaFin('')
    setIsActive(true)
    setMembers([])
    setWorkerSearch('')
    setSelectedWorker(null)
    setSubmitError(null)
    setIsFormOpen(true)
  }

  // Abrir formulario de edición
  const openEditForm = (com: Committee) => {
    setEditingCommittee(com)
    setNombre(com.nombre)
    setTipo(com.tipo)
    setCentroId(com.centro_id)
    setFechaEleccion(com.fecha_eleccion || '')
    setFechaVigenciaFin(com.fecha_vigencia_fin || '')
    setIsActive(com.is_active)
    setMembers([...com.members])
    setWorkerSearch('')
    setSelectedWorker(null)
    setSubmitError(null)
    setIsFormOpen(true)
  }

  // Agregar miembro al borrador
  const addMemberToDraft = () => {
    if (!selectedWorker) return

    // Validar duplicado
    if (members.some((m) => m.worker_id === selectedWorker.id)) {
      alert('Este trabajador ya está asignado al comité.')
      return
    }

    const newMem: CommitteeMember = {
      worker_id: selectedWorker.id,
      name: `${selectedWorker.nombres} ${selectedWorker.apellidos}`,
      cedula: selectedWorker.cedula,
      cargo: selectedWorker.cargo || 'Operario',
      rol: memberRol,
      representacion: memberRepresentacion || '',
    }

    setMembers([...members, newMem])
    setSelectedWorker(null)
    setWorkerSearch('')
  }

  // Remover miembro del borrador
  const removeMemberFromDraft = (workerId: string) => {
    setMembers(members.filter((m) => m.worker_id !== workerId))
  }

  // Enviar el formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!centroId) {
      setSubmitError('Debes seleccionar un centro de trabajo.')
      return
    }

    try {
      setSubmitSubmitting(true)
      setSubmitError(null)

      const url = editingCommittee ? `/api/committees/${editingCommittee.id}` : '/api/committees'
      const method = editingCommittee ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          centro_id: centroId,
          tipo,
          nombre,
          fecha_eleccion: fechaEleccion || null,
          fecha_vigencia_fin: fechaVigenciaFin || null,
          is_active: isActive,
          members,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar el comité')

      setIsFormOpen(false)
      fetchCommittees()
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setSubmitSubmitting(false)
    }
  }

  // Eliminar comité
  const handleDeleteCommittee = async (id: string, name: string) => {
    if (
      !confirm(
        `¿Estás seguro de que deseas eliminar el comité "${name}"? Se desactivarán todos sus registros e integrantes.`,
      )
    )
      return

    try {
      const res = await fetch(`/api/committees/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al eliminar comité')
      }
      fetchCommittees()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error inesperado')
    }
  }

  return (
    <div className="space-y-6">
      {/* Botón superior de agregar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Comités SG-SST</h2>
          <p className="text-xs text-slate-500">
            Administra los comités activos de la empresa para la generación de actas.
          </p>
        </div>
        <button
          onClick={openCreateForm}
          className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-500"
        >
          <svg className="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          Nuevo Comité
        </button>
      </div>

      {/* Grid de comités existentes */}
      {loading ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-col items-center gap-3">
            <svg
              className="h-8 w-8 animate-spin text-sky-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
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
            <span className="text-sm font-medium text-slate-500">
              Cargando comités de la empresa...
            </span>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
          <h2 className="text-lg font-semibold">Error al cargar comités</h2>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      ) : committees.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-6 text-center">
          <svg
            className="mx-auto h-12 w-12 text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-semibold text-slate-900">No hay comités creados</h3>
          <p className="mt-1 text-sm text-slate-500">
            Crea el primer comité para esta empresa haciendo clic en &quot;Nuevo Comité&quot;.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {committees.map((com) => (
            <div
              key={com.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{com.nombre}</h3>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <span>Centro: {com.centro_nombre}</span>
                      {com.fecha_eleccion && (
                        <span>
                          • Vigencia: {com.fecha_eleccion} al{' '}
                          {com.fecha_vigencia_fin || 'Indefinido'}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-inner ${COMITE_TIPO_COLORS[com.tipo] || 'bg-slate-50 text-slate-700'}`}
                  >
                    {COMITE_TIPO_LABEL[com.tipo] || com.tipo}
                  </span>
                </div>

                {/* Lista de integrantes */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <span className="block text-xs font-bold text-slate-700">
                    Integrantes ({com.members.length}):
                  </span>
                  {com.members.length === 0 ? (
                    <p className="text-xs italic text-slate-500">Sin integrantes registrados.</p>
                  ) : (
                    <div className="grid max-h-40 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
                      {com.members.map((m, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs"
                        >
                          <span className="block truncate font-semibold text-slate-900">
                            {m.name}
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                            {m.cargo}
                          </span>
                          <div className="mt-1 flex items-center gap-1">
                            <span className="rounded bg-sky-50 px-1 text-[9px] font-bold uppercase text-sky-700">
                              {m.rol}
                            </span>
                            {m.representacion && (
                              <span className="rounded bg-slate-100 px-1 text-[9px] font-medium capitalize text-slate-600">
                                {m.representacion}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${com.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}
                >
                  {com.is_active ? 'Activo' : 'Inactivo'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditForm(com)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteCommittee(com.id, com.nombre)}
                    className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal / Panel de Formulario */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-100 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingCommittee ? 'Editar Comité' : 'Crear Nuevo Comité'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {submitError && (
                <div className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-xs text-rose-700">
                  {submitError}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700">
                    Nombre del Comité
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. COPASST 1, Convivencia Oficina Norte"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700">
                    Tipo de Comité
                  </label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none"
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as typeof tipo)}
                  >
                    <option value="copasst">COPASST</option>
                    <option value="vigia_sst">Vigía SST</option>
                    <option value="convivencia">Comité de Convivencia</option>
                    <option value="brigada_emergencias">Brigada de Emergencias</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700">
                    Centro de Trabajo
                  </label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none"
                    value={centroId}
                    onChange={(e) => setCentroId(e.target.value)}
                  >
                    {centros.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                    {centros.length === 0 && <option value="">No hay centros de trabajo</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700">
                    Estado de Activación
                  </label>
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active_checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <label
                      htmlFor="is_active_checkbox"
                      className="cursor-pointer text-sm font-medium text-slate-700"
                    >
                      Activo
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700">
                    Fecha Elección / Constitución
                  </label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none"
                    value={fechaEleccion}
                    onChange={(e) => setFechaEleccion(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700">
                    Fecha Término Vigencia
                  </label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none"
                    value={fechaVigenciaFin}
                    onChange={(e) => setFechaVigenciaFin(e.target.value)}
                  />
                </div>
              </div>

              {/* GESTIÓN DE INTEGRANTES */}
              <div className="mt-6 border-t border-slate-100 pt-4">
                <h4 className="mb-2 text-sm font-bold text-slate-900">Miembros e Integrantes</h4>

                {/* Formulario Agregar Integrante */}
                <div className="mb-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <span className="block text-xs font-semibold text-slate-700">
                    Buscar y Añadir Trabajador:
                  </span>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="relative sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Buscar por cédula o nombre..."
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none"
                        value={workerSearch}
                        onChange={(e) => {
                          setWorkerSearch(e.target.value)
                          setSelectedWorker(null)
                        }}
                      />
                      {/* Resultados dropdown de búsqueda */}
                      {foundWorkers.length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 text-xs shadow-lg">
                          {foundWorkers.map((w) => (
                            <button
                              key={w.id}
                              type="button"
                              onClick={() => {
                                setSelectedWorker(w)
                                setWorkerSearch(`${w.nombres} ${w.apellidos}`)
                                setFoundWorkers([])
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-slate-100"
                            >
                              <span className="block font-semibold text-slate-900">
                                {w.nombres} {w.apellidos}
                              </span>
                              <span className="mt-0.5 block text-[10px] text-slate-500">
                                Cédula: {w.cedula}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      {searchingWorkers && (
                        <span className="absolute right-2 top-2.5 text-[10px] font-semibold text-slate-500">
                          Buscando...
                        </span>
                      )}
                    </div>

                    <div>
                      <select
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none"
                        value={memberRol}
                        onChange={(e) => setMemberRol(e.target.value as typeof memberRol)}
                      >
                        <option value="principal">Vocal Principal</option>
                        <option value="presidente">Presidente</option>
                        <option value="secretario">Secretario</option>
                        <option value="suplente">Vocal Suplente</option>
                        <option value="brigadista">Brigadista</option>
                      </select>
                    </div>

                    <div>
                      <select
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none"
                        value={memberRepresentacion}
                        onChange={(e) =>
                          setMemberRepresentacion(e.target.value as typeof memberRepresentacion)
                        }
                      >
                        <option value="">Representación (Opcional)</option>
                        <option value="empleador">Empleador</option>
                        <option value="trabajadores">Trabajadores</option>
                      </select>
                    </div>

                    <div className="flex justify-end sm:col-span-3">
                      <button
                        type="button"
                        onClick={addMemberToDraft}
                        disabled={!selectedWorker}
                        className="rounded bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-40"
                      >
                        Agregar Integrante
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tabla de integrantes cargados */}
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 font-semibold uppercase text-slate-600">
                      <tr>
                        <th className="px-4 py-2.5">Trabajador</th>
                        <th className="px-4 py-2.5">Cédula</th>
                        <th className="px-4 py-2.5">Rol en Comité</th>
                        <th className="px-4 py-2.5">Representación</th>
                        <th className="px-4 py-2.5 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {members.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-medium text-slate-900">
                            <div>{m.name}</div>
                            <div className="text-[10px] text-slate-400">{m.cargo}</div>
                          </td>
                          <td className="px-4 py-2">{m.cedula}</td>
                          <td className="px-4 py-2 font-semibold uppercase text-sky-700">
                            {m.rol}
                          </td>
                          <td className="px-4 py-2 capitalize">{m.representacion || 'N/A'}</td>
                          <td className="px-4 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => removeMemberFromDraft(m.worker_id)}
                              className="font-semibold text-rose-600 hover:text-rose-800"
                            >
                              Remover
                            </button>
                          </td>
                        </tr>
                      ))}
                      {members.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-4 text-center italic text-slate-500">
                            No se han añadido miembros a este comité.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Botones de Guardado / Cancelado */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitSubmitting}
                  className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 disabled:opacity-50"
                >
                  {submitSubmitting ? 'Guardando...' : 'Guardar Comité'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
