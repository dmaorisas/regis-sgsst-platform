-- =========================================================
-- Migration: 006_evaluations
-- Task: T-F1-006 — Evaluaciones y snapshots inmutables
-- Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/20
-- Author: Operador-Agent
-- =========================================================
-- ERD v1 D-ERD-03 (snapshots append-only). Una evaluación por (centro × estándar).
-- evidence_id FK a documents se completa en migration 007.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.standard_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL REFERENCES public.centros_de_trabajo(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  standard_id UUID NOT NULL REFERENCES public.standards_0312(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('cumple', 'no_cumple', 'no_aplica', 'pendiente')) DEFAULT 'pendiente',
  justification TEXT,
  evidence_id UUID, -- FK a documents (se completa en 007)
  evaluator_id UUID REFERENCES public.users(id),
  evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (centro_id, standard_id)
);
CREATE INDEX IF NOT EXISTS idx_eval_centro ON public.standard_evaluations(centro_id);
CREATE INDEX IF NOT EXISTS idx_eval_status ON public.standard_evaluations(status);
DROP TRIGGER IF EXISTS trg_eval_updated_at ON public.standard_evaluations;
CREATE TRIGGER trg_eval_updated_at
  BEFORE UPDATE ON public.standard_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_updated_at();
COMMENT ON TABLE public.standard_evaluations IS 'Evaluación por centro × estándar. justification requerida si status=no_aplica (validar en app).';

-- =========================================================
-- evaluation_snapshots: D-ERD-03 INMUTABLE (APPEND-ONLY)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.evaluation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL REFERENCES public.centros_de_trabajo(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  total_percentage DECIMAL(5,2) NOT NULL,
  by_cycle JSONB NOT NULL,
  by_standard JSONB NOT NULL,
  total_evaluated INT NOT NULL,
  total_aplicables INT NOT NULL,
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- NO updated_at, NO deleted_at — APPEND ONLY
);
CREATE INDEX IF NOT EXISTS idx_snap_centro_date ON public.evaluation_snapshots(centro_id, snapshot_date DESC);
COMMENT ON TABLE public.evaluation_snapshots IS 'D-ERD-03: snapshots inmutables (APPEND-ONLY) de evaluación. Hash SHA-256 garantiza inmutabilidad.';

-- Trigger que prohíbe UPDATE/DELETE en snapshots (inmutabilidad)
CREATE OR REPLACE FUNCTION public.fn_prevent_snapshot_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'evaluation_snapshots is APPEND-ONLY (D-ERD-03). UPDATE/DELETE not allowed.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_snap_no_update ON public.evaluation_snapshots;
CREATE TRIGGER trg_snap_no_update
  BEFORE UPDATE ON public.evaluation_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_snapshot_modification();

DROP TRIGGER IF EXISTS trg_snap_no_delete ON public.evaluation_snapshots;
CREATE TRIGGER trg_snap_no_delete
  BEFORE DELETE ON public.evaluation_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_snapshot_modification();
