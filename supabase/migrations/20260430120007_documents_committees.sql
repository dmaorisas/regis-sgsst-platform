-- =========================================================
-- Migration: 007_documents_committees
-- Task: T-F1-007 — Documentos, tipos, comités y miembros
-- Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/20
-- Author: Operador-Agent
-- =========================================================
-- ERD v1. Cierra FK standard_evaluations.evidence_id → documents.id.
-- =========================================================

-- =========================================================
-- document_types
-- =========================================================
CREATE TABLE IF NOT EXISTS public.document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  document_frequency_code TEXT REFERENCES public.document_frequencies(document_type),
  is_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
  retention_years INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.document_types IS 'Tipos de documento SG-SST. is_sensitive=TRUE => bucket cifrado (medical_exams_secure).';

INSERT INTO public.document_types (codigo, nombre, is_sensitive, retention_years) VALUES
  ('pila', 'Planilla PILA', FALSE, 5),
  ('examen_medico_ingreso', 'Examen médico ocupacional ingreso', TRUE, 20),
  ('examen_medico_periodico', 'Examen médico periódico', TRUE, 20),
  ('examen_medico_egreso', 'Examen médico egreso', TRUE, 20),
  ('matriz_riesgos', 'Matriz de peligros GTC-45', FALSE, 5),
  ('acta_copasst', 'Acta COPASST', FALSE, 5),
  ('acta_convivencia', 'Acta Comité de Convivencia', FALSE, 5),
  ('plan_emergencias', 'Plan de Emergencias', FALSE, 5),
  ('politica_sgsst', 'Política SG-SST', FALSE, 5),
  ('plan_capacitacion', 'Plan de capacitación SG-SST', FALSE, 5),
  ('inspeccion', 'Inspección de seguridad', FALSE, 3),
  ('investigacion_at', 'Investigación accidente trabajo', FALSE, 20)
ON CONFLICT (codigo) DO NOTHING;

-- =========================================================
-- documents (referenciado por standard_evaluations.evidence_id)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regis_org_id UUID NOT NULL REFERENCES public.regis_orgs(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  centro_id UUID REFERENCES public.centros_de_trabajo(id) ON DELETE SET NULL,
  document_type_id UUID NOT NULL REFERENCES public.document_types(id) ON DELETE RESTRICT,
  worker_id UUID REFERENCES public.workers(id) ON DELETE SET NULL,
  file_url TEXT,
  storage_bucket TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'archived')) DEFAULT 'pending',
  version INT NOT NULL DEFAULT 1,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  uploaded_by UUID REFERENCES public.users(id),
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_doc_company ON public.documents(company_id);
CREATE INDEX IF NOT EXISTS idx_doc_type ON public.documents(document_type_id);
CREATE INDEX IF NOT EXISTS idx_doc_valid_until ON public.documents(valid_until) WHERE valid_until IS NOT NULL;
DROP TRIGGER IF EXISTS trg_doc_updated_at ON public.documents;
CREATE TRIGGER trg_doc_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_updated_at();
COMMENT ON TABLE public.documents IS 'Documentos SG-SST. metadata JSONB para datos de extracción IA y citations.';

-- Cerrar FK pendiente standard_evaluations.evidence_id → documents.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_eval_evidence'
      AND table_name = 'standard_evaluations'
  ) THEN
    ALTER TABLE public.standard_evaluations
      ADD CONSTRAINT fk_eval_evidence
      FOREIGN KEY (evidence_id) REFERENCES public.documents(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =========================================================
-- committees: COPASST, Convivencia, Brigada, Vigía
-- =========================================================
CREATE TABLE IF NOT EXISTS public.committees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL REFERENCES public.centros_de_trabajo(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('copasst', 'vigia_sst', 'convivencia', 'brigada_emergencias')),
  fecha_eleccion DATE,
  fecha_vigencia_fin DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_committees_centro ON public.committees(centro_id);
DROP TRIGGER IF EXISTS trg_committees_updated_at ON public.committees;
CREATE TRIGGER trg_committees_updated_at
  BEFORE UPDATE ON public.committees
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_updated_at();
COMMENT ON TABLE public.committees IS 'COPASST/Vigía/Convivencia/Brigada por centro de trabajo. Vigencia 2 años (Decreto 1295/1994).';

-- =========================================================
-- committee_members
-- =========================================================
CREATE TABLE IF NOT EXISTS public.committee_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE RESTRICT,
  rol TEXT NOT NULL CHECK (rol IN ('presidente', 'secretario', 'principal', 'suplente', 'brigadista')),
  representacion TEXT CHECK (representacion IN ('empleador', 'trabajadores')),
  fecha_designacion DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_termino DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_cm_committee ON public.committee_members(committee_id) WHERE is_active = TRUE;
DROP TRIGGER IF EXISTS trg_cm_updated_at ON public.committee_members;
CREATE TRIGGER trg_cm_updated_at
  BEFORE UPDATE ON public.committee_members
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_updated_at();
COMMENT ON TABLE public.committee_members IS 'Miembros de comités con rol y representación (empleador/trabajadores).';
