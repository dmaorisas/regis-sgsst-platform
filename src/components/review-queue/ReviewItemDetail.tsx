'use client'

// =========================================================
// ReviewItemDetail — vista detalle + acciones approve/reject/correct
// =========================================================
// Client Component porque necesita estado para el textarea de notas y
// el modal de corrección. Las mutaciones se hacen vía server actions
// importadas de '../actions'.
// =========================================================

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveItem, rejectItem, correctItem } from '@/app/regis/review-queue/actions'

type Status = 'pending' | 'approved' | 'rejected' | 'corrected'

export type ReviewItem = {
  id: string
  module: string
  task_id: string | null
  request_id: string | null
  ai_output: unknown
  confidence: number | null
  reason_for_review: string | null
  status: Status
  notes: string | null
  corrections: unknown
  reviewed_at: string | null
  created_at: string
}

const STATUS_BADGE: Record<Status, string> = {
  pending: 'bg-amber-50 text-amber-800 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
  corrected: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
}

const STATUS_LABEL: Record<Status, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  corrected: 'Corregido',
}

export default function ReviewItemDetail({ item }: { item: ReviewItem }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [notes, setNotes] = useState('')
  const [corrections, setCorrections] = useState(JSON.stringify(item.ai_output ?? {}, null, 2))
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'idle' | 'rejecting' | 'correcting'>('idle')

  const isReadOnly = item.status !== 'pending'

  const handle = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>) => {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (!res.ok) {
        setError(res.error)
      } else {
        router.push('/regis/review-queue')
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-bold text-slate-900">{item.module}</h1>
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_BADGE[item.status]}`}
          >
            {STATUS_LABEL[item.status]}
          </span>
          {item.confidence !== null && (
            <span className="text-xs text-slate-500">
              Confianza: <strong>{(item.confidence * 100).toFixed(0)}%</strong>
            </span>
          )}
        </div>

        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Tarea</dt>
            <dd className="text-slate-900">{item.task_id ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Razón de revisión</dt>
            <dd className="text-slate-900">{item.reason_for_review ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Request ID</dt>
            <dd className="font-mono text-xs text-slate-700">{item.request_id ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Creado</dt>
            <dd className="text-slate-900">{new Date(item.created_at).toLocaleString('es-CO')}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Output del modelo</h2>
        <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900">
          {JSON.stringify(item.ai_output, null, 2)}
        </pre>
      </div>

      {item.notes && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Notas del revisor</h2>
          <p className="text-sm text-slate-900">{item.notes}</p>
        </div>
      )}

      {item.corrections !== null && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Correcciones aplicadas</h2>
          <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900">
            {JSON.stringify(item.corrections, null, 2)}
          </pre>
        </div>
      )}

      {!isReadOnly && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Acción</h2>

          {error && (
            <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              {error}
            </div>
          )}

          {mode === 'idle' && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handle(() => approveItem(item.id))}
                disabled={isPending}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Aprobar
              </button>
              <button
                type="button"
                onClick={() => setMode('correcting')}
                disabled={isPending}
                className="rounded-lg border border-indigo-600 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
              >
                Corregir y aprobar
              </button>
              <button
                type="button"
                onClick={() => setMode('rejecting')}
                disabled={isPending}
                className="rounded-lg border border-rose-600 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
              >
                Rechazar
              </button>
            </div>
          )}

          {mode === 'rejecting' && (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-700">
                Notas (obligatorio)
              </label>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Por qué se rechaza este output…"
                className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handle(() => rejectItem(item.id, notes))}
                  disabled={isPending}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  Confirmar rechazo
                </button>
                <button
                  type="button"
                  onClick={() => setMode('idle')}
                  disabled={isPending}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {mode === 'correcting' && (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-700">
                JSON corregido (debe ser válido)
              </label>
              <textarea
                rows={10}
                value={corrections}
                onChange={(e) => setCorrections(e.target.value)}
                spellCheck={false}
                className="w-full rounded-lg border border-slate-300 p-2 font-mono text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <label className="block text-xs font-medium text-slate-700">Notas (opcional)</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handle(() => correctItem(item.id, corrections, notes))}
                  disabled={isPending}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  Guardar corrección
                </button>
                <button
                  type="button"
                  onClick={() => setMode('idle')}
                  disabled={isPending}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isReadOnly && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Este item ya fue revisado{' '}
          {item.reviewed_at ? `el ${new Date(item.reviewed_at).toLocaleString('es-CO')}` : ''}.
        </div>
      )}
    </div>
  )
}
