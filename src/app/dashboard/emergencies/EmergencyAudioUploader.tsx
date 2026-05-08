'use client'

import { useState, useCallback } from 'react'

export default function EmergencyAudioUploader({ companyId }: { companyId: string }) {
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const [transcript, setTranscript] = useState<string | null>(null)
  const [plan, setPlan] = useState<string | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.includes('audio')) {
      setFile(droppedFile)
      setError(null)
    } else {
      setError('Por favor, sube un archivo de audio válido (.mp3, .wav, .m4a)')
    }
  }, [])

  const handleProcess = async () => {
    if (!file) return

    setIsLoading(true)
    setError(null)
    setTranscript(null)
    setPlan(null)
    setStatus('Subiendo archivo de audio...')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('companyId', companyId)

    try {
      // Simulamos visualmente el paso 1
      setTimeout(() => setStatus('Transcribiendo audio con Whisper (OpenAI)...'), 1000)

      const response = await fetch('/api/emergencies/generate', {
        method: 'POST',
        body: formData,
      })

      setStatus('Analizando hallazgos y redactando plan (Claude 3.5)...')

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error procesando el audio')
      }

      setTranscript(data.transcript)
      setPlan(data.plan)
      setStatus('Completado')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error interno')
      setStatus('')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Zona de Carga */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`rounded-lg border-2 border-dashed p-10 text-center transition-colors ${file ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-red-400'}`}
      >
        <div className="mb-4 text-4xl text-red-600">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        </div>
        {file ? (
          <div>
            <p className="text-lg font-semibold text-gray-800">Archivo seleccionado:</p>
            <p className="font-medium text-red-600">{file.name}</p>
            <button
              onClick={() => setFile(null)}
              className="mt-2 text-sm text-gray-500 underline"
              disabled={isLoading}
            >
              Cambiar archivo
            </button>
          </div>
        ) : (
          <div>
            <p className="text-lg font-medium text-gray-700">Arrastra tu nota de voz aquí</p>
            <p className="mt-2 text-sm text-gray-500">
              Formatos soportados: MP3, M4A, WAV (Max 10MB)
            </p>
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              id="audio-upload"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setFile(e.target.files[0])
                  setError(null)
                }
              }}
            />
            <button
              onClick={() => document.getElementById('audio-upload')?.click()}
              className="mt-4 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Explorar Archivos
            </button>
          </div>
        )}
      </div>

      {error && <div className="rounded-md bg-red-100 p-4 text-red-700">{error}</div>}

      {/* Botón de Procesar */}
      {file && !plan && (
        <button
          onClick={handleProcess}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-transparent bg-red-600 px-4 py-4 text-lg font-bold text-white shadow-sm transition-all hover:bg-red-700 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {status}
            </>
          ) : (
            'Transcribir y Generar Plan'
          )}
        </button>
      )}

      {/* Resultados */}
      {plan && transcript && (
        <div className="animate-in fade-in slide-in-from-bottom-4 grid grid-cols-1 gap-6 duration-500 lg:grid-cols-3">
          <div className="h-fit rounded-lg border bg-white p-6 shadow-sm lg:col-span-1">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500">
              Transcripción de Audio
            </h3>
            <p className="border-l-4 border-gray-200 pl-3 text-sm italic text-gray-700">
              &quot;{transcript}&quot;
            </p>
            <button
              onClick={() => {
                setFile(null)
                setPlan(null)
                setTranscript(null)
              }}
              className="mt-6 w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Subir nuevo audio
            </button>
          </div>

          <div className="rounded-lg border bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">Plan de Acción (IA)</h3>
              <button
                onClick={() => navigator.clipboard.writeText(plan)}
                className="text-sm font-medium text-red-600 hover:text-red-800"
              >
                Copiar Texto
              </button>
            </div>
            <div className="prose prose-red max-w-none whitespace-pre-wrap text-sm">{plan}</div>
          </div>
        </div>
      )}
    </div>
  )
}
