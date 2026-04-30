-- =========================================================
-- Migration: 009_consents_notifications
-- Task: T-F1-009 — Consents (Habeas Data) y notifications
-- Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/20
-- Author: Operador-Agent
-- =========================================================
-- Habeas Data Ley 1581/2012 + Decreto 1377/2013.
-- T-F0-032 define versiones de política.
-- =========================================================

-- =========================================================
-- consents per Habeas Data
-- =========================================================
CREATE TABLE IF NOT EXISTS public.consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('general', 'sensible', 'canales', 'internacional', 'ia')),
  version_politica TEXT NOT NULL,
  accepted BOOLEAN NOT NULL,
  accepted_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (user_id IS NOT NULL OR worker_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_consents_user ON public.consents(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consents_worker ON public.consents(worker_id) WHERE worker_id IS NOT NULL;
COMMENT ON TABLE public.consents IS 'Habeas Data Ley 1581/2012 + Decreto 1377/2013. T-F0-032 define versiones de política.';

-- =========================================================
-- notifications
-- =========================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'whatsapp', 'sms')),
  template TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'read')) DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_recipient_unread ON public.notifications(recipient_id) WHERE status IN ('pending', 'sent');
DROP TRIGGER IF EXISTS trg_notif_updated_at ON public.notifications;
CREATE TRIGGER trg_notif_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_updated_at();
COMMENT ON TABLE public.notifications IS 'Cola de notificaciones in_app/email/whatsapp/sms. pg-boss procesa pending → sent.';
