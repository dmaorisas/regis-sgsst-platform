-- =========================================================
-- Migration: 008_audit_log
-- Task: T-F1-008 — audit_log particionado por mes (append-only)
-- Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/20
-- Author: Operador-Agent
-- =========================================================
-- ERD v1 D-ERD-05 + ADR-003. Append-only, particionado por mes.
-- Crea 13 particiones (mes actual + 12 futuros). pg-boss F1.5 mantendrá particiones.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  regis_org_id UUID,
  company_id UUID,
  actor_id UUID,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'system', 'agent', 'auditor')),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  before_state JSONB,
  after_state JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

COMMENT ON TABLE public.audit_log IS 'D-ERD-05 + ADR-003: append-only, particionado por mes. Particiones próximas se crean en cron pg-boss F1.5.';

-- Crear particiones para próximos 13 meses (mes actual + 12)
DO $$
DECLARE
  start_date DATE := DATE_TRUNC('month', CURRENT_DATE);
  i INT;
  partition_name TEXT;
  start_partition DATE;
  end_partition DATE;
BEGIN
  FOR i IN 0..12 LOOP
    start_partition := start_date + (i || ' month')::INTERVAL;
    end_partition := start_date + ((i+1) || ' month')::INTERVAL;
    partition_name := 'audit_log_' || TO_CHAR(start_partition, 'YYYY_MM');
    EXECUTE format('CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.audit_log FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_partition, end_partition);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.audit_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_log(action, created_at DESC);

-- Trigger que prohíbe UPDATE/DELETE en audit_log
CREATE OR REPLACE FUNCTION public.fn_prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is APPEND-ONLY (D-ERD-05, ADR-003). UPDATE/DELETE not allowed.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_no_update ON public.audit_log;
CREATE TRIGGER trg_audit_no_update
  BEFORE UPDATE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_audit_modification();

DROP TRIGGER IF EXISTS trg_audit_no_delete ON public.audit_log;
CREATE TRIGGER trg_audit_no_delete
  BEFORE DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_audit_modification();
