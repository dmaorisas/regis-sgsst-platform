// =========================================================
// Pino logger (T-F15-012)
// =========================================================
// Logger estructurado JSON. En desarrollo usa pino-pretty para una
// salida legible; en producción emite JSON crudo, que es lo que
// esperan los recolectores (Vercel logs, Logtail, etc.).
//
// El nivel se controla por env LOG_LEVEL (default 'info'). Para
// debug puntual: LOG_LEVEL=debug npm run dev.
//
// Decisión técnica (R7):
//  - Singleton: importar `logger` directamente para usos puntuales.
//  - Para añadir contexto persistente (request_id, agent_id) usar
//    `createLogger({ ... })` que devuelve un child logger con esos
//    campos preconcatenados.
// =========================================================

import pino, { type Logger } from 'pino'

const isProd = process.env.NODE_ENV === 'production'

const baseOpts = {
  level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
  base: {
    env: process.env.NODE_ENV ?? 'development',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
}

export const logger: Logger = isProd
  ? pino(baseOpts)
  : pino({
      ...baseOpts,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname,env',
        },
      },
    })

/**
 * Devuelve un child logger con contexto pre-poblado. Útil para
 * scoping por módulo, agente o request.
 *
 * @example
 *   const log = createLogger({ module: 'notifications' })
 *   log.info({ recipient_id }, 'notification dispatched')
 */
export function createLogger(context: Record<string, unknown>): Logger {
  return logger.child(context)
}
