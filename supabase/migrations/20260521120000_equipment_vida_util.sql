-- =========================================================
-- Migration: 20260521120000_equipment_vida_util
-- Adds vida_util expiration column to emergency_equipment
-- =========================================================

ALTER TABLE public.emergency_equipment
    ADD COLUMN IF NOT EXISTS fecha_vencimiento_vida_util DATE;

COMMENT ON COLUMN public.emergency_equipment.fecha_vencimiento IS 'Fecha de vencimiento de la proxima revision periodica.';
COMMENT ON COLUMN public.emergency_equipment.fecha_vencimiento_vida_util IS 'Fecha de vencimiento de la vida util total del articulo.';

CREATE INDEX IF NOT EXISTS idx_emergency_equipment_vida_util
    ON public.emergency_equipment(fecha_vencimiento_vida_util)
    WHERE fecha_vencimiento_vida_util IS NOT NULL;
