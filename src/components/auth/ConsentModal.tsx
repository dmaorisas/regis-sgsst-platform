'use client'

// =========================================================
// ConsentModal — Habeas Data (Ley 1581/2012, Decreto 1377/2013)
// =========================================================
// Tarea: T-F15-007
// Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/27
//
// Aparece la primera vez que un usuario se loguea (router lo monta
// desde /auth/consent cuando el helper checkConsentsForCurrentUser
// reporta blocksLogin=true).
//
// Estructura visual:
//   - Encabezado con marco normativo
//   - Resumen del aviso de privacidad (link a /legal/privacy)
//   - 5 checkboxes (general obligatorio, sensible obligatorio para
//     workers, los demás opcionales)
//   - Botones: "Aceptar" (POST /api/consent/accept) / "Rechazar y
//     salir" (POST /api/auth/signout)
// =========================================================

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type ConsentKey = 'general' | 'sensible' | 'canales' | 'internacional' | 'ia'

const CONSENT_LABELS: Record<
  ConsentKey,
  { title: string; description: string; required: boolean | 'worker_only' }
> = {
  general: {
    title: 'Tratamiento general de datos personales',
    description:
      'Autorizo el tratamiento de mis datos personales conforme a la Ley 1581 de 2012 y el aviso de privacidad publicado.',
    required: true,
  },
  sensible: {
    title: 'Datos sensibles — salud ocupacional',
    description:
      'Autorizo el tratamiento de datos de salud ocupacional (Resolución 2346/2007) para el cumplimiento del SG-SST. Obligatorio para trabajadores.',
    required: 'worker_only',
  },
  canales: {
    title: 'Canales de comunicación',
    description:
      'Acepto recibir notificaciones por correo electrónico, WhatsApp y/o SMS para asuntos del sistema y avisos legales.',
    required: false,
  },
  internacional: {
    title: 'Transferencia internacional',
    description:
      'Reconozco que mis datos pueden almacenarse en servidores en Estados Unidos (Supabase Inc.) bajo cláusulas estándar de protección.',
    required: false,
  },
  ia: {
    title: 'Tratamiento por inteligencia artificial',
    description:
      'Autorizo el procesamiento de mi información mediante sistemas de IA para extracción y análisis de cumplimiento.',
    required: false,
  },
}

export default function ConsentModal({ isWorker }: { isWorker: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [values, setValues] = useState<Record<ConsentKey, boolean>>({
    general: false,
    sensible: false,
    canales: false,
    internacional: false,
    ia: false,
  })

  const generalOk = values.general
  const sensibleOk = isWorker ? values.sensible : true
  const canSubmit = generalOk && sensibleOk

  async function onAccept() {
    setError(null)
    if (!canSubmit) return
    const res = await fetch('/api/consent/accept', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      setError(data?.error ?? 'no_se_pudo_registrar')
      return
    }
    startTransition(() => {
      router.replace('/dashboard')
      router.refresh()
    })
  }

  async function onReject() {
    // Cierra sesión: el endpoint redirige a /login.
    window.location.href = '/api/auth/signout'
  }

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
      <h2 className="text-xl font-bold text-slate-900">Habeas Data — Ley 1581 de 2012</h2>
      <p className="mt-2 text-sm text-slate-600">
        Para continuar usando la plataforma, necesitamos tu autorización para el tratamiento de
        datos personales. Lee con atención y selecciona cada casilla aplicable.
      </p>
      <p className="mt-2 text-sm text-slate-600">
        Texto completo:{' '}
        <a className="font-medium text-sky-700 underline" href="/legal/privacy" target="_blank">
          aviso de privacidad
        </a>{' '}
        ·{' '}
        <a
          className="font-medium text-sky-700 underline"
          href="/legal/authorization"
          target="_blank"
        >
          autorización de tratamiento
        </a>
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {(Object.keys(CONSENT_LABELS) as ConsentKey[]).map((key) => {
          const meta = CONSENT_LABELS[key]
          const isMandatory =
            meta.required === true || (meta.required === 'worker_only' && isWorker)
          return (
            <label
              key={key}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 hover:border-sky-300"
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                checked={values[key]}
                onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.checked }))}
              />
              <div className="flex-1 text-sm">
                <div className="font-medium text-slate-900">
                  {meta.title}
                  {isMandatory && (
                    <span className="ml-2 inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">
                      Obligatorio
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-slate-600">{meta.description}</p>
              </div>
            </label>
          )
        })}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onReject}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Rechazar y salir
        </button>
        <button
          type="button"
          onClick={onAccept}
          disabled={!canSubmit || pending}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {pending ? 'Registrando…' : 'Aceptar'}
        </button>
      </div>
    </div>
  )
}
