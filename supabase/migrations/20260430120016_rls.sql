-- =========================================================
-- Migration: 012_rls
-- Tasks: T-F1-011 + T-F1-012 — RLS multi-tenant + helpers
-- Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/21
-- Author: Operador-Agent
-- =========================================================
-- ERD v1 + ADR-002 + ADR-007 + D-003 + D-ERD-08.
-- Notas técnicas (R7):
--   * standard_evaluations / evaluation_snapshots / committees / documents
--     todas tienen company_id directa (verificado en migrations 006/007). Por eso
--     las policies usan user_has_access_to_company(company_id) sin pasar por centro.
--   * ai_usage NO tiene regis_org_id ni company_id; scope se limita a regis_admin/consultant.
--   * audit_log es PARTITIONED. ENABLE RLS aplica a la tabla padre y todas las particiones heredan.
--   * service_role bypassa RLS por convención de Supabase (no se requiere policy explícita).
--   * Catálogos públicos (ciiu_codes, eps_catalog, afp_catalog, arl_catalog,
--     standards_0312, ciiu_hazard_mapping, document_frequencies, document_types, roles)
--     intencionalmente NO llevan ENABLE RLS (lectura pública para autenticados).
-- =========================================================

-- =========================================================
-- 1) Helper functions (SECURITY DEFINER, STABLE)
-- =========================================================

-- Returns the public.users.id of the currently authenticated user (matches auth.uid)
CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM users WHERE auth_uid = auth.uid() AND deleted_at IS NULL LIMIT 1
$$;

COMMENT ON FUNCTION public.current_app_user_id()
  IS 'Returns public.users.id of authenticated user. SECURITY DEFINER bypasses caller RLS.';

-- Returns the regis_org_id where current user has active role
CREATE OR REPLACE FUNCTION public.current_user_regis_org()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT regis_org_id FROM user_company_role
  WHERE user_id = current_app_user_id() AND is_active = TRUE
  LIMIT 1
$$;

COMMENT ON FUNCTION public.current_user_regis_org()
  IS 'Returns regis_org_id of authenticated user (first active role). SECURITY DEFINER.';

-- Returns array of company IDs the current user has access to
CREATE OR REPLACE FUNCTION public.current_user_companies()
RETURNS UUID[]
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    array_agg(DISTINCT company_id) FILTER (WHERE company_id IS NOT NULL),
    ARRAY[]::UUID[]
  )
  FROM user_company_role
  WHERE user_id = current_app_user_id() AND is_active = TRUE
$$;

COMMENT ON FUNCTION public.current_user_companies()
  IS 'Returns array of company_id with explicit access (excludes NULL/org-wide rows).';

-- TRUE if user has regis_admin or regis_consultant role with company_id NULL (org scope)
CREATE OR REPLACE FUNCTION public.is_regis_admin_or_consultant()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_company_role ucr
    JOIN roles r ON r.id = ucr.role_id
    WHERE ucr.user_id = current_app_user_id()
      AND ucr.is_active = TRUE
      AND r.nombre IN ('regis_admin', 'regis_consultant')
      AND ucr.company_id IS NULL
  )
$$;

COMMENT ON FUNCTION public.is_regis_admin_or_consultant()
  IS 'TRUE if user has regis_admin or regis_consultant role at org scope (D-ERD-08).';

-- TRUE if specific company_id is accessible by current user
CREATE OR REPLACE FUNCTION public.user_has_access_to_company(target_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    (
      is_regis_admin_or_consultant() AND EXISTS (
        SELECT 1 FROM companies c
        WHERE c.id = target_company_id
          AND c.regis_org_id = current_user_regis_org()
      )
    )
    OR target_company_id = ANY(current_user_companies())
$$;

COMMENT ON FUNCTION public.user_has_access_to_company(UUID)
  IS 'Core RLS helper: TRUE if user is regis admin/consultant of the company''s org, OR has explicit company access.';

-- =========================================================
-- 2) Enable RLS on multi-tenant tables (17)
-- =========================================================
ALTER TABLE public.regis_orgs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centros_de_trabajo   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_company_role    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_company       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_ciiu         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standard_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.committees           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.committee_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consents             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage             ENABLE ROW LEVEL SECURITY;

-- Catálogos públicos: NO RLS (intencional — lectura abierta a usuarios autenticados)
-- ciiu_codes, eps_catalog, afp_catalog, arl_catalog,
-- standards_0312, ciiu_hazard_mapping, document_frequencies, document_types, roles

-- =========================================================
-- 3) Policies
-- =========================================================

-- regis_orgs ------------------------------------------------
DROP POLICY IF EXISTS "select_own_org" ON public.regis_orgs;
CREATE POLICY "select_own_org" ON public.regis_orgs FOR SELECT
  USING (id = current_user_regis_org());

-- companies -------------------------------------------------
DROP POLICY IF EXISTS "select_companies" ON public.companies;
CREATE POLICY "select_companies" ON public.companies FOR SELECT
  USING (
    regis_org_id = current_user_regis_org()
    AND user_has_access_to_company(id)
  );

DROP POLICY IF EXISTS "insert_companies" ON public.companies;
CREATE POLICY "insert_companies" ON public.companies FOR INSERT
  WITH CHECK (
    regis_org_id = current_user_regis_org()
    AND is_regis_admin_or_consultant()
  );

DROP POLICY IF EXISTS "update_companies" ON public.companies;
CREATE POLICY "update_companies" ON public.companies FOR UPDATE
  USING (
    regis_org_id = current_user_regis_org()
    AND user_has_access_to_company(id)
  )
  WITH CHECK (
    regis_org_id = current_user_regis_org()
    AND user_has_access_to_company(id)
  );

-- centros_de_trabajo ---------------------------------------
DROP POLICY IF EXISTS "select_centros" ON public.centros_de_trabajo;
CREATE POLICY "select_centros" ON public.centros_de_trabajo FOR SELECT
  USING (user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "insert_centros" ON public.centros_de_trabajo;
CREATE POLICY "insert_centros" ON public.centros_de_trabajo FOR INSERT
  WITH CHECK (
    user_has_access_to_company(company_id)
    AND is_regis_admin_or_consultant()
  );

DROP POLICY IF EXISTS "update_centros" ON public.centros_de_trabajo;
CREATE POLICY "update_centros" ON public.centros_de_trabajo FOR UPDATE
  USING (user_has_access_to_company(company_id))
  WITH CHECK (user_has_access_to_company(company_id));

-- workers (PK natural cédula global; scope vía worker_company) ---
DROP POLICY IF EXISTS "select_workers" ON public.workers;
CREATE POLICY "select_workers" ON public.workers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM worker_company wc
      WHERE wc.worker_id = workers.id
        AND user_has_access_to_company(wc.company_id)
    )
  );

DROP POLICY IF EXISTS "insert_workers" ON public.workers;
CREATE POLICY "insert_workers" ON public.workers FOR INSERT
  WITH CHECK (TRUE);  -- workers se crean libremente; el scope viene en worker_company

DROP POLICY IF EXISTS "update_workers" ON public.workers;
CREATE POLICY "update_workers" ON public.workers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM worker_company wc
      WHERE wc.worker_id = workers.id
        AND user_has_access_to_company(wc.company_id)
    )
  );

-- worker_company -------------------------------------------
DROP POLICY IF EXISTS "select_wc" ON public.worker_company;
CREATE POLICY "select_wc" ON public.worker_company FOR SELECT
  USING (user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "insert_wc" ON public.worker_company;
CREATE POLICY "insert_wc" ON public.worker_company FOR INSERT
  WITH CHECK (user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "update_wc" ON public.worker_company;
CREATE POLICY "update_wc" ON public.worker_company FOR UPDATE
  USING (user_has_access_to_company(company_id))
  WITH CHECK (user_has_access_to_company(company_id));

-- empresa_ciiu ---------------------------------------------
DROP POLICY IF EXISTS "select_ec" ON public.empresa_ciiu;
CREATE POLICY "select_ec" ON public.empresa_ciiu FOR SELECT
  USING (user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "manage_ec" ON public.empresa_ciiu;
CREATE POLICY "manage_ec" ON public.empresa_ciiu FOR ALL
  USING (user_has_access_to_company(company_id))
  WITH CHECK (user_has_access_to_company(company_id));

-- standard_evaluations -------------------------------------
DROP POLICY IF EXISTS "select_evals" ON public.standard_evaluations;
CREATE POLICY "select_evals" ON public.standard_evaluations FOR SELECT
  USING (user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "manage_evals" ON public.standard_evaluations;
CREATE POLICY "manage_evals" ON public.standard_evaluations FOR ALL
  USING (user_has_access_to_company(company_id))
  WITH CHECK (user_has_access_to_company(company_id));

-- evaluation_snapshots (read-only via RLS, append-only via triggers) ---
DROP POLICY IF EXISTS "select_snapshots" ON public.evaluation_snapshots;
CREATE POLICY "select_snapshots" ON public.evaluation_snapshots FOR SELECT
  USING (user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "insert_snapshots" ON public.evaluation_snapshots;
CREATE POLICY "insert_snapshots" ON public.evaluation_snapshots FOR INSERT
  WITH CHECK (user_has_access_to_company(company_id));

-- documents ------------------------------------------------
DROP POLICY IF EXISTS "select_documents" ON public.documents;
CREATE POLICY "select_documents" ON public.documents FOR SELECT
  USING (user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "manage_documents" ON public.documents;
CREATE POLICY "manage_documents" ON public.documents FOR ALL
  USING (user_has_access_to_company(company_id))
  WITH CHECK (user_has_access_to_company(company_id));

-- committees -----------------------------------------------
DROP POLICY IF EXISTS "select_committees" ON public.committees;
CREATE POLICY "select_committees" ON public.committees FOR SELECT
  USING (user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "manage_committees" ON public.committees;
CREATE POLICY "manage_committees" ON public.committees FOR ALL
  USING (user_has_access_to_company(company_id))
  WITH CHECK (user_has_access_to_company(company_id));

-- committee_members (scope vía committee.company_id) -------
DROP POLICY IF EXISTS "select_cm" ON public.committee_members;
CREATE POLICY "select_cm" ON public.committee_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM committees c
      WHERE c.id = committee_id
        AND user_has_access_to_company(c.company_id)
    )
  );

DROP POLICY IF EXISTS "manage_cm" ON public.committee_members;
CREATE POLICY "manage_cm" ON public.committee_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM committees c
      WHERE c.id = committee_id
        AND user_has_access_to_company(c.company_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM committees c
      WHERE c.id = committee_id
        AND user_has_access_to_company(c.company_id)
    )
  );

-- consents (un usuario solo ve sus propios consents) -------
DROP POLICY IF EXISTS "select_own_consents" ON public.consents;
CREATE POLICY "select_own_consents" ON public.consents FOR SELECT
  USING (
    user_id = current_app_user_id()
    OR worker_id IN (
      SELECT wc.worker_id FROM worker_company wc
      WHERE user_has_access_to_company(wc.company_id)
    )
  );

DROP POLICY IF EXISTS "insert_own_consents" ON public.consents;
CREATE POLICY "insert_own_consents" ON public.consents FOR INSERT
  WITH CHECK (
    user_id = current_app_user_id()
    OR worker_id IN (
      SELECT wc.worker_id FROM worker_company wc
      WHERE user_has_access_to_company(wc.company_id)
    )
  );

-- notifications --------------------------------------------
DROP POLICY IF EXISTS "select_own_notifs" ON public.notifications;
CREATE POLICY "select_own_notifs" ON public.notifications FOR SELECT
  USING (recipient_id = current_app_user_id());

DROP POLICY IF EXISTS "update_own_notifs" ON public.notifications;
CREATE POLICY "update_own_notifs" ON public.notifications FOR UPDATE
  USING (recipient_id = current_app_user_id())
  WITH CHECK (recipient_id = current_app_user_id());

-- audit_log ------------------------------------------------
DROP POLICY IF EXISTS "select_audit" ON public.audit_log;
CREATE POLICY "select_audit" ON public.audit_log FOR SELECT
  USING (
    (regis_org_id = current_user_regis_org() AND is_regis_admin_or_consultant())
    OR (company_id = ANY(current_user_companies()))
  );

DROP POLICY IF EXISTS "insert_audit" ON public.audit_log;
CREATE POLICY "insert_audit" ON public.audit_log FOR INSERT
  WITH CHECK (TRUE);  -- triggers/sistema escriben siempre

-- user_company_role ----------------------------------------
DROP POLICY IF EXISTS "select_ucr" ON public.user_company_role;
CREATE POLICY "select_ucr" ON public.user_company_role FOR SELECT
  USING (
    user_id = current_app_user_id()
    OR (regis_org_id = current_user_regis_org() AND is_regis_admin_or_consultant())
  );

DROP POLICY IF EXISTS "manage_ucr" ON public.user_company_role;
CREATE POLICY "manage_ucr" ON public.user_company_role FOR ALL
  USING (
    regis_org_id = current_user_regis_org() AND is_regis_admin_or_consultant()
  )
  WITH CHECK (
    regis_org_id = current_user_regis_org() AND is_regis_admin_or_consultant()
  );

-- users ----------------------------------------------------
DROP POLICY IF EXISTS "select_users" ON public.users;
CREATE POLICY "select_users" ON public.users FOR SELECT
  USING (
    id = current_app_user_id()
    OR EXISTS (
      SELECT 1 FROM user_company_role ucr
      WHERE ucr.user_id = users.id
        AND ucr.regis_org_id = current_user_regis_org()
        AND is_regis_admin_or_consultant()
    )
  );

-- ai_usage -------------------------------------------------
DROP POLICY IF EXISTS "select_ai_usage" ON public.ai_usage;
CREATE POLICY "select_ai_usage" ON public.ai_usage FOR SELECT
  USING (is_regis_admin_or_consultant());

DROP POLICY IF EXISTS "insert_ai_usage" ON public.ai_usage;
CREATE POLICY "insert_ai_usage" ON public.ai_usage FOR INSERT
  WITH CHECK (TRUE);  -- agentes escriben siempre
