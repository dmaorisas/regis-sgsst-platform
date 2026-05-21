-- =========================================================
-- Migration: 20260520200000_monthly_logs
-- Task: Bitácora Mensual Automática de Trabajo y Cumplimiento
-- =========================================================

CREATE TABLE IF NOT EXISTS public.monthly_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    month TEXT NOT NULL CHECK (month ~ '^\d{4}-\d{2}$'), -- Formato YYYY-MM
    completed_summary TEXT NOT NULL,
    pending_summary TEXT NOT NULL,
    next_month_plan TEXT NOT NULL,
    ia_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_logs_company ON public.monthly_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_monthly_logs_month ON public.monthly_logs(month);

CREATE TRIGGER trg_monthly_logs_updated_at
    BEFORE UPDATE ON public.monthly_logs
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_updated_at();

COMMENT ON TABLE public.monthly_logs IS 'Bitácoras mensuales autogeneradas por IA sobre el avance del SG-SST.';

-- =========================================================
-- Row Level Security (RLS)
-- =========================================================

ALTER TABLE public.monthly_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_monthly_logs" ON public.monthly_logs;
CREATE POLICY "select_monthly_logs" ON public.monthly_logs
    FOR SELECT USING (user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "manage_monthly_logs" ON public.monthly_logs;
CREATE POLICY "manage_monthly_logs" ON public.monthly_logs
    FOR ALL USING (user_has_access_to_company(company_id))
    WITH CHECK (user_has_access_to_company(company_id));
