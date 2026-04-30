-- =========================================================
-- T-F15-002 — ai_outputs_pending_review (cola de revisión humana)
-- =========================================================
-- Capa 2 anti-alucinación (ADR-006). Cuando un agente IA produce un
-- output con confidence < umbral o el módulo está marcado como crítico,
-- en lugar de persistirlo directo en las tablas de dominio se inserta
-- aquí. Un regis_admin / regis_consultant lo revisa, aprueba/rechaza/
-- corrige y entonces el resultado fluye al dominio.
--
-- Decisiones técnicas (R7):
--   - `module` es texto libre (no enum) para no acoplar la migration al
--     catálogo de módulos que aún no existe (PILA, exámenes, matrices,
--     actas se introducen en F2-F4).
--   - `ai_usage_id` ON DELETE CASCADE: si se purga el log de uso IA,
--     no tiene sentido conservar la cola de revisión asociada.
--   - `reviewer_id` ON DELETE SET NULL: si un consultor se da de baja,
--     conservamos el histórico anonimizado.
--   - RLS UPDATE solo permite cambios mientras el item está `pending`
--     y obliga a que `reviewer_id` coincida con el usuario actual —
--     evita que dos revisores pisen un mismo item.
--   - INSERT abierto (WITH CHECK TRUE): el inserto siempre lo hace un
--     proceso server-side (agente IA con service_role). RLS no se
--     activa para service_role, así que es defensivo: si algún día se
--     llamara desde un client con sesión, igual deja insertar (la
--     intención es que cualquier flujo IA pueda alimentar la cola).
-- =========================================================

CREATE TABLE IF NOT EXISTS public.ai_outputs_pending_review (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_usage_id     UUID REFERENCES public.ai_usage(id) ON DELETE CASCADE,
  module          TEXT NOT NULL,
  task_id         TEXT,
  request_id      TEXT,
  ai_output       JSONB NOT NULL,
  confidence      DECIMAL(4,3),
  reason_for_review TEXT,

  status          TEXT NOT NULL
                    CHECK (status IN ('pending','approved','rejected','corrected'))
                    DEFAULT 'pending',
  reviewer_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  corrections     JSONB,
  notes           TEXT,

  regis_org_id    UUID,
  company_id      UUID,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_queue_status
  ON public.ai_outputs_pending_review(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_review_queue_module
  ON public.ai_outputs_pending_review(module);

CREATE INDEX IF NOT EXISTS idx_review_queue_company
  ON public.ai_outputs_pending_review(company_id)
  WHERE company_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_review_queue_updated_at ON public.ai_outputs_pending_review;
CREATE TRIGGER trg_review_queue_updated_at
  BEFORE UPDATE ON public.ai_outputs_pending_review
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_updated_at();

-- ---------------------------------------------------------
-- RLS
-- ---------------------------------------------------------
ALTER TABLE public.ai_outputs_pending_review ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_review_queue" ON public.ai_outputs_pending_review;
CREATE POLICY "select_review_queue" ON public.ai_outputs_pending_review
  FOR SELECT
  USING (
    public.is_regis_admin_or_consultant()
    OR (company_id = ANY(public.current_user_companies()))
  );

DROP POLICY IF EXISTS "update_review_queue" ON public.ai_outputs_pending_review;
CREATE POLICY "update_review_queue" ON public.ai_outputs_pending_review
  FOR UPDATE
  USING (
    public.is_regis_admin_or_consultant()
    AND status = 'pending'
  )
  WITH CHECK (
    reviewer_id = public.current_app_user_id()
  );

DROP POLICY IF EXISTS "insert_review_queue" ON public.ai_outputs_pending_review;
CREATE POLICY "insert_review_queue" ON public.ai_outputs_pending_review
  FOR INSERT
  WITH CHECK (TRUE);

COMMENT ON TABLE public.ai_outputs_pending_review IS
  'Cola de revisión humana para outputs IA con baja confianza o módulo crítico (ADR-006).';
