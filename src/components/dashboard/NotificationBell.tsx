// =========================================================
// NotificationBell — icono campana en el navbar (T-F15-004)
// =========================================================
// Server Component. Lee no-leídas del usuario actual via el
// admin client (la autorización ya quedó hecha en getUserWithRoles).
// Renderiza un <details> nativo con un badge de count y un dropdown
// simple. La interacción es 100% HTML — sin estado de cliente.
//
// Decisión técnica (R7):
//  - Usar <details>/<summary> (HTML nativo) evita un Client Component
//    completo. El dropdown abre/cierra sin React state. Para marcar
//    como leída se usa una Server Action (form action) — una request
//    completa por click, suficiente para F1.5.
//  - Si el count es 0 mostramos la campana sin badge (no escondemos
//    el icono — el usuario debe poder revisar igual).
// =========================================================

import { revalidatePath } from 'next/cache'
import { getNotificationService, type NotificationRow } from '@/lib/notifications/service'
import type { AuthenticatedUser } from '@/lib/auth/get-user-with-roles'

export default async function NotificationBell({ user }: { user: AuthenticatedUser }) {
  const svc = getNotificationService()
  const [unreadCount, recent] = await Promise.all([
    svc.countUnreadForUser(user.app_user_id),
    svc.listUnreadForUser(user.app_user_id, 10),
  ])

  return (
    <details className="relative">
      <summary
        className="flex cursor-pointer list-none items-center justify-center rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-700 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden"
        aria-label={`Notificaciones (${unreadCount} no leídas)`}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </summary>

      <div className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
        <div className="border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Notificaciones
        </div>
        {recent.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-slate-500">
            No tienes notificaciones nuevas.
          </div>
        ) : (
          <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
            {recent.map((n) => (
              <li key={n.id} className="px-4 py-3">
                <NotificationItem n={n} userId={user.app_user_id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  )
}

function NotificationItem({ n, userId }: { n: NotificationRow; userId: string }) {
  const title = formatTitle(n.template, n.payload)
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 h-2 w-2 flex-none rounded-full bg-sky-600" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-slate-900">{title}</div>
        <div className="mt-0.5 text-xs text-slate-500">
          {channelLabel(n.channel)} · {timeAgo(n.created_at)}
        </div>
        <form action={markReadAction} className="mt-1.5">
          <input type="hidden" name="notification_id" value={n.id} />
          <input type="hidden" name="user_id" value={userId} />
          <button type="submit" className="text-xs font-medium text-sky-700 hover:text-sky-900">
            Marcar como leída
          </button>
        </form>
      </div>
    </div>
  )
}

// ---------- Server Action ----------
async function markReadAction(formData: FormData): Promise<void> {
  'use server'
  const id = formData.get('notification_id')?.toString()
  const userId = formData.get('user_id')?.toString()
  if (!id || !userId) return
  await getNotificationService().markAsRead(id, userId)
  revalidatePath('/dashboard')
  revalidatePath('/regis/dashboard')
}

// ---------- helpers ----------
function formatTitle(template: string, payload: Record<string, unknown>): string {
  switch (template) {
    case 'welcome':
      return 'Bienvenido a Regis SG-SST'
    case 'score_alert': {
      const company = (payload.company_name as string | undefined) ?? 'Tu empresa'
      const newPct = (payload.new_pct as string | undefined) ?? '?'
      return `Cambio de cumplimiento — ${company} (${newPct}%)`
    }
    case 'pm_snapshot':
      return `PM snapshot — ${(payload.period as string | undefined) ?? 'periodo'}`
    default:
      return template
  }
}

function channelLabel(c: NotificationRow['channel']): string {
  return { in_app: 'In-app', email: 'Email', whatsapp: 'WhatsApp', sms: 'SMS' }[c]
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const seconds = Math.max(1, Math.floor((Date.now() - then) / 1000))
  if (seconds < 60) return `hace ${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `hace ${days}d`
}

function BellIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}
