-- =========================================================
-- Migration: 010_ai_usage
-- Task: T-F1-010 — AI usage tracking (router LLM, loop detector, cost circuit breaker)
-- Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/20
-- Author: Operador-Agent
-- =========================================================
-- governance/06_llm_routing_config: tracking por agente, módulo, costo.
-- Habilita Loop Detector (request_hash) y reportes de cost circuit breaker.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  task_id TEXT,
  module TEXT,
  complexity_level TEXT CHECK (complexity_level IN ('trivial', 'simple', 'medium', 'complex', 'critical')),
  provider TEXT NOT NULL CHECK (provider IN ('anthropic', 'groq', 'gemini', 'openai')),
  model TEXT NOT NULL,
  prompt_tokens INT NOT NULL,
  completion_tokens INT NOT NULL,
  total_tokens INT GENERATED ALWAYS AS (prompt_tokens + completion_tokens) STORED,
  cost_usd DECIMAL(10,6) NOT NULL DEFAULT 0,
  latency_ms INT,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_signature TEXT,
  request_hash TEXT,
  confidence DECIMAL(4,3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_agent_date ON public.ai_usage(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_module ON public.ai_usage(module, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_request_hash ON public.ai_usage(request_hash, created_at) WHERE request_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_error ON public.ai_usage(error_signature, created_at) WHERE error_signature IS NOT NULL;
COMMENT ON TABLE public.ai_usage IS 'governance/06_llm_routing_config: tracking por agente, módulo, costo. Habilita Loop Detector y reportes de cost circuit breaker.';
