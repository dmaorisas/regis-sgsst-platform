// =========================================================
// ClaudeClient (T-F15-011) — wrapper con tracking en ai_usage
// =========================================================
// Toda llamada a la API de Anthropic dentro del proyecto debe pasar
// por aquí. El wrapper:
//   - Resuelve modelo según `complexity_level` (mapping interno
//     coherente con governance/06_llm_routing_config.md)
//   - Mide latencia
//   - Calcula costo en USD según pricing público vigente
//   - Inserta UNA fila en `ai_usage` por intento (éxito o error)
//   - Re-lanza el error si la llamada falla, después de loguear
//
// Decisión técnica (R7):
//  - Modelos válidos hardcodeados: `claude-haiku-4-5` (alias de la
//    línea Haiku 4.5) y `claude-sonnet-4-6` (alias Sonnet 4.6). El
//    user puede pasar `model` explícito para overrides puntuales,
//    siempre que la cadena empiece por uno de los prefijos
//    soportados — caso contrario asumimos pricing Sonnet (defensivo).
//  - Pricing en `PRICING_USD_PER_MTOK`. Si Anthropic publica un
//    cambio, se actualiza aquí. La fila ai_usage queda con el costo
//    histórico calculado en el momento del request (correcto para
//    auditoría retroactiva).
//  - request_hash: SHA-1 truncado del JSON estable de los messages
//    + modelo. Permite detectar "loops" (mismo prompt repetido) sin
//    persistir el contenido del prompt.
// =========================================================

import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { createLogger } from '@/lib/logger'

const log = createLogger({ module: 'ai:claude' })

export type ComplexityLevel = 'trivial' | 'simple' | 'medium' | 'complex' | 'critical'

export type ClaudeInvokeParams = {
  agent_id: string
  task_id?: string
  module: string
  complexity_level: ComplexityLevel
  messages: Anthropic.MessageParam[]
  /** Override puntual de modelo. Si se omite, se usa el del nivel. */
  model?: string
  max_tokens?: number
  /** Override puntual de temperature (default 0). */
  temperature?: number
  /** System prompt opcional. */
  system?: string
}

export type ClaudeInvokeResult = Anthropic.Message

/**
 * Pricing público Anthropic — USD por millón de tokens.
 * Última verificación: oct 2025 (input / output).
 * Fuente: anthropic.com/pricing.
 *
 * Si se añade un modelo nuevo, basta con extender este mapa; el
 * cálculo de costo lo recoge automáticamente.
 */
const PRICING_USD_PER_MTOK: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5': { input: 1.0, output: 5.0 },
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'claude-opus-4-7': { input: 15.0, output: 75.0 },
}

const COMPLEXITY_TO_MODEL: Record<ComplexityLevel, string> = {
  trivial: 'claude-haiku-4-5',
  simple: 'claude-haiku-4-5',
  medium: 'claude-sonnet-4-6',
  complex: 'claude-sonnet-4-6',
  critical: 'claude-sonnet-4-6',
}

export class ClaudeClient {
  private readonly client: Anthropic

  constructor(
    private readonly supabaseAdmin: SupabaseClient,
    apiKey?: string,
  ) {
    const key = apiKey ?? process.env.ANTHROPIC_API_KEY
    if (!key) {
      throw new Error('ANTHROPIC_API_KEY missing — set it in .env.local')
    }
    this.client = new Anthropic({ apiKey: key })
  }

  /** Permite a tests inyectar un mock del SDK. NO usar en producción. */
  static fromInjected(supabase: SupabaseClient, sdk: Anthropic): ClaudeClient {
    const inst = Object.create(ClaudeClient.prototype) as ClaudeClient
    ;(inst as unknown as { client: Anthropic }).client = sdk
    ;(inst as unknown as { supabaseAdmin: SupabaseClient }).supabaseAdmin = supabase
    return inst
  }

  async invoke(params: ClaudeInvokeParams): Promise<ClaudeInvokeResult> {
    const start = Date.now()
    const model = params.model ?? this.modelForComplexity(params.complexity_level)
    const requestHash = this.hashRequest(model, params.messages, params.system)

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: params.max_tokens ?? 4096,
        temperature: params.temperature ?? 0,
        ...(params.system ? { system: params.system } : {}),
        messages: params.messages,
      })

      const promptTokens = response.usage.input_tokens
      const completionTokens = response.usage.output_tokens
      const cost = this.priceFor(model, promptTokens, completionTokens)
      const latencyMs = Date.now() - start

      await this.insertUsage({
        agent_id: params.agent_id,
        task_id: params.task_id,
        module: params.module,
        complexity_level: params.complexity_level,
        provider: 'anthropic',
        model,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        cost_usd: cost,
        latency_ms: latencyMs,
        success: true,
        request_hash: requestHash,
      })

      log.info(
        {
          model,
          module: params.module,
          agent_id: params.agent_id,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          cost_usd: cost,
          latency_ms: latencyMs,
        },
        'claude invocation ok',
      )

      return response
    } catch (e) {
      const latencyMs = Date.now() - start
      const errorSig = e instanceof Error ? e.message.slice(0, 200) : 'unknown error'
      await this.insertUsage({
        agent_id: params.agent_id,
        task_id: params.task_id,
        module: params.module,
        complexity_level: params.complexity_level,
        provider: 'anthropic',
        model,
        prompt_tokens: 0,
        completion_tokens: 0,
        cost_usd: 0,
        latency_ms: latencyMs,
        success: false,
        error_signature: errorSig,
        request_hash: requestHash,
      })
      log.error(
        { err: e, model, module: params.module, latency_ms: latencyMs },
        'claude invocation failed',
      )
      throw e
    }
  }

  // ----------------- internals -----------------

  private modelForComplexity(level: ComplexityLevel): string {
    return COMPLEXITY_TO_MODEL[level] ?? 'claude-sonnet-4-6'
  }

  private priceFor(model: string, inputTokens: number, outputTokens: number): number {
    const entry = this.findPricing(model)
    const cost = (inputTokens * entry.input + outputTokens * entry.output) / 1_000_000
    // Redondeo a 6 decimales (DECIMAL(10,6) en ai_usage)
    return Math.round(cost * 1_000_000) / 1_000_000
  }

  private findPricing(model: string): { input: number; output: number } {
    if (PRICING_USD_PER_MTOK[model]) return PRICING_USD_PER_MTOK[model]!
    // Match por prefijo (alias con sufijo de fecha tipo '-20251001')
    for (const [k, v] of Object.entries(PRICING_USD_PER_MTOK)) {
      if (model.startsWith(k)) return v
    }
    log.warn({ model }, 'unknown model pricing — defaulting to sonnet 4.6')
    return PRICING_USD_PER_MTOK['claude-sonnet-4-6']!
  }

  private hashRequest(
    model: string,
    messages: Anthropic.MessageParam[],
    system: string | undefined,
  ): string {
    const stable = JSON.stringify({ model, system: system ?? null, messages })
    return createHash('sha1').update(stable).digest('hex').slice(0, 16)
  }

  private async insertUsage(row: {
    agent_id: string
    task_id: string | undefined
    module: string
    complexity_level: ComplexityLevel
    provider: 'anthropic'
    model: string
    prompt_tokens: number
    completion_tokens: number
    cost_usd: number
    latency_ms: number
    success: boolean
    error_signature?: string | undefined
    request_hash?: string | undefined
  }): Promise<void> {
    const { error } = await this.supabaseAdmin.from('ai_usage').insert({
      agent_id: row.agent_id,
      task_id: row.task_id ?? null,
      module: row.module,
      complexity_level: row.complexity_level,
      provider: row.provider,
      model: row.model,
      prompt_tokens: row.prompt_tokens,
      completion_tokens: row.completion_tokens,
      cost_usd: row.cost_usd,
      latency_ms: row.latency_ms,
      success: row.success,
      error_signature: row.error_signature ?? null,
      request_hash: row.request_hash ?? null,
    })
    if (error) {
      // No re-lanzamos: el tracking no debe romper el flujo principal.
      log.error({ err: error }, 'failed to insert ai_usage row')
    }
  }
}
