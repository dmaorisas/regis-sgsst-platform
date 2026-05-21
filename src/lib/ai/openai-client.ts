// OpenAI client via fetch — no SDK dependency needed.
// Uses the same pattern as groq-client.ts for consistency.

import type { SupabaseClient } from '@supabase/supabase-js'
import { createLogger } from '@/lib/logger'

const log = createLogger({ module: 'ai:openai' })

const PRICING_USD_PER_MTOK: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4.1': { input: 2.0, output: 8.0 },
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
  'gpt-4.1-nano': { input: 0.1, output: 0.4 },
}

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
}

export class OpenAIClient {
  private apiKey: string
  private supabaseAdmin: SupabaseClient | null

  constructor(supabaseAdmin?: SupabaseClient) {
    this.apiKey = process.env.OPENAI_API_KEY || ''
    this.supabaseAdmin = supabaseAdmin ?? null
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY missing — set it in .env.local')
    }
  }

  async chat(opts: {
    model?: string
    messages: ChatMessage[]
    temperature?: number
    max_tokens?: number
    agent_id?: string
    module?: string
  }): Promise<{ text: string; usage: { prompt_tokens: number; completion_tokens: number } }> {
    const model = opts.model ?? 'gpt-4o'
    const start = Date.now()

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: opts.temperature ?? 0,
        max_tokens: opts.max_tokens ?? 4096,
        messages: opts.messages,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      const latencyMs = Date.now() - start
      log.error({ model, status: response.status, latency_ms: latencyMs }, 'openai call failed')
      await this.trackUsage({
        agent_id: opts.agent_id ?? 'unknown',
        module: opts.module ?? 'unknown',
        model,
        prompt_tokens: 0,
        completion_tokens: 0,
        latency_ms: latencyMs,
        success: false,
        error_signature: errText.slice(0, 200),
      })
      throw new Error(`OpenAI API Error (${response.status}): ${errText.slice(0, 300)}`)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ''
    const usage = data.usage ?? { prompt_tokens: 0, completion_tokens: 0 }
    const latencyMs = Date.now() - start

    const pricing = PRICING_USD_PER_MTOK[model] ?? PRICING_USD_PER_MTOK['gpt-4o']!
    const costUsd =
      Math.round(
        ((usage.prompt_tokens * pricing.input + usage.completion_tokens * pricing.output) /
          1_000_000) *
          1_000_000,
      ) / 1_000_000

    log.info(
      {
        model,
        module: opts.module,
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        cost_usd: costUsd,
        latency_ms: latencyMs,
      },
      'openai invocation ok',
    )

    await this.trackUsage({
      agent_id: opts.agent_id ?? 'unknown',
      module: opts.module ?? 'unknown',
      model,
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      cost_usd: costUsd,
      latency_ms: latencyMs,
      success: true,
    })

    return { text, usage }
  }

  async generateText(
    systemPrompt: string,
    userPrompt: string,
    model: string = 'gpt-4o',
  ): Promise<string> {
    const result = await this.chat({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })
    return result.text
  }

  private async trackUsage(row: {
    agent_id: string
    module: string
    model: string
    prompt_tokens: number
    completion_tokens: number
    cost_usd?: number
    latency_ms: number
    success: boolean
    error_signature?: string
  }): Promise<void> {
    if (!this.supabaseAdmin) return
    try {
      await this.supabaseAdmin.from('ai_usage').insert({
        agent_id: row.agent_id ?? 'medical_extractor_agent',
        module: row.module ?? 'medical_exams',
        complexity_level: 'complex',
        provider: 'openai',
        model: row.model,
        prompt_tokens: row.prompt_tokens,
        completion_tokens: row.completion_tokens,
        cost_usd: row.cost_usd ?? 0,
        latency_ms: row.latency_ms,
        success: row.success,
        error_signature: row.error_signature ?? null,
      })
    } catch (e) {
      log.error({ err: e }, 'failed to insert ai_usage row')
    }
  }
}
