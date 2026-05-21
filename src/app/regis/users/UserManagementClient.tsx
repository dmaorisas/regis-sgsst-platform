'use client'

import { useState, useEffect } from 'react'

interface Company {
  id: string
  razon_social: string
  nit: string
}

interface UserRoleAssignment {
  assignment_id: string
  role_id: string
  nombre: string
  descripcion: string
  company_id: string | null
  company_name: string | null
  is_active: boolean
}

interface User {
  id: string
  email: string
  nombre_completo: string
  is_active: boolean
  roles: UserRoleAssignment[]
}

interface UserManagementClientProps {
  companies: Company[]
  currentUser: { app_user_id: string }
}

const ROLE_LABEL: Record<string, string> = {
  regis_admin: 'Administrador Regis',
  regis_consultant: 'Consultor Regis',
  client_admin: 'Administrador Empresa',
  worker: 'Trabajador',
}

const ROLE_COLORS: Record<string, string> = {
  regis_admin: 'bg-purple-50 text-purple-700 border-purple-200',
  regis_consultant: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  client_admin: 'bg-sky-50 text-sky-700 border-sky-200',
  worker: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

export default function UserManagementClient({
  companies,
  currentUser,
}: UserManagementClientProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  // Modales
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Éxito de Creación (Alerta de Contraseña Temporal)
  const [createdUserInfo, setCreatedUserInfo] = useState<{
    email: string
    nombre_completo: string
    temp_password: string
  } | null>(null)

  // Estados Formulario Creación
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('regis_consultant')
  const [newCompanyIds, setNewCompanyIds] = useState<string[]>([])
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Estados Formulario Edición
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editCompanyIds, setEditCompanyIds] = useState<string[]>([])
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/regis/users')
      if (!res.ok) throw new Error('Error al cargar la lista de usuarios')
      const data = await res.json()
      setUsers(data)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  // Creación de usuario
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setCreateSubmitting(true)
      setCreateError(null)
      const res = await fetch('/api/regis/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          nombre_completo: newName,
          role_name: newRole,
          company_ids: newCompanyIds,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear el usuario')

      // Mostrar el modal de éxito con la contraseña
      setCreatedUserInfo({
        email: newEmail,
        nombre_completo: newName,
        temp_password: data.temp_password,
      })

      // Limpiar formulario y cerrar modal de creación
      setNewEmail('')
      setNewName('')
      setNewRole('regis_consultant')
      setNewCompanyIds([])
      setIsCreateOpen(false)

      // Recargar lista
      fetchUsers()
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : String(err))
    } finally {
      setCreateSubmitting(false)
    }
  }

  // Edición de usuario
  const openEditModal = (user: User) => {
    setSelectedUser(user)
    setEditName(user.nombre_completo)

    // Obtener rol y empresas actuales
    const primaryAssignment = user.roles[0]
    setEditRole(primaryAssignment?.nombre || 'regis_consultant')

    const currentCompanyIds = user.roles
      .filter((r) => r.company_id !== null)
      .map((r) => r.company_id as string)
    setEditCompanyIds(currentCompanyIds)

    setEditError(null)
    setIsEditOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    try {
      setEditSubmitting(true)
      setEditError(null)
      const res = await fetch(`/api/regis/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_completo: editName,
          role_name: editRole,
          company_ids: editCompanyIds,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar los cambios')

      setIsEditOpen(false)
      fetchUsers()
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : String(err))
    } finally {
      setEditSubmitting(false)
    }
  }

  // Activar / Desactivar
  const toggleUserStatus = async (user: User) => {
    const newStatus = !user.is_active
    const confirmMsg = newStatus
      ? `¿Deseas activar el acceso de ${user.nombre_completo}?`
      : `¿Deseas desactivar el acceso de ${user.nombre_completo}? Se revocarán todas sus asignaciones activas.`

    if (!confirm(confirmMsg)) return

    try {
      const res = await fetch(`/api/regis/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al cambiar estado del usuario')
      }

      fetchUsers()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err))
    }
  }

  // Manejo de empresas en checkboxes
  const handleCompanyToggle = (companyId: string, isEdit: boolean) => {
    if (isEdit) {
      if (editRole === 'regis_consultant') {
        // Multi-select
        setEditCompanyIds((prev) =>
          prev.includes(companyId) ? prev.filter((id) => id !== companyId) : [...prev, companyId],
        )
      } else {
        // Single select (client_admin o worker)
        setEditCompanyIds([companyId])
      }
    } else {
      if (newRole === 'regis_consultant') {
        // Multi-select
        setNewCompanyIds((prev) =>
          prev.includes(companyId) ? prev.filter((id) => id !== companyId) : [...prev, companyId],
        )
      } else {
        // Single select
        setNewCompanyIds([companyId])
      }
    }
  }

  // Filtrado de usuarios en frontend
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())

    const primaryRole = user.roles[0]?.nombre || 'worker'
    const matchesRole = roleFilter === 'all' || primaryRole === roleFilter

    return matchesSearch && matchesRole
  })

  // Obtener iniciales para avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  return (
    <div className="space-y-6">
      {/* Sección Filtros y Botón Crear */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <svg
                className="h-5 w-5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">Todos los roles</option>
              <option value="regis_admin">Administradores Regis</option>
              <option value="regis_consultant">Consultores Regis</option>
              <option value="client_admin">Administradores Empresa</option>
              <option value="worker">Trabajadores</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          <svg className="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          Nuevo Usuario
        </button>
      </div>

      {/* Alerta de Contraseña Temporal al crear exitosamente */}
      {createdUserInfo && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-base font-semibold text-emerald-900">
                ¡Usuario creado con éxito!
              </h3>
              <p className="mt-2 text-sm text-emerald-700">
                El usuario ha sido registrado en el sistema. Comparte estas credenciales de acceso
                con él/ella:
              </p>
              <div className="mt-4 space-y-1 rounded-lg border border-emerald-100 bg-white p-4 font-mono text-sm text-slate-800 shadow-inner">
                <div>
                  <span className="font-semibold text-slate-900">Nombre:</span>{' '}
                  {createdUserInfo.nombre_completo}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Usuario / Email:</span>{' '}
                  {createdUserInfo.email}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">Contraseña temporal:</span>
                  <span className="select-all rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-bold text-sky-700">
                    {createdUserInfo.temp_password}
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setCreatedUserInfo(null)}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2"
                >
                  Entendido / Cerrar Alerta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de Usuarios */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-white">
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
              Cargando lista de usuarios...
            </span>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
          <h2 className="text-lg font-semibold">Error</h2>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-6 text-center">
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
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-semibold text-slate-900">No se encontraron usuarios</h3>
          <p className="mt-1 text-sm text-slate-500">
            Prueba ajustando el término de búsqueda o filtros.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th scope="col" className="px-6 py-4">
                    Usuario
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Rol
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Cartera de Empresas
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Estado
                  </th>
                  <th scope="col" className="px-6 py-4 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredUsers.map((user) => {
                  const primaryAssignment = user.roles[0]
                  const roleName = primaryAssignment?.nombre || 'worker'
                  const assignedCompanies = user.roles
                    .filter((r) => r.company_id !== null && r.is_active)
                    .map((r) => r.company_name)

                  return (
                    <tr key={user.id} className="transition hover:bg-slate-50/50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-bold text-slate-700">
                            {getInitials(user.nombre_completo)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">
                              {user.nombre_completo}
                            </div>
                            <div className="text-xs text-slate-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium shadow-sm ${ROLE_COLORS[roleName] || 'bg-slate-100 text-slate-800'}`}
                        >
                          {ROLE_LABEL[roleName] || roleName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {roleName === 'regis_admin' ? (
                          <span className="text-xs italic text-slate-500">
                            Acceso Total a la Org
                          </span>
                        ) : assignedCompanies.length > 0 ? (
                          <div className="flex max-w-md flex-wrap gap-1.5">
                            {assignedCompanies.map((cName, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800"
                              >
                                {cName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-rose-500">
                            ⚠️ Sin empresas asignadas
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${user.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}
                        >
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Editar
                          </button>
                          {currentUser.app_user_id !== user.id && (
                            <button
                              onClick={() => toggleUserStatus(user)}
                              className={`inline-flex items-center rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${user.is_active ? 'border-rose-200 text-rose-700 hover:bg-rose-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}
                            >
                              {user.is_active ? 'Desactivar' : 'Activar'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Creación */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Crear Nuevo Usuario</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
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

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {createError && (
                <div className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-xs text-rose-700">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Carolina Gomez"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  placeholder="Ej. carolina@consultora.com"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Rol Principal</label>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none"
                  value={newRole}
                  onChange={(e) => {
                    setNewRole(e.target.value)
                    setNewCompanyIds([]) // Reiniciar asignaciones
                  }}
                >
                  <option value="regis_consultant">Consultor Regis (Cartera específica)</option>
                  <option value="client_admin">Administrador de Empresa Cliente</option>
                  <option value="worker">Trabajador de Empresa Cliente</option>
                  <option value="regis_admin">Administrador Regis (Acceso total)</option>
                </select>
              </div>

              {/* Asignación de Empresas según Rol */}
              {newRole !== 'regis_admin' && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    {newRole === 'regis_consultant'
                      ? 'Asignar Empresas a Cartera (Múltiple)'
                      : 'Asignar Empresa (Única)'}
                  </span>

                  {companies.length === 0 ? (
                    <p className="text-xs italic text-slate-500">
                      No hay empresas creadas en la organización.
                    </p>
                  ) : (
                    <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-3 shadow-inner">
                      {companies.map((comp) => (
                        <label
                          key={comp.id}
                          className="flex cursor-pointer items-start gap-2.5 rounded p-1 text-xs text-slate-800 hover:bg-slate-100"
                        >
                          <input
                            type={newRole === 'regis_consultant' ? 'checkbox' : 'radio'}
                            name="new_company_selection"
                            checked={newCompanyIds.includes(comp.id)}
                            onChange={() => handleCompanyToggle(comp.id, false)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                          />
                          <div>
                            <span className="font-semibold text-slate-900">
                              {comp.razon_social}
                            </span>
                            <span className="block text-slate-500">NIT: {comp.nit}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 disabled:opacity-50"
                >
                  {createSubmitting ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edición */}
      {isEditOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Editar Usuario y Cartera</h3>
              <button
                onClick={() => setIsEditOpen(false)}
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

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {editError && (
                <div className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-xs text-rose-700">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Correo (No modificable)
                </label>
                <input
                  type="email"
                  disabled
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 shadow-inner focus:outline-none"
                  value={selectedUser.email}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Rol Principal</label>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none"
                  value={editRole}
                  onChange={(e) => {
                    setEditRole(e.target.value)
                    setEditCompanyIds([]) // Reiniciar asignaciones
                  }}
                >
                  <option value="regis_consultant">Consultor Regis (Cartera específica)</option>
                  <option value="client_admin">Administrador de Empresa Cliente</option>
                  <option value="worker">Trabajador de Empresa Cliente</option>
                  <option value="regis_admin">Administrador Regis (Acceso total)</option>
                </select>
              </div>

              {/* Asignación de Empresas según Rol */}
              {editRole !== 'regis_admin' && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    {editRole === 'regis_consultant'
                      ? 'Gestionar Empresas en Cartera (Múltiple)'
                      : 'Asignar Empresa (Única)'}
                  </span>

                  {companies.length === 0 ? (
                    <p className="text-xs italic text-slate-500">No hay empresas creadas.</p>
                  ) : (
                    <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-3 shadow-inner">
                      {companies.map((comp) => (
                        <label
                          key={comp.id}
                          className="flex cursor-pointer items-start gap-2.5 rounded p-1 text-xs text-slate-800 hover:bg-slate-100"
                        >
                          <input
                            type={editRole === 'regis_consultant' ? 'checkbox' : 'radio'}
                            name="edit_company_selection"
                            checked={editCompanyIds.includes(comp.id)}
                            onChange={() => handleCompanyToggle(comp.id, true)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                          />
                          <div>
                            <span className="font-semibold text-slate-900">
                              {comp.razon_social}
                            </span>
                            <span className="block text-slate-500">NIT: {comp.nit}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 disabled:opacity-50"
                >
                  {editSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
