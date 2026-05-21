-- =========================================================
-- Module permissions overrides per regis_org
-- =========================================================
-- Stores per-org overrides to the default permission matrix.
-- Only rows that DIFFER from the TypeScript defaults need to
-- exist here. The app merges: DB override > TS default.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.module_permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regis_org_id uuid NOT NULL REFERENCES public.regis_orgs(id) ON DELETE CASCADE,
  role_name   text NOT NULL CHECK (role_name IN ('regis_admin','regis_consultant','client_admin','worker')),
  module_key  text NOT NULL CHECK (module_key IN (
    'dashboard','medical','matrices','actas','emergencies','inventory',
    'documents','monthly_logs','portfolio','review_queue','companies','users'
  )),
  access_level text NOT NULL CHECK (access_level IN ('none','view','full')),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES public.users(id),

  UNIQUE (regis_org_id, role_name, module_key)
);

CREATE INDEX idx_module_permissions_org ON public.module_permissions(regis_org_id);

ALTER TABLE public.module_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "regis_admin can manage own org permissions"
  ON public.module_permissions
  FOR ALL
  USING (
    regis_org_id = current_user_regis_org()
    AND is_regis_admin_or_consultant()
  )
  WITH CHECK (
    regis_org_id = current_user_regis_org()
    AND EXISTS (
      SELECT 1 FROM public.user_company_role ucr
      JOIN public.roles r ON r.id = ucr.role_id
      WHERE ucr.user_id = current_app_user_id()
        AND ucr.is_active = true
        AND r.nombre = 'regis_admin'
    )
  );

CREATE POLICY "regis_staff can read own org permissions"
  ON public.module_permissions
  FOR SELECT
  USING (
    regis_org_id = current_user_regis_org()
    AND is_regis_admin_or_consultant()
  );

COMMENT ON TABLE public.module_permissions IS
  'Per-org overrides to the default RBAC permission matrix. Only divergences from defaults are stored.';
