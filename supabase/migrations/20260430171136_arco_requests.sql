-- =========================================================
-- T-F15-008 — arco_requests (Habeas Data — solicitudes ARCO)
-- =========================================================
-- Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/27
-- Author: Operador-Agent
--
-- Implementa el canal público de solicitudes ARCO (Acceso, Rectificación,
-- Cancelación, Oposición, Revocación) que la Ley 1581 de 2012 + Decreto
-- 1377 de 2013 obligan a publicar para titulares de datos.
--
-- Decisiones técnicas (R7):
--   - El INSERT es público (WITH CHECK TRUE): cualquier titular puede
--     enviar una solicitud sin estar logueado, ese es el contrato legal.
--     El control anti-abuso se hace en la ruta API (rate limit por IP +
--     captcha en futuras iteraciones).
--   - SELECT/UPDATE solo Regis admin/consultant: solo el equipo legal
--     interno gestiona solicitudes; el solicitante recibe respuesta por
--     email fuera de la plataforma.
--   - Sin reverse-FK al titular: la persona NO necesariamente está
--     registrada como user/worker (puede ser un ex-trabajador, un
--     proveedor, etc.). Por eso solo guardamos email + descripción.
--   - SLA legal: 15 días hábiles (Decreto 1377 Art. 14). El cálculo
--     se delega al utilitario `colombian-business-days` desde la API.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.arco_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo              TEXT NOT NULL
                      CHECK (tipo IN ('acceso','rectificacion','cancelacion','oposicion','revocacion')),
  email             TEXT NOT NULL,
  descripcion       TEXT NOT NULL,
  status            TEXT NOT NULL
                      CHECK (status IN ('pending','in_review','resolved','rejected'))
                      DEFAULT 'pending',
  ip_address        INET,
  user_agent        TEXT,
  resolved_at       TIMESTAMPTZ,
  resolution_notes  TEXT,
  resolver_id       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arco_status_created
  ON public.arco_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_arco_email
  ON public.arco_requests(email);

DROP TRIGGER IF EXISTS trg_arco_updated_at ON public.arco_requests;
CREATE TRIGGER trg_arco_updated_at
  BEFORE UPDATE ON public.arco_requests
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_updated_at();

-- ---------------------------------------------------------
-- RLS
-- ---------------------------------------------------------
ALTER TABLE public.arco_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_arco" ON public.arco_requests;
CREATE POLICY "select_arco" ON public.arco_requests
  FOR SELECT
  USING (public.is_regis_admin_or_consultant());

DROP POLICY IF EXISTS "insert_arco_public" ON public.arco_requests;
CREATE POLICY "insert_arco_public" ON public.arco_requests
  FOR INSERT
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "update_arco" ON public.arco_requests;
CREATE POLICY "update_arco" ON public.arco_requests
  FOR UPDATE
  USING (public.is_regis_admin_or_consultant())
  WITH CHECK (public.is_regis_admin_or_consultant());

COMMENT ON TABLE public.arco_requests IS
  'Solicitudes ARCO Ley 1581/2012 + Decreto 1377/2013. SLA 15 días hábiles desde created_at.';
