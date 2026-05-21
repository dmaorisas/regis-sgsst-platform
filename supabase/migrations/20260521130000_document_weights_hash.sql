-- =========================================================
-- Migration: document_weights_hash
-- Adds: file_hash + source to documents, document_weight_config,
--        missing document_types, duplicate detection index,
--        medical exam mirror trigger, storage bucket
-- =========================================================

-- =========================================================
-- 0. Ensure storage bucket exists
-- =========================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company_documents',
  'company_documents',
  FALSE,
  52428800,  -- 50 MB
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for company_documents bucket
CREATE POLICY "Authenticated users can upload company documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'company_documents');

CREATE POLICY "Authenticated users can read company documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'company_documents');

CREATE POLICY "Authenticated users can delete own company documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'company_documents');

-- =========================================================
-- 1. New columns on documents
-- =========================================================
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS file_hash TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

COMMENT ON COLUMN public.documents.file_hash IS 'SHA-256 hex digest of file content for duplicate detection.';
COMMENT ON COLUMN public.documents.source IS 'Origin channel: manual, webhook_pila, webhook_n8n, medical_mirror.';

-- Non-unique index for fast duplicate lookups.
-- Uniqueness is enforced at the application layer because the same
-- file hash is allowed when the previous document has expired or
-- been archived (renewal flow).
CREATE INDEX IF NOT EXISTS idx_doc_hash_lookup
  ON public.documents(company_id, document_type_id, file_hash)
  WHERE deleted_at IS NULL AND file_hash IS NOT NULL;

-- =========================================================
-- 2. Missing document_types for the 7 weight categories
-- =========================================================
INSERT INTO public.document_types (codigo, nombre, is_sensitive, retention_years) VALUES
  ('actas_recursos', 'Actas de asignación de recursos SST', FALSE, 5),
  ('cronograma_anual', 'Cronograma anual de actividades SG-SST', FALSE, 5),
  ('otros', 'Otros documentos SG-SST', FALSE, 3)
ON CONFLICT (codigo) DO NOTHING;

-- =========================================================
-- 3. document_weight_config — configurable weights per company
-- =========================================================
CREATE TABLE IF NOT EXISTS public.document_weight_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  document_type_code TEXT NOT NULL,
  weight NUMERIC(5,2) NOT NULL CHECK (weight > 0 AND weight <= 100),
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  justification TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, document_type_code)
);

COMMENT ON TABLE public.document_weight_config IS
  'Pesos configurables por tipo de documento para el porcentaje de progreso. '
  'company_id NULL = defaults globales. Override por empresa con company_id NOT NULL.';

DROP TRIGGER IF EXISTS trg_dwc_updated_at ON public.document_weight_config;
CREATE TRIGGER trg_dwc_updated_at
  BEFORE UPDATE ON public.document_weight_config
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_updated_at();

-- =========================================================
-- 4. Seed global defaults (company_id = NULL) — Res. 0312
-- =========================================================
INSERT INTO public.document_weight_config
  (company_id, document_type_code, weight, is_required, justification, sort_order)
VALUES
  (NULL, 'politica_sgsst',        20.00, TRUE,  'Obligatorio Res. 0312, base del sistema',          1),
  (NULL, 'actas_recursos',        15.00, TRUE,  'Estandar 1.1.1 - Asignacion de recursos',          2),
  (NULL, 'plan_capacitacion',     15.00, TRUE,  'Estandar 2.6.1',                                   3),
  (NULL, 'cronograma_anual',      15.00, TRUE,  'Estandar 2.8.1',                                   4),
  (NULL, 'pila',                  15.00, TRUE,  'Estandar 1.2.1 - Pago Seguridad Social',           5),
  (NULL, 'examen_medico_ingreso', 10.00, TRUE,  'Estandar 3.1.1-3.1.4',                             6),
  (NULL, 'otros',                 10.00, FALSE, 'Documentos complementarios',                        7)
ON CONFLICT (company_id, document_type_code) DO NOTHING;

-- =========================================================
-- 5. Medical exam mirror trigger
--    Inserts a row in documents when a medical_exams row is created.
--    Does NOT modify any medical module code.
-- =========================================================
CREATE OR REPLACE FUNCTION public.fn_mirror_medical_exam_to_documents()
RETURNS TRIGGER AS $$
DECLARE
  v_doc_type_id UUID;
  v_regis_org_id UUID;
  v_company_id UUID;
BEGIN
  -- Resolve company_id from the worker
  SELECT w.company_id INTO v_company_id
  FROM public.workers w
  WHERE w.id = NEW.worker_id;

  IF v_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Resolve regis_org_id from the company
  SELECT c.regis_org_id INTO v_regis_org_id
  FROM public.companies c
  WHERE c.id = v_company_id;

  -- Resolve document_type_id for 'examen_medico_ingreso' (default)
  SELECT dt.id INTO v_doc_type_id
  FROM public.document_types dt
  WHERE dt.codigo = 'examen_medico_ingreso';

  IF v_doc_type_id IS NULL OR v_regis_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.documents (
    regis_org_id, company_id, worker_id, document_type_id,
    file_url, storage_bucket, status, source, metadata
  ) VALUES (
    v_regis_org_id, v_company_id, NEW.worker_id, v_doc_type_id,
    NEW.file_url, 'medical_exams_secure', 'approved', 'medical_mirror',
    jsonb_build_object('medical_exam_id', NEW.id)
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mirror_medical_exam ON public.medical_exams;
CREATE TRIGGER trg_mirror_medical_exam
  AFTER INSERT ON public.medical_exams
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_mirror_medical_exam_to_documents();

-- =========================================================
-- 6. RLS for document_weight_config
-- =========================================================
ALTER TABLE public.document_weight_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read weight config"
  ON public.document_weight_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Regis staff can manage weight config"
  ON public.document_weight_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_company_role ucr
      JOIN public.roles r ON r.id = ucr.role_id
      WHERE ucr.user_id = auth.uid()
        AND r.nombre IN ('regis_admin', 'regis_consultant')
        AND ucr.is_active = TRUE
    )
  );
