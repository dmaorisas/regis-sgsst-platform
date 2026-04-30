-- =========================================================
-- Migration: 005_standards_0312 (CRÍTICA)
-- Task: T-F1-005 — Estándares Resolución 0312/2019 (60 estándares, motor de cumplimiento)
-- Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/20
-- Author: Operador-Agent
-- =========================================================
-- ERD v1 D-ERD-11/12. Seed: docs/research/standards_0312_seed.json (60 estándares).
-- Validación post-seed: SUM(weight_capitulo_iii) WHERE applies_chapter_iii=TRUE = 100.0
-- Distribución PHVA esperada: Planear=25, Hacer=60, Verificar=5, Actuar=10
-- =========================================================

CREATE TABLE IF NOT EXISTS public.standards_0312 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_number TEXT NOT NULL UNIQUE,
  standard_group TEXT NOT NULL,
  subgroup TEXT,
  name TEXT NOT NULL,
  description TEXT,
  cycle_phva TEXT NOT NULL CHECK (cycle_phva IN ('Planear', 'Hacer', 'Verificar', 'Actuar')),
  weight_capitulo_iii DECIMAL(5,2) NOT NULL CHECK (weight_capitulo_iii >= 0),
  applies_chapter_i BOOLEAN NOT NULL DEFAULT FALSE,
  applies_chapter_ii BOOLEAN NOT NULL DEFAULT FALSE,
  applies_chapter_iii BOOLEAN NOT NULL DEFAULT TRUE,
  evidence_types TEXT[] NOT NULL DEFAULT '{}',
  frequency_days INT,
  is_critical BOOLEAN NOT NULL DEFAULT FALSE,
  source_reference TEXT NOT NULL DEFAULT 'Resolución 0312/2019, Tabla de Valores',
  requires_validation_with_regis BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_std_chapter_iii ON public.standards_0312(applies_chapter_iii) WHERE applies_chapter_iii = TRUE;
CREATE INDEX IF NOT EXISTS idx_std_cycle ON public.standards_0312(cycle_phva);
DROP TRIGGER IF EXISTS trg_std_updated_at ON public.standards_0312;
CREATE TRIGGER trg_std_updated_at
  BEFORE UPDATE ON public.standards_0312
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_updated_at();
COMMENT ON TABLE public.standards_0312 IS 'CRÍTICO: 60 estándares Resolución 0312/2019. Seed desde docs/research/standards_0312_seed.json. SUM(weight_capitulo_iii) WHERE applies_chapter_iii=TRUE = 100.0';
