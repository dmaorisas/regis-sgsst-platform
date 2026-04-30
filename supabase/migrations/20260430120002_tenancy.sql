-- =========================================================
-- Migration: 002_tenancy
-- Task: T-F1-002 — Tenancy base (regis_orgs, companies, centros, users, roles, user_company_role)
-- Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/20
-- Author: Operador-Agent
-- =========================================================
-- ERD v1 §TENANCY · ADR-002 (multi-empresa, capítulo derivado, centros)
-- ADR-007 (4 roles para concurso) · D-003 multi-empresa adaptable
-- =========================================================

-- Trigger universal updated_at (utilidad para todas las migrations posteriores)
CREATE OR REPLACE FUNCTION public.fn_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.fn_update_updated_at()
  IS 'Trigger genérico que actualiza updated_at en cada UPDATE. Aplicado a todas las tablas mutables.';

-- =========================================================
-- regis_orgs: organizaciones consultoras (top tenant per ADR-002 + D-003)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.regis_orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  nit TEXT UNIQUE,
  direccion TEXT,
  contacto_principal TEXT,
  email_contacto TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
DROP TRIGGER IF EXISTS trg_regis_orgs_updated_at ON public.regis_orgs;
CREATE TRIGGER trg_regis_orgs_updated_at
  BEFORE UPDATE ON public.regis_orgs
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_updated_at();
COMMENT ON TABLE public.regis_orgs IS 'ERD v1 + ADR-002 + D-003. Top tenant: organizaciones consultoras que administran N empresas.';

-- =========================================================
-- companies: empresas cliente (ADR-002 — multi-CIIU via empresa_ciiu N:M)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regis_org_id UUID NOT NULL REFERENCES public.regis_orgs(id) ON DELETE RESTRICT,
  nit TEXT NOT NULL,
  razon_social TEXT NOT NULL,
  numero_trabajadores INT NOT NULL CHECK (numero_trabajadores >= 0),
  ciiu_principal TEXT, -- denormalizado; FK lógica a ciiu_codes (creado en 003); set FK formal en 003
  clase_riesgo INT CHECK (clase_riesgo BETWEEN 1 AND 5),
  capitulo_aplicable CHAR(1) CHECK (capitulo_aplicable IN ('I', 'II', 'III')),
  ciudad TEXT,
  direccion TEXT,
  ano_constitucion INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (regis_org_id, nit)
);
CREATE INDEX IF NOT EXISTS idx_companies_regis_org ON public.companies(regis_org_id);
CREATE INDEX IF NOT EXISTS idx_companies_nit ON public.companies(nit);
DROP TRIGGER IF EXISTS trg_companies_updated_at ON public.companies;
CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_updated_at();
COMMENT ON TABLE public.companies IS 'Empresas cliente. ADR-002: capitulo_aplicable derivado de (numero_trabajadores, clase_riesgo). D-003 multi-empresa adaptable.';

-- =========================================================
-- centros_de_trabajo: ADR-002 entidad de primera clase
-- =========================================================
CREATE TABLE IF NOT EXISTS public.centros_de_trabajo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  ciiu_centro TEXT, -- puede diferir del CIIU principal de la empresa (ADR-002); FK lógica a ciiu_codes
  clase_riesgo_centro INT CHECK (clase_riesgo_centro BETWEEN 1 AND 5),
  ciudad TEXT,
  direccion TEXT,
  numero_trabajadores INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_centros_company ON public.centros_de_trabajo(company_id);
DROP TRIGGER IF EXISTS trg_centros_updated_at ON public.centros_de_trabajo;
CREATE TRIGGER trg_centros_updated_at
  BEFORE UPDATE ON public.centros_de_trabajo
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_updated_at();
COMMENT ON TABLE public.centros_de_trabajo IS 'ADR-002: una empresa puede tener N centros con CIIU/riesgo distintos. Resolución 0312 Art. 8 evalúa por centro.';

-- =========================================================
-- users: usuarios del sistema (compatibles con Supabase Auth via auth_uid)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_uid UUID UNIQUE, -- FK lógica a auth.users(id) de Supabase Auth
  email TEXT UNIQUE NOT NULL,
  nombre_completo TEXT NOT NULL,
  telefono TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_updated_at();
COMMENT ON TABLE public.users IS 'Usuarios del sistema. auth_uid mapea a auth.users(id) de Supabase Auth.';

-- =========================================================
-- roles: per ADR-007 (4 roles para concurso)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE CHECK (nombre IN ('regis_admin', 'regis_consultant', 'client_admin', 'worker')),
  descripcion TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.roles IS 'ADR-007: 4 roles para concurso (regis_admin, regis_consultant, client_admin, worker).';

-- Seed de roles (idempotente)
INSERT INTO public.roles (nombre, descripcion) VALUES
  ('regis_admin', 'Administrador de la consultora Regis. Acceso total a todas las empresas de su org.'),
  ('regis_consultant', 'Consultor de Regis. Asignado a empresas específicas.'),
  ('client_admin', 'Administrador de empresa cliente. Acceso a su empresa solamente.'),
  ('worker', 'Trabajador de empresa cliente. Acceso a sus datos personales.')
ON CONFLICT (nombre) DO NOTHING;

-- =========================================================
-- user_company_role: N:M con scope (per ADR-002 user_company_role + D-003)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.user_company_role (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  regis_org_id UUID NOT NULL REFERENCES public.regis_orgs(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE, -- NULLABLE: si NULL = scope toda la org Regis (regis_admin/consultant)
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  granted_by UUID REFERENCES public.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, regis_org_id, company_id, role_id)
);
CREATE INDEX IF NOT EXISTS idx_ucr_user ON public.user_company_role(user_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_ucr_company ON public.user_company_role(company_id) WHERE is_active = TRUE;
DROP TRIGGER IF EXISTS trg_ucr_updated_at ON public.user_company_role;
CREATE TRIGGER trg_ucr_updated_at
  BEFORE UPDATE ON public.user_company_role
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_updated_at();
COMMENT ON TABLE public.user_company_role IS 'D-ERD-08: company_id NULL = scope consultora (regis_admin/consultant ven todas las empresas de su regis_org).';
