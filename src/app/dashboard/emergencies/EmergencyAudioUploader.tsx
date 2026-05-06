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
    } catch (err: any) {
      setError(err.message)
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
        className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors ${file ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-red-400'}`}
      >
        <div className="text-4xl mb-4">🎙️</div>
        {file ? (
          <div>
            <p className="text-lg font-semibold text-gray-800">Archivo seleccionado:</p>
            <p className="text-red-600 font-medium">{file.name}</p>
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
            <p className="text-sm text-gray-500 mt-2">Formatos soportados: MP3, M4A, WAV (Max 10MB)</p>
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
              className="mt-4 px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Explorar Archivos
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Botón de Procesar */}
      {file && !plan && (
        <button
          onClick={handleProcess}
          disabled={isLoading}
          className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-md shadow-sm text-lg font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-all"
        >
          {isLoading ? (
             <>
               <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
               {status}
             </>
          ) : (
            '▶️ Transcribir y Generar Plan'
          )}
        </button>
      )}

      {/* Resultados */}
      {plan && transcript && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="lg:col-span-1 bg-white p-6 rounded-lg border shadow-sm h-fit">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Transcripción de Audio</h3>
            <p className="text-sm text-gray-700 italic border-l-4 border-gray-200 pl-3">
              "{transcript}"
            </p>
            <button
              onClick={() => { setFile(null); setPlan(null); setTranscript(null); }}
              className="mt-6 w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Subir nuevo audio
            </button>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-lg border shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Plan de Acción (IA)</h3>
              <button
                onClick={() => navigator.clipboard.writeText(plan)}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Copiar Texto
              </button>
            </div>
            <div className="prose prose-red max-w-none text-sm whitespace-pre-wrap">
              {plan}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
