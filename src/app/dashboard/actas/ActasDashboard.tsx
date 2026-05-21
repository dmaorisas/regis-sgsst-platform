'use client'

import { useState } from 'react'
import ActaGeneratorForm from './ActaGeneratorForm'
import CommitteeManager from './CommitteeManager'

interface Centro {
  id: string
  nombre: string
}

interface ActasDashboardProps {
  companyId: string
  companyName: string
  isRegisStaff: boolean
  centros: Centro[]
}

export default function ActasDashboard({
  companyId,
  companyName: _companyName,
  isRegisStaff,
  centros,
}: ActasDashboardProps) {
  const [activeTab, setActiveTab] = useState<'generator' | 'manager'>('generator')

  return (
    <div className="space-y-6">
      {/* Selector de Pestañas */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('generator')}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-semibold transition-all ${
              activeTab === 'generator'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Generador de Actas
            </div>
          </button>

          <button
            onClick={() => setActiveTab('manager')}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-semibold transition-all ${
              activeTab === 'manager'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Gestionar Comités
            </div>
          </button>
        </nav>
      </div>

      {/* Renderizado de Pestañas */}
      <div className="transition-all duration-200">
        {activeTab === 'generator' ? (
          <div className="space-y-6">
            <div className="flex items-start gap-3 rounded-xl border border-sky-100 bg-sky-50/50 p-4 text-sm text-sky-800 shadow-sm">
              <svg
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-sky-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <span className="font-semibold">Generación Inteligente:</span> Ingresa notas breves
                o la transcripción de tu reunión. La Inteligencia Artificial redactará
                automáticamente el acta con lenguaje corporativo, técnico y legal válido para entes
                de control.
              </div>
            </div>
            <ActaGeneratorForm companyId={companyId} isRegisStaff={isRegisStaff} />
          </div>
        ) : (
          <CommitteeManager companyId={companyId} centros={centros} />
        )}
      </div>
    </div>
  )
}
