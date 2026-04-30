-- =========================================================
-- Migration: 000_init (timestamped 20260430012121_init.sql)
-- Task: T-F1-001 — Supabase migrations pipeline + ERD v1 (D-006 fusion)
-- Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/19
-- Author: Operador-Agent
-- =========================================================
-- Propósito: validar end-to-end el pipeline de migrations Supabase
-- (CLI -> DB remoto -> verificación). Esta tabla es temporal y
-- se eliminará en la migración 001 (T-F1-002 / siguientes).
-- =========================================================

CREATE TABLE IF NOT EXISTS public._migration_test (
  id          SERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public._migration_test
  IS 'Tabla temporal del pipeline de migrations (T-F1-001). Se elimina en migración 001.';
