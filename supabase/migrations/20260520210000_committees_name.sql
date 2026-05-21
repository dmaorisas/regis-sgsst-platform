-- =========================================================
-- Migration: 20260520210000_committees_name
-- Task: Añadir nombre personalizado a comités
-- =========================================================

ALTER TABLE public.committees ADD COLUMN IF NOT EXISTS nombre TEXT;

COMMENT ON COLUMN public.committees.nombre IS 'Nombre personalizado del comité (ej: COPASST Principal, Convivencia Planta 2).';
