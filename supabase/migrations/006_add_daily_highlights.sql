-- supabase/migrations/006_add_daily_highlights.sql

CREATE TABLE IF NOT EXISTS daily_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  highlights_data JSONB NOT NULL,
  article_count INTEGER NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '4 hours'),
  created_by UUID REFERENCES auth.users(id)
);

-- Index for finding fresh highlights quickly
CREATE INDEX idx_daily_highlights_expires_at ON daily_highlights(expires_at DESC);

-- RLS: all authenticated users can read
ALTER TABLE daily_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read daily highlights"
  ON daily_highlights FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert daily highlights"
  ON daily_highlights FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete expired highlights"
  ON daily_highlights FOR DELETE
  TO authenticated
  USING (expires_at < now());
