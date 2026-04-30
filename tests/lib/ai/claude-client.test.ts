// =========================================================
// Tests — ClaudeClient (T-F15-011)
// =========================================================
// Mockeamos el SDK de Anthropic y el cliente Supabase para verificar
// que cada invocación inserta exactamente UNA fila en `ai_usage`,
// con prompt_tokens / completion_tokens / cost_usd correctamente
// calculados.
// =========================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ClaudeClient, type ClaudeInvokeParams } from '@/lib/ai/claude-client'

// ---------- mock Supabase ----------
type Insert = { table: string; row: Record<string, unknown> }

function makeMockSupabase() {
  const inserts: Insert[] = []
  const supabase = {
    from(table: string) {
      return {
        insert(row: Record<string, unknown>) {
          inserts.push({ table, row })
          return Promise.resolve({ error: null }) as unknown as Promise<{ error: null }> & {
            then: (cb: (v: { error: null }) => unknown) => unknown
          }
        },
      }
    },
  }
  return { supabase: supabase as never, inserts }
}

// ---------- mock Anthropic SDK ----------
type MockResponse = {
  id: string
  type: 'message'
  role: 'assistant'
  content: Array<{ type: 'text'; text: string }>
  model: string
  stop_reason: string
  stop_sequence: null
  usage: { input_tokens: number; output_tokens: number }
}

function makeMockSdk(usage: { input: number; output: number }, shouldThrow = false) {
  const create = vi.fn(async () => {
    if (shouldThrow) throw new Error('rate_limit_exceeded')
    const r: MockResponse = {
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'ok' }],
      model: 'claude-sonnet-4-6',
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: usage.input, output_tokens: usage.output },
    }
    return r
  })
  const sdk = { messages: { create } }
  return { sdk: sdk as never, create }
}

const baseParams: Omit<ClaudeInvokeParams, 'messages'> = {
  agent_id: 'operador_agent',
  task_id: 'T-TEST-001',
  module: 'unit_test',
  complexity_level: 'medium',
}

describe('ClaudeClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inserts a row in ai_usage on successful invocation with correct cost', async () => {
    const { supabase, inserts } = makeMockSupabase()
    const { sdk, create } = makeMockSdk({ input: 1000, output: 500 })
    const client = ClaudeClient.fromInjected(supabase, sdk)

    const r = await client.invoke({
      ...baseParams,
      messages: [{ role: 'user', content: 'hola' }],
    })

    expect(create).toHaveBeenCalledTimes(1)
    expect(r.usage.input_tokens).toBe(1000)

    expect(inserts).toHaveLength(1)
    expect(inserts[0]!.table).toBe('ai_usage')
    const row = inserts[0]!.row as {
      success: boolean
      provider: string
      model: string
      prompt_tokens: number
      completion_tokens: number
      cost_usd: number
      latency_ms: number
      module: string
      complexity_level: string
      agent_id: string
      task_id: string
      request_hash: string
    }
    expect(row.success).toBe(true)
    expect(row.provider).toBe('anthropic')
    expect(row.model).toBe('claude-sonnet-4-6')
    expect(row.prompt_tokens).toBe(1000)
    expect(row.completion_tokens).toBe(500)
    // Sonnet 4.6: $3/MTok input + $15/MTok output
    // 1000 * 3/1e6 + 500 * 15/1e6 = 0.003 + 0.0075 = 0.0105
    expect(row.cost_usd).toBeCloseTo(0.0105, 6)
    expect(row.module).toBe('unit_test')
    expect(row.complexity_level).toBe('medium')
    expect(row.agent_id).toBe('operador_agent')
    expect(row.task_id).toBe('T-TEST-001')
    expect(row.request_hash).toMatch(/^[0-9a-f]{16}$/)
    expect(row.latency_ms).toBeGreaterThanOrEqual(0)
  })

  it('uses haiku for trivial/simple complexity', async () => {
    const { supabase, inserts } = makeMockSupabase()
    const { sdk } = makeMockSdk({ input: 200, output: 50 })
    const client = ClaudeClient.fromInjected(supabase, sdk)

    await client.invoke({
      ...baseParams,
      complexity_level: 'simple',
      messages: [{ role: 'user', content: 'short' }],
    })

    const row = inserts[0]!.row as { model: string; cost_usd: number }
    expect(row.model).toBe('claude-haiku-4-5')
    // Haiku 4.5: $1/MTok input + $5/MTok output
    // 200 * 1/1e6 + 50 * 5/1e6 = 0.0002 + 0.00025 = 0.00045
    expect(row.cost_usd).toBeCloseTo(0.00045, 6)
  })

  it('inserts a row with success=false when SDK throws', async () => {
    const { supabase, inserts } = makeMockSupabase()
    const { sdk } = makeMockSdk({ input: 0, output: 0 }, /* shouldThrow */ true)
    const client = ClaudeClient.fromInjected(supabase, sdk)

    await expect(
      client.invoke({ ...baseParams, messages: [{ role: 'user', content: 'x' }] }),
    ).rejects.toThrow(/rate_limit_exceeded/)

    expect(inserts).toHaveLength(1)
    const row = inserts[0]!.row as {
      success: boolean
      cost_usd: number
      prompt_tokens: number
      completion_tokens: number
      error_signature: string
    }
    expect(row.success).toBe(false)
    expect(row.cost_usd).toBe(0)
    expect(row.prompt_tokens).toBe(0)
    expect(row.completion_tokens).toBe(0)
    expect(row.error_signature).toContain('rate_limit_exceeded')
  })

  it('honors explicit model override and still tracks pricing by prefix', async () => {
    const { supabase, inserts } = makeMockSupabase()
    const { sdk } = makeMockSdk({ input: 100, output: 100 })
    const client = ClaudeClient.fromInjected(supabase, sdk)

    await client.invoke({
      ...baseParams,
      complexity_level: 'critical',
      model: 'claude-sonnet-4-6-20251015',
      messages: [{ role: 'user', content: 'override test' }],
    })

    const row = inserts[0]!.row as { model: string; cost_usd: number }
    expect(row.model).toBe('claude-sonnet-4-6-20251015')
    // Pricing matched by prefix → sonnet 4.6: 100*3/1e6 + 100*15/1e6
    expect(row.cost_usd).toBeCloseTo(0.0018, 6)
  })

  it('produces a stable request_hash for identical inputs', async () => {
    const { supabase, inserts } = makeMockSupabase()
    const { sdk } = makeMockSdk({ input: 10, output: 10 })
    const client = ClaudeClient.fromInjected(supabase, sdk)

    const msg = { role: 'user' as const, content: 'idem' }
    await client.invoke({ ...baseParams, messages: [msg] })
    await client.invoke({ ...baseParams, messages: [msg] })

    expect(inserts).toHaveLength(2)
    const h1 = (inserts[0]!.row as { request_hash: string }).request_hash
    const h2 = (inserts[1]!.row as { request_hash: string }).request_hash
    expect(h1).toBe(h2)
  })
})
