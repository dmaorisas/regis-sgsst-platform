-- =========================================================
-- Migration: 20260506120000_medical_exams
-- Task: Módulo 2 - Procesamiento de exámenes médicos
-- =========================================================

CREATE TABLE IF NOT EXISTS public.medical_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    file_path_storage TEXT NOT NULL,
    exam_date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('ingreso', 'periodico', 'egreso', 'post_incapacidad')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_exams_worker ON public.medical_exams(worker_id);
CREATE INDEX IF NOT EXISTS idx_medical_exams_company ON public.medical_exams(company_id);

CREATE TRIGGER trg_medical_exams_updated_at
    BEFORE UPDATE ON public.medical_exams
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_updated_at();

COMMENT ON TABLE public.medical_exams IS 'Registro de exámenes médicos ocupacionales subidos al bucket seguro.';


CREATE TABLE IF NOT EXISTS public.medical_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES public.medical_exams(id) ON DELETE CASCADE,
    recommendation_text TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('recomendacion', 'restriccion', 'reubicacion')),
    duration_days INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_recommendations_exam ON public.medical_recommendations(exam_id);

COMMENT ON TABLE public.medical_recommendations IS 'Recomendaciones y restricciones extraídas automáticamente vía IA desde el PDF del examen.';


-- =========================================================
-- Row Level Security (RLS)
-- =========================================================

ALTER TABLE public.medical_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_recommendations ENABLE ROW LEVEL SECURITY;

-- Select policies
CREATE POLICY "Users can view medical exams of their company" ON public.medical_exams
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.user_company_role WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view recommendations of their company exams" ON public.medical_recommendations
    FOR SELECT USING (
        exam_id IN (
            SELECT id FROM public.medical_exams WHERE company_id IN (
                SELECT company_id FROM public.user_company_role WHERE user_id = auth.uid()
            )
        )
    );

-- Insert policies
CREATE POLICY "Users can insert medical exams for their company" ON public.medical_exams
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.user_company_role WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert recommendations for their company exams" ON public.medical_recommendations
    FOR INSERT WITH CHECK (
        exam_id IN (
            SELECT id FROM public.medical_exams WHERE company_id IN (
                SELECT company_id FROM public.user_company_role WHERE user_id = auth.uid()
            )
        )
    );

-- Update policies (only own company)
CREATE POLICY "Users can update medical exams of their company" ON public.medical_exams
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.user_company_role WHERE user_id = auth.uid()
        )
    );

-- Delete policies (only own company)
CREATE POLICY "Users can delete medical exams of their company" ON public.medical_exams
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM public.user_company_role WHERE user_id = auth.uid()
        )
    );
