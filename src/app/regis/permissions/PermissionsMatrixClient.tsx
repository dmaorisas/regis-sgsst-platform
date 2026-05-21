// ============================================================
// PROTECTED FILE — Do NOT modify without explicit user approval.
// Module: Permissions (Role-based access control configuration)
// See: memory/protection_permissions_module.md
// ============================================================

'use client'

import { useState, useCallback } from 'react'
import { MODULE_REGISTRY, type AccessLevel, type ModuleKey } from '@/lib/auth/permissions-config'
import type { RoleName } from '@/lib/auth/get-user-with-roles'

type Matrix = Record<RoleName, Record<ModuleKey, AccessLevel>>

const ROLE_ORDER: { key: RoleName; label: string }[] = [
  { key: 'regis_admin', label: 'Admin Regis' },
  { key: 'regis_consultant', label: 'Consultor' },
  { key: 'client_admin', label: 'Admin Empresa' },
  { key: 'worker', label: 'Trabajador' },
]

const ACCESS_OPTIONS: { value: AccessLevel; label: string; color: string }[] = [
  { value: 'full', label: 'Completo', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { value: 'view', label: 'Solo ver', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { value: 'none', label: 'Sin acceso', color: 'bg-slate-100 text-slate-500 border-slate-300' },
]

function nextLevel(current: AccessLevel): AccessLevel {
  if (current === 'full') return 'view'
  if (current === 'view') return 'none'
  return 'full'
}

function getLevelStyle(level: AccessLevel): string {
  return ACCESS_OPTIONS.find((o) => o.value === level)?.color ?? ''
}

function getLevelLabel(level: AccessLevel): string {
  return ACCESS_OPTIONS.find((o) => o.value === level)?.label ?? level
}

export default function PermissionsMatrixClient({ initialMatrix }: { initialMatrix: Matrix }) {
  const [matrix, setMatrix] = useState<Matrix>(initialMatrix)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = useCallback((role: RoleName, mod: ModuleKey) => {
    setMatrix((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [mod]: nextLevel(prev[role][mod]),
      },
    }))
    setSaved(false)
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)
    setSaved(false)

    const permissions: Array<{
      role_name: string
      module_key: string
      access_level: string
    }> = []

    for (const role of ROLE_ORDER) {
      for (const mod of MODULE_REGISTRY) {
        permissions.push({
          role_name: role.key,
          module_key: mod.key,
          access_level: matrix[role.key][mod.key],
        })
      }
    }

    try {
      const res = await fetch('/api/regis/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Error al guardar')
        return
      }

      setSaved(true)
    } catch {
      setError('Error de conexion')
    } finally {
      setSaving(false)
    }
  }, [matrix])

  const empresaModules = MODULE_REGISTRY.filter((m) => m.group === 'empresa')
  const regisModules = MODULE_REGISTRY.filter((m) => m.group === 'regis')

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Modulos de empresa</h2>
          <p className="text-xs text-slate-500">
            Acceso a los modulos dentro del dashboard de cada empresa
          </p>
        </div>
        <ModuleTable modules={empresaModules} matrix={matrix} onToggle={toggle} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Modulos de administracion Regis</h2>
          <p className="text-xs text-slate-500">
            Acceso a la cartera, cola de revision y gestion de empresas/usuarios
          </p>
        </div>
        <ModuleTable modules={regisModules} matrix={matrix} onToggle={toggle} />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        {saved && (
          <span className="text-sm font-medium text-emerald-600">
            Permisos guardados correctamente
          </span>
        )}
        {error && <span className="text-sm font-medium text-rose-600">{error}</span>}
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <h3 className="text-xs font-semibold text-slate-700">Leyenda</h3>
        <div className="mt-2 flex flex-wrap gap-3">
          {ACCESS_OPTIONS.map((opt) => (
            <span
              key={opt.value}
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${opt.color}`}
            >
              {opt.label}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Haz clic en cualquier celda para cambiar el nivel de acceso. &quot;Solo ver&quot; permite
          visualizar pero no editar, crear ni eliminar.
        </p>
      </div>
    </div>
  )
}

function ModuleTable({
  modules,
  matrix,
  onToggle,
}: {
  modules: typeof MODULE_REGISTRY
  matrix: Matrix
  onToggle: (role: RoleName, mod: ModuleKey) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Modulo</th>
            {ROLE_ORDER.map((role) => (
              <th
                key={role.key}
                className="px-3 py-2 text-center text-xs font-medium text-slate-600"
              >
                {role.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {modules.map((mod) => (
            <tr key={mod.key} className="border-b border-slate-50 hover:bg-slate-50/50">
              <td className="px-4 py-2 font-medium text-slate-900">{mod.label}</td>
              {ROLE_ORDER.map((role) => {
                const level = matrix[role.key][mod.key]
                return (
                  <td key={role.key} className="px-3 py-2 text-center">
                    <button
                      onClick={() => onToggle(role.key, mod.key)}
                      className={`inline-flex min-w-[80px] items-center justify-center rounded-md border px-2 py-1 text-xs font-medium transition hover:opacity-80 ${getLevelStyle(level)}`}
                    >
                      {getLevelLabel(level)}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
