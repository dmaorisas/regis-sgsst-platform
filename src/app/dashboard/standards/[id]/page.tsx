// =========================================================
// /dashboard/standards/[id] — Drill-down de un estándar
// =========================================================
// Server Component. Muestra:
//   - Header
//   - Información del estándar (descripción, peso, ciclo)
//   - Estado actual de la evaluación para la empresa del usuario
//   - Documentos de evidencia asociados (si existen)
//   - Audit history (audit_log filtrado por entity_id)
// =========================================================

import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import Header from '@/components/dashboard/Header'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = {
  cumple: 'Cumple',
  no_cumple: 'No cumple',
  no_aplica: 'No aplica',
  pendiente: 'Pendiente',
}

const STATUS_STYLE: Record<string, string> = {
  cumple: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  no_cumple: 'bg-rose-50 text-rose-700 ring-rose-200',
  no_aplica: 'bg-slate-100 text-slate-600 ring-slate-200',
  pendiente: 'bg-amber-50 text-amber-700 ring-amber-200',
}

export default async function StandardDetailPage({ params }: { params: { id: string } }) {
  const user = await getUserWithRoles()
  if (!user) redirect('/login')

  const admin = getSupabaseAdminClient()

  // 1) Cargar el estándar.
  const { data: std, error: stdErr } = await admin
    .from('standards_0312')
    .select(
      'id, standard_number, name, description, cycle_phva, weight_capitulo_iii, applies_chapter_i, applies_chapter_ii, applies_chapter_iii, evidence_types, frequency_days, is_critical',
    )
    .eq('id', params.id)
    .single()

  if (stdErr || !std) notFound()

  // 2) Resolver companyId del usuario para mostrar su evaluación.
  // Para regis_admin tomamos la primera empresa del org (más simple).
  let targetCompanyId: string | null = user.companyIds[0] ?? null
  if (!targetCompanyId && user.isRegisStaff) {
    const orgId = user.roles[0]?.regis_org_id
    if (orgId) {
      const { data: firstCompany } = await admin
        .from('companies')
        .select('id')
        .eq('regis_org_id', orgId)
        .limit(1)
        .maybeSingle()
      targetCompanyId = (firstCompany?.id as string | undefined) ?? null
    }
  }

  let evalRow: {
    status: string
    justification: string | null
    evaluated_at: string | null
    centro: { nombre: string }
  } | null = null
  let auditEntries: Array<{ action: string; created_at: string; user_email: string | null }> = []

  if (targetCompanyId) {
    const { data: evalRows } = await admin
      .from('standard_evaluations')
      .select('id, status, justification, evaluated_at, centros_de_trabajo!inner(nombre)')
      .eq('company_id', targetCompanyId)
      .eq('standard_id', std.id)
      .is('deleted_at', null)
      .limit(1)
    if (evalRows && evalRows.length > 0) {
      const r = evalRows[0]!
      const centroRel = (
        r as unknown as {
          centros_de_trabajo: { nombre: string } | { nombre: string }[]
        }
      ).centros_de_trabajo
      const centro = Array.isArray(centroRel) ? centroRel[0]! : centroRel
      evalRow = {
        status: r.status as string,
        justification: (r.justification as string | null) ?? null,
        evaluated_at: (r.evaluated_at as string | null) ?? null,
        centro: { nombre: (centro?.nombre as string) ?? '—' },
      }

      // 3) Cargar audit_log de esa fila — opcional. Filtramos por
      // entity_type='standard_evaluations' + entity_id (esquema de la
      // migration 008). Si la lookup falla, lo manejamos silenciosamente.
      try {
        const { data: audit } = await admin
          .from('audit_log')
          .select('action, created_at, actor_id')
          .eq('entity_type', 'standard_evaluations')
          .eq('entity_id', r.id)
          .order('created_at', { ascending: false })
          .limit(20)
        if (audit && audit.length > 0) {
          // Resolver emails de los actores con un UPDATE en batch.
          const actorIds = Array.from(
            new Set(audit.map((a) => a.actor_id as string | null).filter(Boolean) as string[]),
          )
          const emailMap = new Map<string, string>()
          if (actorIds.length > 0) {
            const { data: users } = await admin.from('users').select('id, email').in('id', actorIds)
            for (const u of users ?? []) emailMap.set(u.id as string, u.email as string)
          }
          auditEntries = audit.map((a) => ({
            action: a.action as string,
            created_at: a.created_at as string,
            user_email: a.actor_id ? (emailMap.get(a.actor_id as string) ?? null) : null,
          }))
        }
      } catch (e) {
        console.warn('[standards/[id]] audit_log lookup failed', e)
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header user={user} homeHref={user.isRegisStaff ? '/regis/dashboard' : '/dashboard'} />
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
        <div>
          <Link
            href={user.isRegisStaff ? '/regis/dashboard' : '/dashboard'}
            className="text-xs text-sky-600 hover:underline"
          >
            ← Volver
          </Link>
          <h1 className="mt-1 font-mono text-2xl font-bold text-slate-900">
            Estándar {std.standard_number as string}
          </h1>
          <p className="mt-1 text-base text-slate-700">{std.name as string}</p>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Detalles del estándar
          </h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Ciclo PHVA" value={std.cycle_phva as string} />
            <Field label="Peso (Cap III)" value={`${Number(std.weight_capitulo_iii).toFixed(2)}`} />
            <Field label="Crítico" value={(std.is_critical as boolean | null) ? 'Sí' : 'No'} />
            <Field
              label="Frecuencia (días)"
              value={
                std.frequency_days !== null && std.frequency_days !== undefined
                  ? String(std.frequency_days)
                  : '—'
              }
            />
            <Field label="Aplica Cap I" value={(std.applies_chapter_i as boolean) ? 'Sí' : 'No'} />
            <Field
              label="Aplica Cap II"
              value={(std.applies_chapter_ii as boolean) ? 'Sí' : 'No'}
            />
            <Field
              label="Aplica Cap III"
              value={(std.applies_chapter_iii as boolean) ? 'Sí' : 'No'}
            />
            <Field
              label="Tipos de evidencia"
              value={
                Array.isArray(std.evidence_types) && std.evidence_types.length > 0
                  ? (std.evidence_types as string[]).join(', ')
                  : '—'
              }
            />
          </dl>

          {std.description && (
            <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {std.description as string}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Estado para tu empresa
          </h2>
          {evalRow ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLE[evalRow.status] ?? ''}`}
                >
                  {STATUS_LABEL[evalRow.status] ?? evalRow.status}
                </span>
                <span className="text-xs text-slate-500">
                  Evaluado en {evalRow.centro.nombre}
                  {evalRow.evaluated_at
                    ? ` · ${new Date(evalRow.evaluated_at).toLocaleDateString('es-CO')}`
                    : ''}
                </span>
              </div>
              {evalRow.justification && (
                <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {evalRow.justification}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Sin evaluación registrada para este estándar todavía.
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Histórico de cambios
          </h2>
          {auditEntries.length === 0 ? (
            <p className="text-sm text-slate-500">
              Aún no hay eventos auditados para esta evaluación.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {auditEntries.map((a, i) => (
                <li key={i} className="flex items-baseline justify-between py-2 text-sm">
                  <div>
                    <span className="font-medium text-slate-800">{a.action}</span>
                    {a.user_email && (
                      <span className="ml-2 text-xs text-slate-500">por {a.user_email}</span>
                    )}
                  </div>
                  <time className="text-xs text-slate-500">
                    {new Date(a.created_at).toLocaleString('es-CO')}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-800">{value}</dd>
    </div>
  )
}
