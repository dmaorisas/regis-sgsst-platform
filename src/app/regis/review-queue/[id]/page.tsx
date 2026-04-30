// =========================================================
// /regis/review-queue/[id] — vista detalle de un item de la cola IA
// =========================================================

import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import Header from '@/components/dashboard/Header'
import ReviewItemDetail from '@/components/review-queue/ReviewItemDetail'

export const dynamic = 'force-dynamic'

export default async function ReviewItemPage({ params }: { params: { id: string } }) {
  const user = await getUserWithRoles()
  if (!user) redirect('/login')
  if (!user.isRegisStaff) redirect('/dashboard')

  const admin = getSupabaseAdminClient()
  const { data, error } = await admin
    .from('ai_outputs_pending_review')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header user={user} homeHref="/regis/dashboard" />
        <main className="mx-auto max-w-3xl px-4 py-8">
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
            <h2 className="text-lg font-semibold">Error</h2>
            <p className="mt-1 text-sm">{error.message}</p>
          </div>
        </main>
      </div>
    )
  }

  if (!data) notFound()

  return (
    <div className="min-h-screen bg-slate-50">
      <Header user={user} homeHref="/regis/dashboard" />
      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
        <Link href="/regis/review-queue" className="text-sm text-sky-700 hover:text-sky-900">
          ← Volver a la cola
        </Link>
        <ReviewItemDetail
          item={{
            id: data.id as string,
            module: data.module as string,
            task_id: (data.task_id as string | null) ?? null,
            request_id: (data.request_id as string | null) ?? null,
            ai_output: data.ai_output as unknown,
            confidence: data.confidence !== null ? Number(data.confidence) : null,
            reason_for_review: (data.reason_for_review as string | null) ?? null,
            status: data.status as 'pending' | 'approved' | 'rejected' | 'corrected',
            notes: (data.notes as string | null) ?? null,
            corrections: (data.corrections as unknown) ?? null,
            reviewed_at: (data.reviewed_at as string | null) ?? null,
            created_at: data.created_at as string,
          }}
        />
      </main>
    </div>
  )
}
