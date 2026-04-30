'use client'

// =========================================================
// ArcoForm — formulario público (Client Component)
// =========================================================
// Tarea: T-F15-008
// =========================================================

import { useState } from 'react'

const TIPO_OPTIONS = [
  { value: 'acceso', label: 'Acceso — quiero saber qué datos míos tienen' },
  { value: 'rectificacion', label: 'Rectificación — corregir un dato incorrecto' },
  { value: 'cancelacion', label: 'Cancelación — eliminar mis datos' },
  { value: 'oposicion', label: 'Oposición — oponerme a un uso específico' },
  { value: 'revocacion', label: 'Revocación — retirar autorización previa' },
] as const

type Tipo = (typeof TIPO_OPTIONS)[number]['value']

export default function ArcoForm() {
  const [tipo, setTipo] = useState<Tipo>('acceso')
  const [email, setEmail] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{
    request_id: string
    sla_deadline: string
    message: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/legal/arco', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tipo, email: email.trim(), descripcion: descripcion.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError((data?.error as string | undefined) ?? 'no_se_pudo_registrar')
        return
      }
      setResult({
        request_id: data.request_id,
        sla_deadline: data.sla_deadline,
        message: data.message,
      })
    } catch {
      setError('network_error')
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <div className="text-sm">
        <h2 className="text-lg font-semibold text-slate-900">Solicitud recibida</h2>
        <p className="mt-2 text-slate-700">{result.message}</p>
        <dl className="mt-4 space-y-1 text-slate-600">
          <div>
            <dt className="inline font-medium text-slate-700">ID: </dt>
            <dd className="inline font-mono text-xs">{result.request_id}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-slate-700">Plazo legal: </dt>
            <dd className="inline">{result.sla_deadline}</dd>
          </div>
        </dl>
      </div>
    )
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700">Tipo de solicitud</span>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as Tipo)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
        >
          {TIPO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700">Correo del solicitante</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
          placeholder="tu@correo.com"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700">Descripción de la solicitud</span>
        <textarea
          required
          minLength={10}
          rows={5}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
          placeholder="Describe brevemente tu solicitud (mínimo 10 caracteres)…"
        />
      </label>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {submitting ? 'Enviando…' : 'Enviar solicitud'}
      </button>
      <p className="text-xs text-slate-500">
        Tus datos se almacenan únicamente para responder esta solicitud, conforme a la Ley 1581 de
        2012.
      </p>
    </form>
  )
}
