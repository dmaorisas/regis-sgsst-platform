-- =========================================================
-- Migration: 004_workers
-- Task: T-F1-004 — Trabajadores y vínculos N:M (workers, worker_company, empresa_ciiu)
-- Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/20
-- Author: Operador-Agent
-- =========================================================
-- ERD v1 D-ERD-01 (workers desacoplado) · D-ERD-02 (multi-CIIU) · ADR-002
-- =========================================================

CREATE TABLE IF NOT EXISTS public.workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cedula TEXT NOT NULL UNIQUE,
  tipo_documento TEXT NOT NULL DEFAULT 'CC',
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  fecha_nacimiento DATE,
  sexo CHAR(1) CHECK (sexo IN ('M', 'F', 'O')),
  email TEXT,
  telefono TEXT,
  eps_id UUID REFERENCES public.eps_catalog(id),
  afp_id UUID REFERENCES public.afp_catalog(id),
  arl_id UUID REFERENCES public.arl_catalog(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_workers_cedula ON public.workers(cedula);
DROP TRIGGER IF EXISTS trg_workers_updated_at ON public.workers;
CREATE TRIGGER trg_workers_updated_at
  BEFORE UPDATE ON public.workers
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_updated_at();
COMMENT ON TABLE public.workers IS 'D-ERD-01: workers desacoplado con worker_company pivot histórico. Cédula PK natural global.';

-- =========================================================
-- worker_company: N:M histórico
-- =========================================================
CREATE TABLE IF NOT EXISTS public.worker_company (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  centro_de_trabajo_id UUID REFERENCES public.centros_de_trabajo(id) ON DELETE SET NULL,
  cargo TEXT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  is_active BOOLEAN GENERATED ALWAYS AS (fecha_fin IS NULL) STORED,
  arl_id UUID REFERENCES public.arl_catalog(id),
  salario_base DECIMAL(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);
CREATE INDEX IF NOT EXISTS idx_wc_worker ON public.worker_company(worker_id);
CREATE INDEX IF NOT EXISTS idx_wc_company ON public.worker_company(company_id) WHERE is_active = TRUE;
DROP TRIGGER IF EXISTS trg_wc_updated_at ON public.worker_company;
CREATE TRIGGER trg_wc_updated_at
  BEFORE UPDATE ON public.worker_company
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_updated_at();
COMMENT ON TABLE public.worker_company IS 'D-ERD-01: vínculo histórico trabajador-empresa-centro. is_active derivado de fecha_fin IS NULL.';

-- =========================================================
-- empresa_ciiu: N:M D-ERD-02
-- =========================================================
CREATE TABLE IF NOT EXISTS public.empresa_ciiu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ciiu_codigo TEXT NOT NULL REFERENCES public.ciiu_codes(codigo),
  is_principal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, ciiu_codigo)
);
CREATE INDEX IF NOT EXISTS idx_ec_company ON public.empresa_ciiu(company_id);
COMMENT ON TABLE public.empresa_ciiu IS 'ADR-002 multi-CIIU: una empresa puede tener N CIIU. Solo uno is_principal=TRUE (validar en app).';
