// =========================================================
// LLM Provider — capa agnóstica de proveedor
// =========================================================
// Todos los módulos que necesiten un LLM usan esta interfaz.
// El proveedor se selecciona con LLM_PROVIDER en .env.local.
// Para cambiar de OpenAI a Claude/Gemini/Groq, solo se cambia
// esa variable y se configura la API key correspondiente.
// =========================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import { createLogger } from '@/lib/logger'

const log = createLogger({ module: 'ai:llm-provider' })

// --- Interfaz pública ---

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type LLMRequestOpts = {
  messages: ChatMessage[]
  model?: string
  temperature?: number
  max_tokens?: number
  agent_id?: string
  module?: string
}

export type LLMResponse = {
  text: string
  provider: string
  model: string
  usage: { prompt_tokens: number; completion_tokens: number }
}

export interface LLMProvider {
  readonly name: string
  chat(opts: LLMRequestOpts): Promise<LLMResponse>
}

// --- Pricing por proveedor ---

const PRICING: Record<string, Record<string, { input: number; output: number }>> = {
  openai: {
    'gpt-4o': { input: 2.5, output: 10.0 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-4.1': { input: 2.0, output: 8.0 },
    'gpt-4.1-mini': { input: 0.4, output: 1.6 },
    'gpt-4.1-nano': { input: 0.1, output: 0.4 },
  },
  anthropic: {
    'claude-haiku-4-5': { input: 1.0, output: 5.0 },
    'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
    'claude-opus-4-7': { input: 15.0, output: 75.0 },
  },
  gemini: {
    'gemini-2.5-pro': { input: 1.25, output: 10.0 },
    'gemini-2.5-flash': { input: 0.15, output: 0.6 },
    'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  },
  groq: {
    'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
    'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
  },
}

function calcCost(provider: string, model: string, input: number, output: number): number {
  const providerPricing = PRICING[provider]
  const entry = providerPricing?.[model] ?? Object.values(providerPricing ?? {})[0]
  if (!entry) return 0
  return (
    Math.round(((input * entry.input + output * entry.output) / 1_000_000) * 1_000_000) / 1_000_000
  )
}

// --- Configuración por proveedor ---

type ProviderConfig = {
  envKey: string
  baseUrl: string
  defaultModel: string
  authHeader: (key: string) => Record<string, string>
}

const PROVIDERS: Record<string, ProviderConfig> = {
  openai: {
    envKey: 'OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  anthropic: {
    envKey: 'ANTHROPIC_API_KEY',
    baseUrl: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-sonnet-4-6',
    authHeader: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
  },
  gemini: {
    envKey: 'GEMINI_API_KEY',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/chat/completions',
    defaultModel: 'gemini-2.5-flash',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  groq: {
    envKey: 'GROQ_API_KEY',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
  },
}

// --- Implementación genérica (OpenAI-compatible: openai, groq, gemini) ---

class OpenAICompatibleProvider implements LLMProvider {
  readonly name: string
  private apiKey: string
  private config: ProviderConfig
  private supabaseAdmin: SupabaseClient | null

  constructor(providerName: string, supabaseAdmin: SupabaseClient | null) {
    this.name = providerName
    this.config = PROVIDERS[providerName]!
    this.apiKey = process.env[this.config.envKey] || ''
    this.supabaseAdmin = supabaseAdmin
    if (!this.apiKey) {
      throw new Error(`${this.config.envKey} missing — set it in .env.local`)
    }
  }

  async chat(opts: LLMRequestOpts): Promise<LLMResponse> {
    const model = opts.model ?? this.config.defaultModel
    const start = Date.now()

    const response = await fetch(this.config.baseUrl, {
      method: 'POST',
      headers: {
        ...this.config.authHeader(this.apiKey),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: opts.temperature ?? 0,
        max_tokens: opts.max_tokens ?? 4096,
        messages: opts.messages,
      }),
    })

    const latencyMs = Date.now() - start

    if (!response.ok) {
      const errText = await response.text()
      log.error(
        { provider: this.name, model, status: response.status, latency_ms: latencyMs },
        'llm call failed',
      )
      await this.track(opts, model, 0, 0, 0, latencyMs, false, errText.slice(0, 200))
      throw new Error(`${this.name} API Error (${response.status}): ${errText.slice(0, 300)}`)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ''
    const usage = data.usage ?? { prompt_tokens: 0, completion_tokens: 0 }
    const costUsd = calcCost(this.name, model, usage.prompt_tokens, usage.completion_tokens)

    log.info(
      {
        provider: this.name,
        model,
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        cost_usd: costUsd,
        latency_ms: latencyMs,
      },
      'llm invocation ok',
    )
    await this.track(
      opts,
      model,
      usage.prompt_tokens,
      usage.completion_tokens,
      costUsd,
      latencyMs,
      true,
    )

    return { text, provider: this.name, model, usage }
  }

  private async track(
    opts: LLMRequestOpts,
    model: string,
    pt: number,
    ct: number,
    cost: number,
    latency: number,
    success: boolean,
    err?: string,
  ): Promise<void> {
    if (!this.supabaseAdmin) return
    try {
      await this.supabaseAdmin.from('ai_usage').insert({
        agent_id: opts.agent_id ?? 'unknown',
        module: opts.module ?? 'unknown',
        complexity_level: 'complex',
        provider: this.name,
        model,
        prompt_tokens: pt,
        completion_tokens: ct,
        cost_usd: cost,
        latency_ms: latency,
        success,
        error_signature: err ?? null,
      })
    } catch (e) {
      log.error({ err: e }, 'failed to insert ai_usage row')
    }
  }
}

// --- Anthropic (formato distinto al OpenAI-compatible) ---

class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic'
  private apiKey: string
  private supabaseAdmin: SupabaseClient | null

  constructor(supabaseAdmin: SupabaseClient | null) {
    this.apiKey = process.env.ANTHROPIC_API_KEY || ''
    this.supabaseAdmin = supabaseAdmin
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY missing — set it in .env.local')
    }
  }

  async chat(opts: LLMRequestOpts): Promise<LLMResponse> {
    const model = opts.model ?? 'claude-sonnet-4-6'
    const start = Date.now()

    const systemMsg = opts.messages.find((m) => m.role === 'system')
    const nonSystemMsgs = opts.messages.filter((m) => m.role !== 'system')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: opts.max_tokens ?? 4096,
        temperature: opts.temperature ?? 0,
        ...(systemMsg ? { system: systemMsg.content } : {}),
        messages: nonSystemMsgs.map((m) => ({ role: m.role, content: m.content })),
      }),
    })

    const latencyMs = Date.now() - start

    if (!response.ok) {
      const errText = await response.text()
      log.error(
        { provider: 'anthropic', model, status: response.status, latency_ms: latencyMs },
        'llm call failed',
      )
      await this.track(opts, model, 0, 0, 0, latencyMs, false, errText.slice(0, 200))
      throw new Error(`Anthropic API Error (${response.status}): ${errText.slice(0, 300)}`)
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''
    const usage = data.usage ?? { input_tokens: 0, output_tokens: 0 }
    const pt = usage.input_tokens ?? 0
    const ct = usage.output_tokens ?? 0
    const costUsd = calcCost('anthropic', model, pt, ct)

    log.info(
      {
        provider: 'anthropic',
        model,
        prompt_tokens: pt,
        completion_tokens: ct,
        cost_usd: costUsd,
        latency_ms: latencyMs,
      },
      'llm invocation ok',
    )
    await this.track(opts, model, pt, ct, costUsd, latencyMs, true)

    return {
      text,
      provider: 'anthropic',
      model,
      usage: { prompt_tokens: pt, completion_tokens: ct },
    }
  }

  private async track(
    opts: LLMRequestOpts,
    model: string,
    pt: number,
    ct: number,
    cost: number,
    latency: number,
    success: boolean,
    err?: string,
  ): Promise<void> {
    if (!this.supabaseAdmin) return
    try {
      await this.supabaseAdmin.from('ai_usage').insert({
        agent_id: opts.agent_id ?? 'unknown',
        module: opts.module ?? 'unknown',
        complexity_level: 'complex',
        provider: 'anthropic',
        model,
        prompt_tokens: pt,
        completion_tokens: ct,
        cost_usd: cost,
        latency_ms: latency,
        success,
        error_signature: err ?? null,
      })
    } catch (e) {
      log.error({ err: e }, 'failed to insert ai_usage row')
    }
  }
}

// --- Factory ---

export type SupportedProvider = 'openai' | 'anthropic' | 'gemini' | 'groq'

export function createLLMProvider(supabaseAdmin?: SupabaseClient): LLMProvider {
  const providerName = (process.env.LLM_PROVIDER || 'openai').toLowerCase() as SupportedProvider

  if (!PROVIDERS[providerName]) {
    throw new Error(
      `LLM_PROVIDER="${providerName}" no soportado. Opciones: ${Object.keys(PROVIDERS).join(', ')}`,
    )
  }

  log.info({ provider: providerName }, 'creating LLM provider')

  if (providerName === 'anthropic') {
    return new AnthropicProvider(supabaseAdmin ?? null)
  }

  return new OpenAICompatibleProvider(providerName, supabaseAdmin ?? null)
}

export function getActiveProviderName(): SupportedProvider {
  return (process.env.LLM_PROVIDER || 'openai').toLowerCase() as SupportedProvider
}
