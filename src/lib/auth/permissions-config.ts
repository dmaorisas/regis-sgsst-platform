// ============================================================
// PROTECTED FILE — Do NOT modify without explicit user approval.
// Module: Permissions (Role-based access control configuration)
// See: memory/protection_permissions_module.md
// ============================================================

import type { RoleName } from './get-user-with-roles'

export type AccessLevel = 'none' | 'view' | 'full'

export type ModuleKey =
  | 'dashboard'
  | 'medical'
  | 'matrices'
  | 'actas'
  | 'emergencies'
  | 'inventory'
  | 'documents'
  | 'monthly_logs'
  | 'portfolio'
  | 'review_queue'
  | 'companies'
  | 'users'

export type ModuleMeta = {
  key: ModuleKey
  label: string
  href: string
  group: 'empresa' | 'regis'
}

export const MODULE_REGISTRY: ModuleMeta[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard', group: 'empresa' },
  { key: 'medical', label: 'Medico', href: '/dashboard/medical', group: 'empresa' },
  { key: 'matrices', label: 'Matrices GTC-45', href: '/dashboard/matrices', group: 'empresa' },
  { key: 'actas', label: 'Actas', href: '/dashboard/actas', group: 'empresa' },
  {
    key: 'emergencies',
    label: 'Plan Emergencias',
    href: '/dashboard/emergencies',
    group: 'empresa',
  },
  {
    key: 'inventory',
    label: 'Inventario',
    href: '/dashboard/emergencies/inventory',
    group: 'empresa',
  },
  { key: 'documents', label: 'Documentos', href: '/dashboard/documents', group: 'empresa' },
  { key: 'monthly_logs', label: 'Bitacora', href: '/dashboard/monthly-logs', group: 'empresa' },
  { key: 'portfolio', label: 'Cartera', href: '/regis/dashboard', group: 'regis' },
  { key: 'review_queue', label: 'Cola de revision', href: '/regis/review-queue', group: 'regis' },
  { key: 'companies', label: 'Empresas', href: '/regis/companies', group: 'regis' },
  { key: 'users', label: 'Usuarios', href: '/regis/users', group: 'regis' },
]

export const ALL_MODULE_KEYS: ModuleKey[] = MODULE_REGISTRY.map((m) => m.key)

export const DEFAULT_PERMISSIONS: Record<RoleName, Record<ModuleKey, AccessLevel>> = {
  regis_admin: {
    dashboard: 'full',
    medical: 'full',
    matrices: 'full',
    actas: 'full',
    emergencies: 'full',
    inventory: 'full',
    documents: 'full',
    monthly_logs: 'full',
    portfolio: 'full',
    review_queue: 'full',
    companies: 'full',
    users: 'full',
  },
  regis_consultant: {
    dashboard: 'full',
    medical: 'full',
    matrices: 'full',
    actas: 'full',
    emergencies: 'full',
    inventory: 'full',
    documents: 'full',
    monthly_logs: 'full',
    portfolio: 'view',
    review_queue: 'full',
    companies: 'none',
    users: 'none',
  },
  client_admin: {
    dashboard: 'full',
    medical: 'full',
    matrices: 'full',
    actas: 'full',
    emergencies: 'full',
    inventory: 'full',
    documents: 'full',
    monthly_logs: 'full',
    portfolio: 'none',
    review_queue: 'none',
    companies: 'none',
    users: 'none',
  },
  worker: {
    dashboard: 'view',
    medical: 'none',
    matrices: 'none',
    actas: 'none',
    emergencies: 'none',
    inventory: 'none',
    documents: 'view',
    monthly_logs: 'none',
    portfolio: 'none',
    review_queue: 'none',
    companies: 'none',
    users: 'none',
  },
}

export function getModuleMeta(key: ModuleKey): ModuleMeta | undefined {
  return MODULE_REGISTRY.find((m) => m.key === key)
}

const MODULES_BY_PATH_LENGTH = [...MODULE_REGISTRY].sort((a, b) => b.href.length - a.href.length)

export function moduleKeyFromPath(pathname: string): ModuleKey | null {
  for (const mod of MODULES_BY_PATH_LENGTH) {
    if (pathname === mod.href || pathname.startsWith(mod.href + '/')) {
      return mod.key
    }
  }
  return null
}
