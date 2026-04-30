-- =========================================================
-- Migration: 011_fix_applicable_chapter
-- Task: T-F1-003 (corrección post-aplicación)
-- Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/20
-- Author: Operador-Agent
-- =========================================================
-- Ajuste R7: el spec definía ciiu_hazard_mapping.applicable_chapter como CHAR(1),
-- pero el seed real (ciiu_hazard_mapping_seed.json) trae valores 'I', 'II', 'III'
-- (1-3 caracteres), causando "value too long for type character(1)".
-- Cambiamos a TEXT con CHECK para alinear migration con datos reales del seed.
-- =========================================================

ALTER TABLE public.ciiu_hazard_mapping
  ALTER COLUMN applicable_chapter TYPE TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'ciiu_hazard_mapping_applicable_chapter_check'
  ) THEN
    ALTER TABLE public.ciiu_hazard_mapping
      ADD CONSTRAINT ciiu_hazard_mapping_applicable_chapter_check
      CHECK (applicable_chapter IN ('I', 'II', 'III'));
  END IF;
END $$;
