-- =========================================================
-- Migration: 013_fix_capitulo_char1
-- Task: T-F1-013 (corrección post-aplicación, descubierta al seedear pilot companies)
-- Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/22
-- Author: Operador-Agent
-- =========================================================
-- Mismo patrón que migration 011_fix_applicable_chapter:
-- companies.capitulo_aplicable y centros equivalente fueron declarados como
-- CHAR(1) en migration 002, pero los valores reales de la Resolución 0312
-- son 'I', 'II' y 'III' (1-3 caracteres). El CHECK ARRAY['I','II','III']::bpchar
-- pasa silenciosamente porque Postgres trunca al comparar, pero al INSERT
-- 'II' falla con "value too long for type character(1)".
--
-- Cambiamos a TEXT manteniendo el mismo CHECK constraint.
-- R5: NO modificamos la migration 002 — usamos el mismo patrón ya
-- aprobado en migration 011 (R7).
-- =========================================================

-- companies.capitulo_aplicable: CHAR(1) -> TEXT (CHECK preserved)
ALTER TABLE public.companies
  ALTER COLUMN capitulo_aplicable TYPE TEXT;

-- El CHECK constraint anterior usa ::bpchar; al cambiar tipo, recrear con TEXT
ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_capitulo_aplicable_check;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_capitulo_aplicable_check
  CHECK (capitulo_aplicable IN ('I', 'II', 'III'));
