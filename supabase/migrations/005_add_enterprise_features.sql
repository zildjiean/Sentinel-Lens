-- ============================================
-- 005: Enterprise Report + Watch List tables
-- ============================================

-- Enterprise Report Layouts
CREATE TABLE IF NOT EXISTS enterprise_report_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_preset BOOLEAN NOT NULL DEFAULT false,
  layout_config JSONB NOT NULL DEFAULT '{}',
  thumbnail_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE enterprise_report_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all layouts"
  ON enterprise_report_layouts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Analysts and admins can create layouts"
  ON enterprise_report_layouts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'analyst'))
  );

CREATE POLICY "Owners can update non-preset layouts"
  ON enterprise_report_layouts FOR UPDATE
  TO authenticated
  USING (
    is_preset = false AND created_by = auth.uid()
  );

CREATE POLICY "Owners can delete non-preset layouts"
  ON enterprise_report_layouts FOR DELETE
  TO authenticated
  USING (
    is_preset = false AND created_by = auth.uid()
  );

-- Enterprise Reports
CREATE TABLE IF NOT EXISTS enterprise_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  report_type TEXT NOT NULL DEFAULT 'executive',
  classification TEXT NOT NULL DEFAULT 'TLP:GREEN',
  severity TEXT,
  layout_id UUID REFERENCES enterprise_report_layouts(id) ON DELETE SET NULL,
  layout_config_override JSONB,
  ai_design_prompt TEXT,
  content_en JSONB,
  content_th JSONB,
  content_prompt_template TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  export_history JSONB DEFAULT '[]',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE enterprise_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Analysts and admins can view reports"
  ON enterprise_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'analyst'))
  );

CREATE POLICY "Analysts and admins can create reports"
  ON enterprise_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'analyst'))
  );

CREATE POLICY "Analysts and admins can update reports"
  ON enterprise_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'analyst'))
  );

CREATE POLICY "Admins can delete reports"
  ON enterprise_reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Enterprise Report Articles (junction)
CREATE TABLE IF NOT EXISTS enterprise_report_articles (
  report_id UUID NOT NULL REFERENCES enterprise_reports(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (report_id, article_id)
);

ALTER TABLE enterprise_report_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Analysts and admins can manage report articles"
  ON enterprise_report_articles FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'analyst'))
  );

-- Watch Lists
CREATE TABLE IF NOT EXISTS watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notify_mode TEXT NOT NULL DEFAULT 'realtime',
  batch_interval_minutes INT DEFAULT 30,
  summary_level TEXT NOT NULL DEFAULT 'short',
  email_recipients TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  last_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watchlists"
  ON watchlists FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can create watchlists"
  ON watchlists FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own watchlists"
  ON watchlists FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete own watchlists"
  ON watchlists FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Watchlist Keywords
CREATE TABLE IF NOT EXISTS watchlist_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  match_mode TEXT NOT NULL DEFAULT 'contains',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(watchlist_id, keyword)
);

ALTER TABLE watchlist_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own watchlist keywords"
  ON watchlist_keywords FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM watchlists WHERE id = watchlist_id AND created_by = auth.uid())
  );

-- Watchlist Matches
CREATE TABLE IF NOT EXISTS watchlist_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  keyword_id UUID NOT NULL REFERENCES watchlist_keywords(id) ON DELETE CASCADE,
  matched_keyword TEXT NOT NULL,
  matched_in TEXT NOT NULL,
  summary_th TEXT,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(watchlist_id, article_id, keyword_id)
);

ALTER TABLE watchlist_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watchlist matches"
  ON watchlist_matches FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM watchlists WHERE id = watchlist_id AND created_by = auth.uid())
  );

-- Indexes
CREATE INDEX idx_enterprise_reports_created_by ON enterprise_reports(created_by);
CREATE INDEX idx_enterprise_reports_status ON enterprise_reports(status);
CREATE INDEX idx_watchlists_created_by ON watchlists(created_by);
CREATE INDEX idx_watchlists_is_active ON watchlists(is_active);
CREATE INDEX idx_watchlist_keywords_watchlist_id ON watchlist_keywords(watchlist_id);
CREATE INDEX idx_watchlist_keywords_keyword ON watchlist_keywords(keyword);
CREATE INDEX idx_watchlist_matches_watchlist_id ON watchlist_matches(watchlist_id);
CREATE INDEX idx_watchlist_matches_notified_at ON watchlist_matches(notified_at);
CREATE INDEX idx_watchlist_matches_article_id ON watchlist_matches(article_id);

-- Updated_at triggers (reuse function if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_enterprise_report_layouts_updated_at
  BEFORE UPDATE ON enterprise_report_layouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enterprise_reports_updated_at
  BEFORE UPDATE ON enterprise_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_watchlists_updated_at
  BEFORE UPDATE ON watchlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Preset layouts
INSERT INTO enterprise_report_layouts (name, description, is_preset, layout_config) VALUES
(
  'Executive Dark',
  'Professional dark theme for executive presentations',
  true,
  '{
    "theme": "dark",
    "primary_color": "#1E3A5F",
    "accent_color": "#60A5FA",
    "font_heading": "Manrope",
    "font_body": "Inter",
    "cover_style": "minimal",
    "logo_url": null,
    "sections": ["cover", "executive_summary", "threat_landscape", "risk_matrix", "immediate_actions", "strategic_actions", "references"],
    "show_page_numbers": true,
    "show_header_footer": true,
    "classification_watermark": true
  }'::jsonb
),
(
  'SOC Technical',
  'Data-heavy layout for security operations teams',
  true,
  '{
    "theme": "light",
    "primary_color": "#0F172A",
    "accent_color": "#F97316",
    "font_heading": "Manrope",
    "font_body": "Inter",
    "cover_style": "minimal",
    "logo_url": null,
    "sections": ["cover", "executive_summary", "threat_landscape", "risk_matrix", "immediate_actions", "strategic_actions", "ioc_table", "references"],
    "show_page_numbers": true,
    "show_header_footer": true,
    "classification_watermark": true
  }'::jsonb
),
(
  'Minimal Light',
  'Clean, minimal light theme for general reports',
  true,
  '{
    "theme": "light",
    "primary_color": "#1E293B",
    "accent_color": "#3B82F6",
    "font_heading": "Manrope",
    "font_body": "Inter",
    "cover_style": "minimal",
    "logo_url": null,
    "sections": ["cover", "executive_summary", "threat_landscape", "immediate_actions", "strategic_actions", "references"],
    "show_page_numbers": true,
    "show_header_footer": false,
    "classification_watermark": false
  }'::jsonb
);
