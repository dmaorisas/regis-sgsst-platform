// =========================================================
// WhatsApp channel — STUB (T-F15-006)
// =========================================================
// Stub que registra la intención de envío sin contactar a Wati ni
// a la Cloud API de Meta. Mantiene la firma final para que F2
// pueda reemplazar la implementación sin tocar a sus llamadores.
//
// Decisión técnica (R7):
//  - Devolver { stubbed: true, logged_at } permite a tests y al
//    worker de pg-boss distinguir un envío real de uno simulado.
//  - No lanza error: el contrato es siempre "loggear y devolver",
//    para que la cola no marque los jobs como failed.
// =========================================================

import { createLogger } from '@/lib/logger'

const log = createLogger({ module: 'whatsapp:stub' })

export type SendWhatsAppParams = {
  to_phone: string
  template: string
  variables: Record<string, string>
}

export type SendWhatsAppResult = {
  stubbed: true
  logged_at: string
  to_phone: string
  template: string
}

export async function sendWhatsApp(params: SendWhatsAppParams): Promise<SendWhatsAppResult> {
  const logged_at = new Date().toISOString()
  log.warn(
    {
      to_phone: params.to_phone,
      template: params.template,
      variables_keys: Object.keys(params.variables),
    },
    'whatsapp stub — would send (no real API call)',
  )
  return {
    stubbed: true,
    logged_at,
    to_phone: params.to_phone,
    template: params.template,
  }
}
