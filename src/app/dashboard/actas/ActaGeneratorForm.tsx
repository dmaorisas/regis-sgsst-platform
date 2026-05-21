// ============================================================
// PROTECTED FILE — Do NOT modify without explicit user approval.
// Module: Actas (Comites y Actas de Reunion)
// See: memory/protection_actas_module.md
// ============================================================
'use client'

import { useState, useEffect } from 'react'

interface CommitteeMember {
  id?: string
  worker_id: string
  name: string
  cedula: string
  cargo: string
  rol: 'presidente' | 'secretario' | 'principal' | 'suplente' | 'brigadista'
  representacion?: 'empleador' | 'trabajadores' | ''
  is_active?: boolean
}

interface Committee {
  id: string
  tipo: 'copasst' | 'vigia_sst' | 'convivencia' | 'brigada_emergencias'
  nombre: string
  fecha_eleccion: string | null
  fecha_vigencia_fin: string | null
  is_active: boolean
  centro_id: string
  centro_nombre: string
  members: CommitteeMember[]
}

interface ActaHistorialItem {
  id: string
  companyId: string
  tipoComite: string
  fecha: string
  numeroActa: number
  codigo: string
  asistentes: string
  notasBreves: string
  base64: string
  estado?: 'GENERADA' | 'EN_FIRMA' | 'FIRMADA'
}

const DEFAULT_AI_PROMPT = `1. Transforma las notas y la transcripción en un desarrollo de la reunión formal con lenguaje corporativo, técnico y legal.
2. Identifica y extrae las tareas anteriores de seguimiento del comité. NO inventes tareas previas que no estén mencionadas en las notas. Si no se mencionan, la lista debe quedar vacía.
3. Identifica y extrae los nuevos compromisos y tareas acordados, asignando un responsable de la lista de asistentes y una fecha realista de cumplimiento en formato YYYY-MM-DD. NO inventes compromisos si no están en las notas.
4. Identifica la fecha de la próxima reunión. IMPORTANTE: Si la fecha de la próxima reunión no se menciona explícitamente en la transcripción o notas rápidas provistas, devuélvela estrictamente como string vacío "". No inventes, calcules ni asumas ninguna fecha por defecto si no es especificada.`

export default function ActaGeneratorForm({
  companyId,
  defaultAttendees: _defaultAttendees = '',
  isRegisStaff: _isRegisStaff = false,
}: {
  companyId: string
  defaultAttendees?: string
  isRegisStaff?: boolean
}) {
  const [tipoComite, setTipoComite] = useState('COPASST')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0] || '')
  const [numeroActa, setNumeroActa] = useState(1)

  // Comités del cliente e integrantes
  const [committees, setCommittees] = useState<Committee[]>([])
  const [_loadingCommittees, setLoadingCommittees] = useState(true)
  const [selectedCommitteeId, setSelectedCommitteeId] = useState('')

  // Asistentes seleccionados (IDs de trabajadores)
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([])

  // Quórum
  const [quorumCompleto, setQuorumCompleto] = useState<'' | 'si' | 'no'>('')

  // Opciones de fuente de datos
  const [sourceType, setSourceType] = useState<'transcription' | 'audio'>('transcription')
  const [transcription, setTranscription] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [customGuidelines, setCustomGuidelines] = useState(DEFAULT_AI_PROMPT)
  const [isConfigExpanded, setIsConfigExpanded] = useState(false)

  const [actaBase64, setActaBase64] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Historial de actas
  const [history, setHistory] = useState<ActaHistorialItem[]>([])

  // Estados para el flujo de firma electrónica
  const [documentStatus, setDocumentStatus] = useState<'BORRADOR' | 'EN_FIRMA' | 'FIRMADA'>(
    'BORRADOR',
  )
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false)
  const [signatureType, setSignatureType] = useState<'PARALLEL' | 'SEQUENTIAL'>('PARALLEL')
  const [signers, setSigners] = useState<{ name: string; email: string; role: string }[]>([
    { name: '', email: '', role: '' },
  ])

  const updateLastHistoryStatus = (newStatus: 'GENERADA' | 'FIRMADA') => {
    setHistory((prev) => {
      if (prev.length === 0) return prev
      const updated = [...prev]
      const index = updated.findIndex((h) => h.companyId === companyId)
      if (index !== -1) {
        updated[index] = { ...updated[index], estado: newStatus } as ActaHistorialItem
      }
      localStorage.setItem('regis_actas_history', JSON.stringify(updated))
      return updated
    })
  }

  const _handleDeleteHistoryItem = (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta acta del historial?')) return
    setHistory((prev) => {
      const updated = prev.filter((h) => h.id !== id)
      localStorage.setItem('regis_actas_history', JSON.stringify(updated))
      return updated
    })
  }

  // Cargar comités de la empresa
  useEffect(() => {
    async function loadCommittees() {
      try {
        setLoadingCommittees(true)
        const res = await fetch(`/api/committees?companyId=${companyId}`)
        if (res.ok) {
          const data = await res.json()
          setCommittees(data)
        }
      } catch (err) {
        console.error('Error loading committees for form', err)
      } finally {
        setLoadingCommittees(false)
      }
    }
    loadCommittees()
  }, [companyId])

  // Filtrar comités activos según el tipo de acta seleccionado
  const filteredCommittees = committees.filter((c) => {
    if (!c.is_active) return false
    if (tipoComite === 'COPASST') {
      return c.tipo === 'copasst' || c.tipo === 'vigia_sst'
    } else {
      return c.tipo === 'convivencia'
    }
  })

  // Sincronizar selección de comité y asistentes por defecto
  useEffect(() => {
    if (filteredCommittees.length > 0) {
      const currentIsValid = filteredCommittees.some((c) => c.id === selectedCommitteeId)
      if (!currentIsValid) {
        const defaultCom = filteredCommittees[0]
        if (defaultCom) {
          setSelectedCommitteeId(defaultCom.id)
          setSelectedAttendees(
            defaultCom.members.filter((m) => m.is_active !== false).map((m) => m.worker_id),
          )
        }
      }
    } else {
      setSelectedCommitteeId('')
      setSelectedAttendees([])
    }
  }, [tipoComite, committees, selectedCommitteeId, filteredCommittees])

  const handleCommitteeChange = (id: string) => {
    setSelectedCommitteeId(id)
    const com = committees.find((c) => c.id === id)
    if (com) {
      setSelectedAttendees(com.members.filter((m) => m.is_active !== false).map((m) => m.worker_id))
    } else {
      setSelectedAttendees([])
    }
  }

  // Cargar historial y autodetectar número de acta
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('regis_actas_history')
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as ActaHistorialItem[]
          setHistory(parsed)

          // Encontrar el mayor número de acta para esta empresa y comité
          const filtered = parsed.filter(
            (item) => item.companyId === companyId && item.tipoComite === tipoComite,
          )
          if (filtered.length > 0) {
            const maxNum = Math.max(...filtered.map((item) => item.numeroActa))
            setNumeroActa(maxNum + 1)
          } else {
            setNumeroActa(1)
          }
        } catch (e) {
          console.error('Error parsing actas history', e)
        }
      } else {
        setNumeroActa(1)
      }
    }
  }, [companyId, tipoComite])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setActaBase64(null)
    setDocumentStatus('BORRADOR')

    // Mapeamos los IDs a sus nombres y roles correspondientes para que se rendericen
    // de forma legible y elegante en la plantilla de Word y en la IA.
    const com = committees.find((c) => c.id === selectedCommitteeId)
    const list = com ? com.members : []
    const attendeeNames = selectedAttendees
      .map((workerId) => {
        const attendee = list.find((a) => a.worker_id === workerId)
        return attendee
          ? `${attendee.name} (${attendee.rol.toUpperCase()} - ${attendee.cargo})`
          : ''
      })
      .filter(Boolean)
      .join(', ')

    const asistentesList = selectedAttendees
      .map((workerId) => {
        const attendee = list.find((a) => a.worker_id === workerId)
        if (!attendee) return null
        return {
          nombre: attendee.name,
          cargo_empresa: attendee.cargo,
          cargo_comite: attendee.rol.charAt(0).toUpperCase() + attendee.rol.slice(1),
        }
      })
      .filter(Boolean)

    if (!attendeeNames) {
      setError('Por favor selecciona al menos un asistente para la reunión.')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/actas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          tipoComite,
          fecha,
          asistentes: attendeeNames,
          asistentesList,
          notasBreves: transcription || (audioFile ? 'Audio subido' : ''),
          numeroActa,
          directrices: customGuidelines,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error generando el acta')
      }

      setActaBase64(data.base64)

      // Guardar en el Historial Local
      const paddedNum = String(numeroActa).padStart(3, '0')
      const generatedCode = `ACT-${tipoComite === 'COPASST' ? 'COP' : 'CON'}-${new Date(fecha).getFullYear() || 2026}-${paddedNum}`

      const newRecord: ActaHistorialItem = {
        id: Date.now().toString(),
        companyId,
        tipoComite,
        fecha,
        numeroActa,
        codigo: generatedCode,
        asistentes: attendeeNames,
        notasBreves: transcription || (audioFile ? 'Audio subido' : ''),
        base64: data.base64,
        estado: 'GENERADA',
      }

      const updatedHistory = [newRecord, ...history]
      setHistory(updatedHistory)
      localStorage.setItem('regis_actas_history', JSON.stringify(updatedHistory))

      // Incrementar automáticamente el contador para la siguiente
      setNumeroActa(numeroActa + 1)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error interno')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadWord = () => {
    if (!actaBase64) return
    const link = document.createElement('a')
    link.href = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${actaBase64}`
    link.download = `Acta_${tipoComite}_${fecha}.docx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleAddSigner = () => {
    setSigners([...signers, { name: '', email: '', role: '' }])
  }

  const handleSignerChange = (index: number, field: 'name' | 'email' | 'role', value: string) => {
    const newSigners = [...signers]
    newSigners[index] = { ...newSigners[index], [field]: value } as {
      name: string
      email: string
      role: string
    }
    setSigners(newSigners)
  }

  const handleRemoveSigner = (index: number) => {
    const newSigners = signers.filter((_, i) => i !== index)
    setSigners(newSigners)
  }

  const handleSendToSign = () => {
    // Validar que todos los firmantes tengan datos
    const isValid = signers.every((s) => s.name && s.email && s.role)
    if (!isValid) {
      alert('Por favor completa todos los campos de los firmantes.')
      return
    }

    // Aquí iría la llamada a la API real:
    // await fetch('/api/documents/send-to-sign', { ... })

    setDocumentStatus('EN_FIRMA')
    updateLastHistoryStatus('GENERADA')
    setIsSignatureModalOpen(false)
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      {/* Formulario */}
      <div className="h-fit rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Detalles de la Reunión</h2>
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo de Comité</label>
              <select
                value={tipoComite}
                onChange={(e) => {
                  setTipoComite(e.target.value)
                  setSelectedAttendees([]) // Resetear al cambiar de comité
                }}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white p-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              >
                <option value="COPASST">COPASST</option>
                <option value="Convivencia">Comité de Convivencia Laboral</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Número de Acta</label>
              <input
                type="number"
                required
                min={1}
                value={numeroActa}
                onChange={(e) => setNumeroActa(parseInt(e.target.value) || 1)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white p-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Fecha de Reunión</label>
            <input
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white p-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>

          {/* Selector de Comité Específico */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Comité Específico</label>
            <select
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white p-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              value={selectedCommitteeId}
              onChange={(e) => handleCommitteeChange(e.target.value)}
            >
              {filteredCommittees.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.centro_nombre})
                </option>
              ))}
              {filteredCommittees.length === 0 && (
                <option value="">No hay comités activos para este tipo</option>
              )}
            </select>
            {filteredCommittees.length === 0 && (
              <p className="mt-1 text-xs font-medium text-amber-600">
                No hay comités creados de este tipo. Configura uno en la pestaña &quot;Gestionar
                Comités&quot;.
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Asistentes de la Reunión
            </label>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-3">
              {(() => {
                const activeCom = committees.find((c) => c.id === selectedCommitteeId)
                const activeMembers = activeCom ? activeCom.members : []

                return (
                  <>
                    {activeMembers.map((attendee) => (
                      <label
                        key={attendee.worker_id}
                        className="flex cursor-pointer items-start space-x-3 rounded border border-transparent p-2 transition-colors hover:border-gray-200 hover:bg-white"
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 cursor-pointer rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          checked={selectedAttendees.includes(attendee.worker_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAttendees([...selectedAttendees, attendee.worker_id])
                            } else {
                              setSelectedAttendees(
                                selectedAttendees.filter((id) => id !== attendee.worker_id),
                              )
                            }
                          }}
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{attendee.name}</div>
                          <div className="text-xs text-gray-500">
                            {attendee.cargo} |{' '}
                            <span className="font-semibold uppercase text-sky-700">
                              {attendee.rol}
                            </span>
                          </div>
                        </div>
                      </label>
                    ))}
                    {activeMembers.length === 0 && (
                      <div className="text-sm italic text-gray-500">
                        No hay integrantes registrados en este comité.
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </div>

          {/* Verificacion de Quorum */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Quorum de la Reunion</label>
            <select
              required
              value={quorumCompleto}
              onChange={(e) => setQuorumCompleto(e.target.value as '' | 'si' | 'no')}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white p-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            >
              <option value="">-- Seleccionar --</option>
              <option value="si">Si, se completo el quorum minimo</option>
              <option value="no">No, no se completo el quorum minimo</option>
            </select>
            {quorumCompleto === 'no' && (
              <p className="mt-2 text-sm font-medium text-red-600">
                No es posible generar el acta sin quorum minimo. La reunion no tiene validez legal
                sin la asistencia requerida.
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Contenido de la Reunion
            </label>
            <div className="rounded-md border border-gray-200">
              <div className="flex border-b border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setSourceType('transcription')}
                  className={`flex-1 px-4 py-2 text-sm font-medium ${sourceType === 'transcription' ? 'border-b-2 border-emerald-500 bg-white text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Pegar Transcripcion
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType('audio')}
                  className={`flex-1 px-4 py-2 text-sm font-medium ${sourceType === 'audio' ? 'border-b-2 border-emerald-500 bg-white text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Subir Audio / Video
                </button>
              </div>

              <div className="bg-white p-4">
                {sourceType === 'transcription' ? (
                  <textarea
                    required={sourceType === 'transcription'}
                    rows={6}
                    placeholder="Pega aquí todo el texto de la transcripción de tu reunión..."
                    value={transcription}
                    onChange={(e) => setTranscription(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 p-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-gray-300 bg-gray-50 py-6">
                    {audioFile ? (
                      <div className="text-center">
                        <div className="mb-2 text-3xl text-gray-400">Audio</div>
                        <p className="text-sm font-medium text-gray-900">{audioFile.name}</p>
                        <button
                          type="button"
                          onClick={() => setAudioFile(null)}
                          className="mt-1 text-xs text-red-600 hover:underline"
                        >
                          Quitar archivo
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="mb-2 text-sm font-medium text-gray-400">Archivo</div>
                        <p className="mb-3 px-4 text-center text-sm text-gray-500">
                          Sube la grabación de tu reunión (MP3, MP4, WAV). La IA la escuchará y hará
                          el acta.
                        </p>
                        <input
                          type="file"
                          id="audio-upload"
                          className="hidden"
                          accept="audio/*,video/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setAudioFile(e.target.files[0])
                            }
                          }}
                        />
                        <label
                          htmlFor="audio-upload"
                          className="cursor-pointer rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                        >
                          Seleccionar archivo
                        </label>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Configuracion Avanzada de IA / Directrices de Redaccion */}
          <div className="mb-4 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-300">
            <button
              type="button"
              onClick={() => setIsConfigExpanded(!isConfigExpanded)}
              className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
            >
              <span className="flex items-center gap-2">
                Configuracion Avanzada de IA (Opcional)
              </span>
              <span className="text-xs text-gray-400">
                {isConfigExpanded ? 'Ocultar ▲' : 'Mostrar ▼'}
              </span>
            </button>

            {isConfigExpanded && (
              <div className="animate-fadeIn border-t border-gray-100 bg-white p-4">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
                  Directrices o Instrucciones Especiales para la IA
                </label>
                <textarea
                  rows={3}
                  placeholder="Ejemplo: Redactar en tercera persona, citar la Resolución 2013 de 1986, enfocar en el plan de capacitación..."
                  value={customGuidelines}
                  onChange={(e) => setCustomGuidelines(e.target.value)}
                  className="mb-3 block w-full rounded-md border border-gray-300 p-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const tag =
                        'Redactar en tercera persona con un tono altamente formal y legal corporativo colombiano.'
                      setCustomGuidelines((prev) => (prev ? `${prev}\n${tag}` : tag))
                    }}
                    className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                  >
                    Tono Legal/HSEQ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tag =
                        'Hacer énfasis especial en la tabla de compromisos y planes de acción preventivos.'
                      setCustomGuidelines((prev) => (prev ? `${prev}\n${tag}` : tag))
                    }}
                    className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    Enfocar en Compromisos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tag =
                        'Mantener el desarrollo de la reunión en un formato ejecutivo de lectura rápida y resumida.'
                      setCustomGuidelines((prev) => (prev ? `${prev}\n${tag}` : tag))
                    }}
                    className="rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 transition-colors hover:bg-purple-100"
                  >
                    Resumen Ejecutivo Breve
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomGuidelines('')}
                    className="ml-auto rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || quorumCompleto !== 'si'}
            className="flex w-full justify-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? 'Redactando acta con IA...' : 'Generar Acta Profesional'}
          </button>

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </form>
      </div>

      {/* Resultado */}
      <div className="relative flex h-full min-h-[500px] flex-col rounded-lg border bg-gray-50 p-6">
        {/* Etiqueta de Estado */}
        <div
          className="absolute right-0 top-0 rounded-bl-lg rounded-tr-lg px-4 py-1 text-xs font-bold text-white shadow-sm"
          style={{
            backgroundColor:
              documentStatus === 'BORRADOR'
                ? '#6b7280'
                : documentStatus === 'EN_FIRMA'
                  ? '#f59e0b'
                  : '#10b981',
          }}
        >
          {documentStatus}
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Resultado del Documento</h2>
          {actaBase64 && documentStatus === 'BORRADOR' && (
            <div className="flex gap-2">
              <button
                onClick={() => setIsSignatureModalOpen(true)}
                className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                Enviar a Firma
              </button>
            </div>
          )}
        </div>

        {actaBase64 ? (
          <div className="flex h-full flex-1 flex-col">
            {documentStatus === 'EN_FIRMA' && (
              <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-4">
                <h3 className="mb-2 font-semibold text-amber-800">Documento en proceso de firma</h3>
                <p className="mb-3 text-sm text-amber-700">
                  El acta ha sido bloqueada y enviada a los siguientes firmantes:
                </p>
                <div className="space-y-2">
                  {signers.map((s, idx) => (
                    <div key={idx} className="flex items-center text-sm">
                      <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-800">
                        {idx + 1}
                      </span>
                      <span className="w-1/3 font-medium text-gray-800">{s.name}</span>
                      <span className="w-1/3 text-gray-500">{s.role}</span>
                      <span className="text-xs italic text-gray-500">Pendiente...</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t border-amber-200 pt-3">
                  <button
                    onClick={() => {
                      setDocumentStatus('FIRMADA')
                      updateLastHistoryStatus('FIRMADA')
                    }}
                    className="text-xs text-amber-600 underline hover:text-amber-800"
                  >
                    [Simular completado]
                  </button>
                </div>
              </div>
            )}

            {documentStatus === 'FIRMADA' && (
              <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-4">
                <h3 className="mb-2 font-semibold text-emerald-800">
                  Documento firmado exitosamente
                </h3>
                <p className="mb-3 text-sm text-emerald-700">
                  Todos los participantes han completado su firma electrónica legal.
                </p>
                <div className="flex gap-3">
                  <button className="flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700">
                    Descargar PDF Firmado
                  </button>
                  <button className="flex items-center rounded-md border border-emerald-600 bg-white px-3 py-1.5 text-sm font-medium text-emerald-700 shadow-sm hover:bg-emerald-50">
                    Descargar Certificado
                  </button>
                </div>
                <div className="mt-4 border-t border-emerald-200 pt-3">
                  <button
                    onClick={() => {
                      setDocumentStatus('BORRADOR')
                      updateLastHistoryStatus('GENERADA')
                    }}
                    className="text-xs text-emerald-600 underline hover:text-emerald-800"
                  >
                    [Reiniciar simulador]
                  </button>
                </div>
              </div>
            )}

            <div
              className={`flex flex-1 flex-col items-center justify-center rounded-md border bg-white p-8 ${documentStatus !== 'BORRADOR' ? 'pointer-events-none opacity-70' : ''}`}
            >
              <div className="mb-4 text-lg font-bold text-gray-300">DOCX</div>
              <h3 className="mb-2 text-lg font-bold text-gray-900">¡Acta Generada con Éxito!</h3>
              <p className="mb-6 max-w-md text-center text-sm text-gray-500">
                La inteligencia artificial ha redactado el resumen de la reunión y ha rellenado tu
                plantilla de Word automáticamente.
              </p>
              <button
                onClick={handleDownloadWord}
                className="flex items-center gap-2 rounded-md border border-transparent bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
              >
                Descargar Documento Word (.docx)
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm italic text-gray-400">
            El acta generada aparecerá aquí...
          </div>
        )}
      </div>

      {/* Historial de Actas en la parte inferior */}
      <div className="mt-8 rounded-lg border bg-white p-6 shadow-sm lg:col-span-2">
        <h3 className="mb-6 flex items-center gap-2 border-b pb-3 text-lg font-bold text-gray-800">
          Historial de Actas Generadas para esta Empresa
        </h3>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* TABLA COPASST */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="flex items-center gap-2 font-semibold text-emerald-800">
                Actas Comite COPASST
              </h4>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                {
                  history.filter((h) => h.companyId === companyId && h.tipoComite === 'COPASST')
                    .length
                }{' '}
                Actas
              </span>
            </div>

            {history.filter((h) => h.companyId === companyId && h.tipoComite === 'COPASST').length >
            0 ? (
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Número</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Fecha</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Estado</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {history
                      .filter((h) => h.companyId === companyId && h.tipoComite === 'COPASST')
                      .map((item) => (
                        <tr key={item.id} className="transition-colors hover:bg-gray-50">
                          <td className="px-3 py-2 font-bold text-emerald-700">
                            #{item.numeroActa}
                          </td>
                          <td className="px-3 py-2 text-gray-500">{item.fecha}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider ${
                                item.estado === 'FIRMADA'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.estado === 'EN_FIRMA'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {item.estado || 'BORRADOR'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right">
                            <button
                              onClick={() => {
                                const link = document.createElement('a')
                                link.href = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${item.base64}`
                                link.download = `Acta_${item.tipoComite}_${item.fecha}.docx`
                                document.body.appendChild(link)
                                link.click()
                                document.body.removeChild(link)
                              }}
                              className="ml-auto flex items-center gap-1 text-[11px] font-bold text-emerald-600 underline hover:text-emerald-800"
                            >
                              Descargar Word
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-md border border-dashed bg-gray-50 py-6 text-center text-xs italic text-gray-400">
                Aún no hay actas COPASST generadas.
              </div>
            )}
          </div>

          {/* TABLA CONVIVENCIA */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="flex items-center gap-2 font-semibold text-blue-800">
                Actas Comite de Convivencia
              </h4>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
                {
                  history.filter((h) => h.companyId === companyId && h.tipoComite === 'Convivencia')
                    .length
                }{' '}
                Actas
              </span>
            </div>

            {history.filter((h) => h.companyId === companyId && h.tipoComite === 'Convivencia')
              .length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Número</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Fecha</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Estado</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {history
                      .filter((h) => h.companyId === companyId && h.tipoComite === 'Convivencia')
                      .map((item) => (
                        <tr key={item.id} className="transition-colors hover:bg-gray-50">
                          <td className="px-3 py-2 font-bold text-blue-700">#{item.numeroActa}</td>
                          <td className="px-3 py-2 text-gray-500">{item.fecha}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider ${
                                item.estado === 'FIRMADA'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.estado === 'EN_FIRMA'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {item.estado || 'BORRADOR'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right">
                            <button
                              onClick={() => {
                                const link = document.createElement('a')
                                link.href = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${item.base64}`
                                link.download = `Acta_${item.tipoComite}_${item.fecha}.docx`
                                document.body.appendChild(link)
                                link.click()
                                document.body.removeChild(link)
                              }}
                              className="ml-auto flex items-center gap-1 text-[11px] font-bold text-blue-600 underline hover:text-blue-800"
                            >
                              Descargar Word
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-md border border-dashed bg-gray-50 py-6 text-center text-xs italic text-gray-400">
                Aún no hay actas de Convivencia generadas.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Configuración de Firmas */}
      {isSignatureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="text-lg font-bold text-gray-900">Configurar Firmas Electrónicas</h3>
              <button
                onClick={() => setIsSignatureModalOpen(false)}
                className="text-xl font-bold text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>

            <div className="space-y-6 p-6">
              {/* Tipo de Firma */}
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-700">Orden de Firmas</h4>
                <div className="flex gap-4">
                  <label className="flex flex-1 cursor-pointer items-center rounded-lg border p-3 hover:bg-gray-50">
                    <input
                      type="radio"
                      name="sig_type"
                      checked={signatureType === 'PARALLEL'}
                      onChange={() => setSignatureType('PARALLEL')}
                      className="mr-3"
                    />
                    <div>
                      <div className="text-sm font-medium">Paralelo</div>
                      <div className="text-xs text-gray-500">
                        Todos pueden firmar al mismo tiempo
                      </div>
                    </div>
                  </label>
                  <label className="flex flex-1 cursor-pointer items-center rounded-lg border p-3 hover:bg-gray-50">
                    <input
                      type="radio"
                      name="sig_type"
                      checked={signatureType === 'SEQUENTIAL'}
                      onChange={() => setSignatureType('SEQUENTIAL')}
                      className="mr-3"
                    />
                    <div>
                      <div className="text-sm font-medium">Secuencial</div>
                      <div className="text-xs text-gray-500">
                        Firman en orden estricto (1, luego 2...)
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Lista de Firmantes */}
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-700">Participantes a Firmar</h4>
                <div className="space-y-3">
                  {signers.map((signer, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 rounded-lg border bg-gray-50 p-3"
                    >
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 block text-xs text-gray-500">
                              Nombre Completo
                            </label>
                            <input
                              type="text"
                              value={signer.name}
                              onChange={(e) => handleSignerChange(index, 'name', e.target.value)}
                              className="w-full rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                              placeholder="Ej: Juan Pérez"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-500">
                              Correo Electrónico
                            </label>
                            <input
                              type="email"
                              value={signer.email}
                              onChange={(e) => handleSignerChange(index, 'email', e.target.value)}
                              className="w-full rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                              placeholder="juan@empresa.com"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-gray-500">Cargo / Rol</label>
                          <input
                            type="text"
                            value={signer.role}
                            onChange={(e) => handleSignerChange(index, 'role', e.target.value)}
                            className="w-full rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="Ej: Presidente del COPASST"
                          />
                        </div>
                      </div>
                      {signers.length > 1 && (
                        <button
                          onClick={() => handleRemoveSigner(index)}
                          className="mt-6 rounded-md p-2 text-red-500 hover:bg-red-50"
                          title="Eliminar firmante"
                        >
                          X
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleAddSigner}
                  className="mt-3 flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  + Agregar otro firmante
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 rounded-b-xl border-t bg-gray-50 px-6 py-4">
              <button
                onClick={() => setIsSignatureModalOpen(false)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendToSign}
                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                Confirmar y Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
