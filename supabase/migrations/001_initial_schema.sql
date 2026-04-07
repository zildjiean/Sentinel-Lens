-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUMS
CREATE TYPE user_role AS ENUM ('admin', 'analyst', 'viewer');
CREATE TYPE article_severity AS ENUM ('critical', 'high', 'medium', 'low', 'info');
CREATE TYPE article_status AS ENUM ('new', 'translated', 'reviewed', 'archived');
CREATE TYPE llm_provider AS ENUM ('gemini', 'openrouter');
CREATE TYPE report_type AS ENUM ('executive', 'incident', 'weekly');
CREATE TYPE report_status AS ENUM ('draft', 'generated', 'reviewed', 'published');

-- PROFILES
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  role user_role NOT NULL DEFAULT 'viewer',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RSS SOURCES
CREATE TABLE rss_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  fetch_interval INT NOT NULL DEFAULT 30,
  last_fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ARTICLES
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES rss_sources ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  url TEXT UNIQUE,
  image_url TEXT,
  author TEXT,
  severity article_severity NOT NULL DEFAULT 'info',
  status article_status NOT NULL DEFAULT 'new',
  tags TEXT[] DEFAULT '{}',
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_manual BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES profiles ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_articles_severity_status ON articles (severity, status);
CREATE INDEX idx_articles_published_at ON articles (published_at DESC);
CREATE INDEX idx_articles_source_published ON articles (source_id, published_at);

-- TRANSLATIONS
CREATE TABLE translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL UNIQUE REFERENCES articles ON DELETE CASCADE,
  title_th TEXT NOT NULL,
  content_th TEXT NOT NULL DEFAULT '',
  excerpt_th TEXT NOT NULL DEFAULT '',
  provider llm_provider NOT NULL,
  model TEXT NOT NULL,
  confidence FLOAT NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verified_by UUID REFERENCES profiles ON DELETE SET NULL,
  token_usage INT NOT NULL DEFAULT 0,
  translated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_translations_article ON translations (article_id);

-- REPORTS
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  report_type report_type NOT NULL DEFAULT 'executive',
  content_en JSONB NOT NULL DEFAULT '{}',
  content_th JSONB NOT NULL DEFAULT '{}',
  severity article_severity NOT NULL DEFAULT 'high',
  classification TEXT NOT NULL DEFAULT 'TLP:AMBER',
  provider llm_provider,
  model TEXT,
  pdf_path TEXT,
  status report_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES profiles ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE report_articles (
  report_id UUID NOT NULL REFERENCES reports ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES articles ON DELETE CASCADE,
  PRIMARY KEY (report_id, article_id)
);

-- APP SETTINGS
CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  updated_by UUID REFERENCES profiles ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO app_settings (key, value) VALUES
  ('llm_provider', '"gemini"'),
  ('llm_api_keys', '{}'),
  ('rss_fetch_interval', '15'),
  ('auto_translate_severity', '["critical", "high"]'),
  ('default_classification', '"TLP:AMBER"');

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rss_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id OR get_user_role() = 'admin');
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id OR get_user_role() = 'admin');

-- Articles policies (public read)
CREATE POLICY "Anyone can read articles" ON articles FOR SELECT USING (true);
CREATE POLICY "Analyst can insert articles" ON articles FOR INSERT WITH CHECK (get_user_role() IN ('analyst', 'admin'));
CREATE POLICY "Analyst can update articles" ON articles FOR UPDATE USING (get_user_role() IN ('analyst', 'admin'));
CREATE POLICY "Admin can delete articles" ON articles FOR DELETE USING (get_user_role() = 'admin');

-- Translations policies
CREATE POLICY "Anyone can read translations" ON translations FOR SELECT USING (true);
CREATE POLICY "Analyst can insert translations" ON translations FOR INSERT WITH CHECK (get_user_role() IN ('analyst', 'admin'));
CREATE POLICY "Analyst can update translations" ON translations FOR UPDATE USING (get_user_role() IN ('analyst', 'admin'));
CREATE POLICY "Admin can delete translations" ON translations FOR DELETE USING (get_user_role() = 'admin');

-- RSS Sources policies
CREATE POLICY "Analyst can view sources" ON rss_sources FOR SELECT USING (get_user_role() IN ('analyst', 'admin'));
CREATE POLICY "Admin can manage sources" ON rss_sources FOR ALL USING (get_user_role() = 'admin');

-- Reports policies
CREATE POLICY "Read reports" ON reports FOR SELECT USING (status = 'published' OR created_by = auth.uid() OR get_user_role() IN ('analyst', 'admin'));
CREATE POLICY "Analyst can insert reports" ON reports FOR INSERT WITH CHECK (get_user_role() IN ('analyst', 'admin'));
CREATE POLICY "Analyst can update own reports" ON reports FOR UPDATE USING (created_by = auth.uid() OR get_user_role() = 'admin');
CREATE POLICY "Admin can delete reports" ON reports FOR DELETE USING (get_user_role() = 'admin');

-- Report articles policies
CREATE POLICY "Read report articles" ON report_articles FOR SELECT USING (true);
CREATE POLICY "Analyst can manage report articles" ON report_articles FOR ALL USING (get_user_role() IN ('analyst', 'admin'));

-- App settings policies
CREATE POLICY "Admin can manage settings" ON app_settings FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Edge functions can read settings" ON app_settings FOR SELECT USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON translations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', false);

CREATE POLICY "Authenticated users can read reports" ON storage.objects
  FOR SELECT USING (bucket_id = 'reports' AND auth.role() = 'authenticated');
CREATE POLICY "Analyst can upload reports" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'reports' AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('analyst', 'admin'));
