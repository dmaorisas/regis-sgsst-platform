'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard Error:', error)
  }, [error])

  return (
    <div className="min-h-[60vh] bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-[0_2px_4px_rgba(30,41,59,0.04)] border border-rose-100 p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
          <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Error cargando el módulo</h2>
          <p className="text-slate-600 text-sm">
            Ocurrió un error al intentar cargar esta sección. Puede ser un problema temporal de conexión.
          </p>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <button
            onClick={() => reset()}
            className="w-full bg-[#1e293b] text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors shadow-sm"
          >
            Refrescar módulo
          </button>
        </div>
      </div>
    </div>
  )
}
