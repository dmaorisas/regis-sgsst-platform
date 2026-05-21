// =========================================================
// /regis/review-queue — Cola de revisión humana de outputs IA
// =========================================================
// Server Component. Muestra los items con status='pending' (capa 2
// anti-alucinación, ADR-006). Restringido a regis_admin /
// regis_consultant.
// =========================================================

import { redirect } from 'next/navigation'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import { getUserModuleMap } from '@/lib/auth/get-module-access'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import Header from '@/components/dashboard/Header'
import ReviewItemsList from '@/components/review-queue/ReviewItemsList'
import type { ReviewItemRow } from '@/components/review-queue/ReviewItemsList'

export const dynamic = 'force-dynamic'

export default async function ReviewQueuePage() {
  const user = await getUserWithRoles()
  if (!user) redirect('/login')
  if (!user.isRegisStaff) redirect('/dashboard')

  const moduleAccess = await getUserModuleMap(user)

  // Usamos admin client porque ya verificamos isRegisStaff arriba; nos
  // ahorramos las RLS policies en la query inicial. Las acciones de
  // approve/reject sí pasan por el cliente con sesión (server actions).
  const admin = getSupabaseAdminClient()
  const { data, error } = await admin
    .from('ai_outputs_pending_review')
    .select(
      'id, module, task_id, confidence, reason_for_review, status, created_at, company_id, regis_org_id',
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50)

  const items: ReviewItemRow[] = (data ?? []).map((r) => ({
    id: r.id as string,
    module: r.module as string,
    task_id: (r.task_id as string | null) ?? null,
    confidence: r.confidence !== null ? Number(r.confidence) : null,
    reason_for_review: (r.reason_for_review as string | null) ?? null,
    status: r.status as 'pending',
    created_at: r.created_at as string,
    company_id: (r.company_id as string | null) ?? null,
  }))

  return (
    <div className="min-h-screen bg-slate-50">
      <Header user={user} homeHref="/regis/dashboard" moduleAccess={moduleAccess} />
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Cola de revisión IA</h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Outputs de los agentes IA con baja confianza o módulo crítico que requieren revisión
            humana antes de persistirse.
          </p>
        </div>
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
            <h2 className="text-lg font-semibold">Error al cargar la cola</h2>
            <p className="mt-1 text-sm">{error.message}</p>
          </div>
        ) : (
          <ReviewItemsList items={items} />
        )}
      </main>
    </div>
  )
}
