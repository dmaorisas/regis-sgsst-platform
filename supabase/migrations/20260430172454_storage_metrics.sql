-- T-F15-014 (F1.5-D): storage_metrics table for monitoring DB+Storage usage
-- Per D-005 storage policy + D-007 split (technical implementation)

CREATE TABLE IF NOT EXISTS public.storage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- DB metrics
  db_size_bytes BIGINT NOT NULL,
  db_size_pretty TEXT NOT NULL,
  free_tier_db_limit_bytes BIGINT NOT NULL DEFAULT 524288000,  -- 500MB Supabase free
  db_usage_percent DECIMAL(5, 2) NOT NULL,

  -- Storage metrics
  storage_size_bytes BIGINT,
  storage_size_pretty TEXT,
  free_tier_storage_limit_bytes BIGINT NOT NULL DEFAULT 1073741824, -- 1GB Supabase free
  storage_usage_percent DECIMAL(5, 2),

  -- Detailed counts
  total_rows_per_table JSONB,

  -- Alerts
  alert_triggered BOOLEAN NOT NULL DEFAULT FALSE,
  alert_reason TEXT,
  alert_sent_at TIMESTAMPTZ,
  alert_threshold_percent INT NOT NULL DEFAULT 80,

  -- Source
  source TEXT NOT NULL DEFAULT 'cron' CHECK (source IN ('cron', 'manual', 'n8n')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_storage_metrics_measured ON storage_metrics (measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_storage_metrics_alerts ON storage_metrics (alert_triggered) WHERE alert_triggered = TRUE;

ALTER TABLE storage_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_storage_metrics" ON storage_metrics FOR SELECT
  USING (is_regis_admin_or_consultant());

CREATE POLICY "insert_storage_metrics" ON storage_metrics FOR INSERT WITH CHECK (TRUE);

COMMENT ON TABLE storage_metrics IS
  'D-005 + D-007 + T-F15-014: tracking de uso DB+Storage para alertas de free tier. Insertado por cron n8n cada 6h.';
