-- =========================================================
-- Migration: 012_audit_triggers
-- Task: T-F1-014 — Audit triggers app (fn_audit_changes + 7 triggers)
-- Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/22
-- Author: Operador-Agent
-- =========================================================
-- ERD v1 D-ERD-05 (audit_log append-only). Función genérica que
-- escribe a audit_log en cada INSERT/UPDATE/DELETE de tablas críticas.
--
-- Notas técnicas (R7):
--   * Resolvemos actor vía current_app_user_id() (definido en migration 012_rls).
--     Si no hay sesión (e.g. seeds vía service_role), actor_type='system'.
--   * Resolvemos scope (regis_org_id, company_id) leyendo NEW/OLD con bloques
--     EXCEPTION undefined_column para tablas que no tienen esas columnas
--     directamente. companies tiene regis_org_id pero NO company_id propia
--     (la id es la del row); para ese caso resolvemos company_id := NEW.id.
--   * standard_evaluations.evaluation_snapshots / committees / committee_members /
--     centros_de_trabajo NO tienen regis_org_id directo — quedará NULL en
--     audit_log (consistente con D-ERD-05: scope se infiere via JOIN si se requiere).
--   * SECURITY DEFINER: la función necesita escribir audit_log incluso para
--     usuarios con RLS activa. audit_log no rechaza INSERT (solo UPDATE/DELETE).
-- =========================================================

CREATE OR REPLACE FUNCTION public.fn_audit_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_actor_type TEXT;
  v_action TEXT;
  v_company_id UUID;
  v_regis_org_id UUID;
  v_entity_id UUID;
BEGIN
  -- Resolver actor (NULL si no hay sesión auth, caso seeds vía service_role)
  BEGIN
    v_actor_id := public.current_app_user_id();
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := NULL;
  END;

  v_actor_type := CASE WHEN v_actor_id IS NULL THEN 'system' ELSE 'user' END;

  -- Resolver acción
  v_action := TG_TABLE_NAME || '.' || lower(TG_OP);

  -- Resolver scope desde NEW/OLD (con tolerancia a columnas inexistentes)
  IF TG_OP = 'DELETE' THEN
    BEGIN v_company_id := OLD.company_id; EXCEPTION WHEN undefined_column THEN v_company_id := NULL; END;
    BEGIN v_regis_org_id := OLD.regis_org_id; EXCEPTION WHEN undefined_column THEN v_regis_org_id := NULL; END;
    v_entity_id := OLD.id;
    -- Caso especial: tabla companies — su PK es la company_id
    IF TG_TABLE_NAME = 'companies' THEN
      v_company_id := OLD.id;
    END IF;
  ELSE
    BEGIN v_company_id := NEW.company_id; EXCEPTION WHEN undefined_column THEN v_company_id := NULL; END;
    BEGIN v_regis_org_id := NEW.regis_org_id; EXCEPTION WHEN undefined_column THEN v_regis_org_id := NULL; END;
    v_entity_id := NEW.id;
    IF TG_TABLE_NAME = 'companies' THEN
      v_company_id := NEW.id;
    END IF;
  END IF;

  INSERT INTO public.audit_log (
    regis_org_id, company_id, actor_id, actor_type, action,
    entity_type, entity_id, before_state, after_state
  ) VALUES (
    v_regis_org_id,
    v_company_id,
    v_actor_id,
    v_actor_type,
    v_action,
    TG_TABLE_NAME,
    v_entity_id,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.fn_audit_changes()
  IS 'D-ERD-05: trigger genérico que escribe cada cambio (INSERT/UPDATE/DELETE) a audit_log. Aplicado a 7 tablas críticas. SECURITY DEFINER para bypassar RLS al insertar.';

-- =========================================================
-- Triggers en 7 tablas críticas
-- =========================================================

-- 1) companies
DROP TRIGGER IF EXISTS trg_audit_companies ON public.companies;
CREATE TRIGGER trg_audit_companies
  AFTER INSERT OR UPDATE OR DELETE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_changes();

-- 2) centros_de_trabajo
DROP TRIGGER IF EXISTS trg_audit_centros ON public.centros_de_trabajo;
CREATE TRIGGER trg_audit_centros
  AFTER INSERT OR UPDATE OR DELETE ON public.centros_de_trabajo
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_changes();

-- 3) workers
DROP TRIGGER IF EXISTS trg_audit_workers ON public.workers;
CREATE TRIGGER trg_audit_workers
  AFTER INSERT OR UPDATE OR DELETE ON public.workers
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_changes();

-- 4) standard_evaluations
DROP TRIGGER IF EXISTS trg_audit_evals ON public.standard_evaluations;
CREATE TRIGGER trg_audit_evals
  AFTER INSERT OR UPDATE OR DELETE ON public.standard_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_changes();

-- 5) documents
DROP TRIGGER IF EXISTS trg_audit_docs ON public.documents;
CREATE TRIGGER trg_audit_docs
  AFTER INSERT OR UPDATE OR DELETE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_changes();

-- 6) committee_members
DROP TRIGGER IF EXISTS trg_audit_cm ON public.committee_members;
CREATE TRIGGER trg_audit_cm
  AFTER INSERT OR UPDATE OR DELETE ON public.committee_members
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_changes();

-- 7) evaluation_snapshots (solo INSERT — append-only)
DROP TRIGGER IF EXISTS trg_audit_snapshots ON public.evaluation_snapshots;
CREATE TRIGGER trg_audit_snapshots
  AFTER INSERT ON public.evaluation_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_changes();
