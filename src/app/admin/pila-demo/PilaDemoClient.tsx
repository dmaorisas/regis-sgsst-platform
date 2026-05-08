'use client'

import { useState } from 'react'

export default function PilaDemoClient({
  companies,
}: {
  companies: { id: string; razon_social: string; nit: string }[]
}) {
  const [companyId, setCompanyId] = useState(companies[0]?.id || '')
  const [isSimulating, setIsSimulating] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSimulateEmail = async () => {
    setIsSimulating(true)
    setResult(null)
    setError(null)

    try {
      // Create a dummy PDF blob to simulate the attachment
      const pdfContent =
        '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources <<>> /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 54 >>\nstream\nBT\n/F1 12 Tf\n72 712 Td\n(Planilla PILA Simulada - Pago Seguridad Social) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000213 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n316\n%%EOF'
      const blob = new Blob([pdfContent], { type: 'application/pdf' })
      const file = new File([blob], 'PILA_Mayo_2026.pdf', { type: 'application/pdf' })

      const formData = new FormData()
      formData.append('company_id', companyId)
      formData.append('file', file)

      const response = await fetch('/api/webhooks/pila-received', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar el Webhook')
      }

      setResult(`Éxito: ${data.message}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error interno')
    } finally {
      setIsSimulating(false)
    }
  }

  return (
    <div className="space-y-6 rounded-lg border bg-white p-6 shadow-sm">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Empresa Cliente (Simular envío desde)
          </label>
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.razon_social} (NIT: {c.nit})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSimulateEmail}
          disabled={isSimulating}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-4 text-lg font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSimulating ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Recibiendo correo y subiendo al sistema...
            </>
          ) : (
            '📥 Simular Recepción de Correo de Cliente con PILA'
          )}
        </button>

        {result && (
          <div className="rounded-md border border-green-200 bg-green-50 p-4 text-green-700">
            <strong>✅ Operación exitosa:</strong> {result}
            <p className="mt-2 text-sm">
              El archivo fue subido al bucket y el Estándar 1.2.1 ha cambiado a &quot;Cumple&quot;.
              Revisa el Dashboard de esta empresa para ver el cambio de puntaje.
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>
    </div>
  )
}
