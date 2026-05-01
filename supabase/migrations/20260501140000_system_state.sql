-- =========================================================
-- Migration: system_state (pause/resume flag for autonomous orchestration)
-- Task: T-F15-015 — Construir orquestación autónoma de agentes en n8n
-- Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/12
-- Author: PM-Agent (vía MCP, autorizado D-010 + D-011)
-- =========================================================
-- Habilita pause/resume del sistema autónomo. Activado por:
--   - cost circuit breaker (security/01)
--   - loop detector (security/02)
--   - intervención supervisor humano
-- Solo el supervisor humano puede reanudar (UPDATE manual o vía endpoint admin futuro).
-- =========================================================

CREATE TABLE IF NOT EXISTS public.system_state (
  id              SMALLINT PRIMARY KEY DEFAULT 1,
  paused          BOOLEAN  NOT NULL DEFAULT FALSE,
  pause_reason    TEXT,
  pause_scope     TEXT CHECK (pause_scope IN ('global','agent','module','task')),
  pause_target    TEXT,
  paused_at       TIMESTAMPTZ,
  paused_by       TEXT,
  resumed_at      TIMESTAMPTZ,
  resumed_by      TEXT,
  resume_note     TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT system_state_singleton CHECK (id = 1)
);

INSERT INTO public.system_state (id, paused) VALUES (1, FALSE)
ON CONFLICT (id) DO NOTHING;

-- Cola de orquestación: cada fila = una tarea siendo procesada por agentes autónomos
-- Las transiciones de status reflejan governance/01_roles_y_reglas.md sección 8
CREATE TABLE IF NOT EXISTS public.agent_tasks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id               TEXT NOT NULL,
  github_issue_number   INT  NOT NULL,
  github_issue_url      TEXT,
  phase                 TEXT NOT NULL,
  status                TEXT NOT NULL CHECK (status IN (
    'queued','in_progress','qa_pending','approved','rejected','escalated','cancelled'
  )),
  assigned_to           TEXT NOT NULL CHECK (assigned_to IN ('operador','qa','pm','none')),
  iteration             INT  NOT NULL DEFAULT 1,
  attempt_count         INT  NOT NULL DEFAULT 0,
  last_operador_output  TEXT,
  last_qa_verdict       TEXT,
  last_qa_feedback      TEXT,
  pm_resolution         TEXT,
  estimated_minutes     INT,
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_id)
);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_assignee_status ON public.agent_tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status_created ON public.agent_tasks(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_issue          ON public.agent_tasks(github_issue_number);

CREATE TABLE IF NOT EXISTS public.loop_detections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_name    TEXT NOT NULL,
  severity        TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  task_id         TEXT,
  agent_id        TEXT,
  details         JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_taken    TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loop_detections_created ON public.loop_detections(created_at DESC);

ALTER TABLE public.system_state    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loop_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tasks     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_agent_tasks" ON public.agent_tasks;
CREATE POLICY "select_agent_tasks" ON public.agent_tasks FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "select_system_state" ON public.system_state;
CREATE POLICY "select_system_state" ON public.system_state FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "select_loop_detections" ON public.loop_detections;
CREATE POLICY "select_loop_detections" ON public.loop_detections FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

COMMENT ON TABLE public.system_state    IS 'security/01+02: pause/resume del sistema autónomo. Singleton (id=1).';
COMMENT ON TABLE public.loop_detections IS 'security/02: log inmutable de detecciones del loop detector.';
