-- =========================================================
-- Migration: 20260519190000_emergency_equipment_inventory
-- Task: Inventario y Alertas de Vencimiento de Equipos de Emergencia
-- =========================================================

CREATE TABLE IF NOT EXISTS public.emergency_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    centro_id UUID REFERENCES public.centros_de_trabajo(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('extintor', 'botiquin', 'camilla', 'otro')),
    codigo_interno TEXT NOT NULL,
    descripcion TEXT,
    ubicacion TEXT,
    fecha_ultima_revision DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    estado TEXT NOT NULL CHECK (estado IN ('operativo', 'alerta_vencimiento', 'vencido')) DEFAULT 'operativo',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, codigo_interno)
);

CREATE INDEX IF NOT EXISTS idx_emergency_equipment_company ON public.emergency_equipment(company_id);
CREATE INDEX IF NOT EXISTS idx_emergency_equipment_vencimiento ON public.emergency_equipment(fecha_vencimiento) WHERE estado = 'operativo';

CREATE TRIGGER trg_emergency_equipment_updated_at
    BEFORE UPDATE ON public.emergency_equipment
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_updated_at();

COMMENT ON TABLE public.emergency_equipment IS 'Inventario de equipos de emergencia (extintores, botiquines, camillas) con fecha de vencimiento.';

-- =========================================================
-- Row Level Security (RLS)
-- =========================================================

ALTER TABLE public.emergency_equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_emergency_equipment" ON public.emergency_equipment;
CREATE POLICY "select_emergency_equipment" ON public.emergency_equipment
    FOR SELECT USING (user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "manage_emergency_equipment" ON public.emergency_equipment;
CREATE POLICY "manage_emergency_equipment" ON public.emergency_equipment
    FOR ALL USING (user_has_access_to_company(company_id))
    WITH CHECK (user_has_access_to_company(company_id));
