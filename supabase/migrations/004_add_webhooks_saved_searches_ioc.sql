-- Webhook configurations
CREATE TABLE IF NOT EXISTS webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom', -- slack, discord, line, custom
  events TEXT[] NOT NULL DEFAULT ARRAY['critical_article'],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own webhooks" ON webhook_configs
  FOR ALL USING (auth.uid() = user_id);

-- Saved searches with alert rules
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  alert_enabled BOOLEAN NOT NULL DEFAULT false,
  alert_severity TEXT, -- null = any, or "critical", "high", etc.
  last_matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved searches" ON saved_searches
  FOR ALL USING (auth.uid() = user_id);

-- IOC (Indicators of Compromise) table
CREATE TABLE IF NOT EXISTS iocs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- ip, domain, hash_md5, hash_sha256, url, email
  value TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  source TEXT, -- which article or manual
  article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE iocs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view IOCs" ON iocs
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Analysts and admins can manage IOCs" ON iocs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'analyst')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhook_configs_user ON webhook_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_iocs_type_value ON iocs(type, value);
CREATE INDEX IF NOT EXISTS idx_iocs_article ON iocs(article_id);
CREATE INDEX IF NOT EXISTS idx_iocs_severity ON iocs(severity) WHERE is_active = true;

-- Article correlation: related articles based on shared tags
CREATE OR REPLACE VIEW article_correlations AS
SELECT
  a1.id AS article_id,
  a2.id AS related_id,
  a2.title AS related_title,
  a2.severity AS related_severity,
  a2.published_at AS related_published_at,
  ARRAY(
    SELECT unnest(a1.tags) INTERSECT SELECT unnest(a2.tags)
  ) AS shared_tags,
  array_length(
    ARRAY(SELECT unnest(a1.tags) INTERSECT SELECT unnest(a2.tags)),
    1
  ) AS shared_count
FROM articles a1
CROSS JOIN articles a2
WHERE a1.id != a2.id
  AND array_length(
    ARRAY(SELECT unnest(a1.tags) INTERSECT SELECT unnest(a2.tags)),
    1
  ) >= 2
ORDER BY shared_count DESC;
