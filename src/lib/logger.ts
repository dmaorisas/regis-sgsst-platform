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

// En desarrollo, el transport de pino-pretty utiliza hilos de trabajo (worker threads).
// Con la recarga en caliente de Next.js, esto puede generar errores críticos
// ("Error: the worker has exited"). Desactivamos el transport si estamos en el
// runtime de Next.js para evitar que la aplicación aborte.
const usePretty = !isProd && !process.env.NEXT_RUNTIME

export const logger: Logger = usePretty
  ? pino({
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
  : pino(baseOpts)

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
