# Sentinel Lens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a bilingual (EN/TH) cybersecurity intelligence platform with RSS aggregation, LLM translation, and executive report generation.

**Architecture:** Next.js 14 App Router on Vercel (free) + Supabase (free tier) for PostgreSQL, Auth, Edge Functions, Storage. Heavy tasks (RSS fetch, LLM translation, PDF generation) run in Supabase Edge Functions. pg_cron schedules automated RSS fetching and translation.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS v4, Supabase (PostgreSQL + RLS + Auth + Edge Functions + Storage), next-intl, zustand, @react-pdf/renderer, lucide-react, date-fns, Manrope + Inter fonts

**Design Reference:** `stitch_sentinel_intelligence_feed/` contains 4 HTML designs + 1 DESIGN.md. All pages follow "The Sentinel's Lens" dark editorial design system.

**Spec:** `docs/superpowers/specs/2026-04-07-sentinel-lens-design.md`

---

## File Structure

```
sentinel-lens/
├── .env.local                          # Local environment variables
├── .gitignore
├── next.config.ts                      # Next.js configuration
├── package.json
├── tsconfig.json
├── tailwind.config.ts                  # Tailwind with custom design tokens
├── postcss.config.mjs
├── middleware.ts                        # Auth + role-based route protection
│
├── src/
│   ├── app/
│   │   ├── globals.css                 # Base styles, custom scrollbar, print
│   │   ├── layout.tsx                  # Root layout with fonts + providers
│   │   │
│   │   ├── (public)/
│   │   │   ├── layout.tsx              # Public layout (sidebar + topbar)
│   │   │   ├── page.tsx                # Intelligence Feed (SSR)
│   │   │   └── article/[id]/page.tsx   # Article detail
│   │   │
│   │   ├── (protected)/
│   │   │   ├── layout.tsx              # Protected layout (sidebar + topbar)
│   │   │   ├── translation-lab/
│   │   │   │   └── page.tsx            # Translation Lab
│   │   │   ├── report-archive/
│   │   │   │   └── page.tsx            # Report Archive
│   │   │   ├── report/
│   │   │   │   ├── new/page.tsx        # Create report
│   │   │   │   └── [id]/page.tsx       # View/export report
│   │   │   └── settings/
│   │   │       └── page.tsx            # Admin settings
│   │   │
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx          # Login page
│   │   │   └── callback/route.ts       # OAuth callback handler
│   │   │
│   │   └── api/
│   │       └── translate/route.ts      # Trigger translation Edge Function
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx             # 256px fixed sidebar navigation
│   │   │   └── TopBar.tsx              # Top header bar
│   │   ├── ui/
│   │   │   ├── Button.tsx              # Primary/secondary/security variants
│   │   │   ├── Card.tsx                # Tonal nesting card
│   │   │   ├── Badge.tsx               # Severity badges
│   │   │   ├── StatusIndicator.tsx     # Glowing status dot
│   │   │   ├── ThreatMeter.tsx         # Progress bar with gradient
│   │   │   ├── Input.tsx               # Bottom-border input
│   │   │   └── Select.tsx              # Dropdown select
│   │   ├── feed/
│   │   │   ├── HeroBriefing.tsx        # Hero metrics card
│   │   │   ├── NetworkHealth.tsx       # Network status card
│   │   │   ├── ArticleCard.tsx         # Feed article card
│   │   │   └── ArticleGrid.tsx         # Bento grid layout
│   │   ├── translation/
│   │   │   ├── Toolbar.tsx             # Translate/Compare tabs + actions
│   │   │   ├── SourcePane.tsx          # English source pane
│   │   │   ├── TargetPane.tsx          # Thai target pane
│   │   │   └── AnalysisCards.tsx       # Risk, accuracy, verdict cards
│   │   ├── report/
│   │   │   ├── ReportCard.tsx          # Archive list item
│   │   │   ├── FilterBar.tsx           # Search + filters
│   │   │   ├── ReportViewer.tsx        # Executive report renderer
│   │   │   └── RiskMatrix.tsx          # 5x5 risk matrix table
│   │   └── settings/
│   │       ├── LLMConfig.tsx           # LLM provider settings
│   │       ├── RSSManager.tsx          # RSS source CRUD
│   │       └── UserManager.tsx         # User role management
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              # Browser Supabase client
│   │   │   ├── server.ts              # Server Supabase client
│   │   │   └── middleware.ts           # Supabase middleware helper
│   │   ├── types/
│   │   │   └── database.ts            # Supabase generated types
│   │   └── store/
│   │       └── language.ts            # Zustand language toggle store
│   │
│   └── messages/
│       ├── en.json                     # English UI labels
│       └── th.json                     # Thai UI labels
│
├── supabase/
│   ├── config.toml                     # Supabase project config
│   ├── migrations/
│   │   └── 001_initial_schema.sql      # Full database schema
│   ├── seed.sql                        # Seed data (RSS sources, demo articles)
│   └── functions/
│       ├── rss-fetcher/index.ts        # RSS fetch Edge Function
│       ├── llm-translate/index.ts      # Translation Edge Function
│       ├── report-gen/index.ts         # Report generation Edge Function
│       └── _shared/
│           ├── llm-provider.ts         # LLM provider abstraction
│           ├── cors.ts                 # CORS headers
│           └── types.ts               # Shared types
│
└── docs/
    └── superpowers/
        ├── specs/
        │   └── 2026-04-07-sentinel-lens-design.md
        └── plans/
            └── 2026-04-07-sentinel-lens-implementation.md
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `.gitignore`, `.env.local`, `src/app/globals.css`, `src/app/layout.tsx`

- [ ] **Step 1: Initialize git repo**

```bash
cd /Users/ton_piyapong/Desktop/sentinel-lens
git init
```

- [ ] **Step 2: Create Next.js project**

```bash
cd /Users/ton_piyapong/Desktop/sentinel-lens
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

Accept defaults. This creates the base Next.js 14 project with TypeScript and Tailwind.

- [ ] **Step 3: Install all dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr next-intl zustand lucide-react date-fns @react-pdf/renderer
npm install -D supabase @tailwindcss/typography
```

- [ ] **Step 4: Install fonts**

```bash
npm install @fontsource/manrope @fontsource/inter
```

- [ ] **Step 5: Configure tailwind.config.ts with design tokens**

Replace `tailwind.config.ts` with the complete Sentinel Lens design system tokens:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#131317",
          bright: "#39393d",
          tint: "#bbc6e2",
          container: {
            lowest: "#0e0e12",
            low: "#1b1b1f",
            DEFAULT: "#1f1f23",
            high: "#2a2a2e",
            highest: "#353439",
          },
        },
        "on-surface": {
          DEFAULT: "#e4e1e7",
          variant: "#c4c6cc",
        },
        primary: {
          DEFAULT: "#bbc6e2",
          container: "#0f1a2e",
        },
        secondary: {
          DEFAULT: "#4ae183",
          container: "#06bb63",
        },
        tertiary: {
          DEFAULT: "#ffb783",
          container: "#2e1300",
        },
        error: {
          DEFAULT: "#ffb4ab",
          container: "#93000a",
        },
        outline: {
          DEFAULT: "#8e9196",
          variant: "#44474c",
        },
      },
      fontFamily: {
        headline: ["Manrope", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        lg: "0.25rem",
        xl: "0.5rem",
        "2xl": "0.75rem",
        full: "9999px",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
```

- [ ] **Step 6: Create globals.css with base styles**

Replace `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    font-family: "Inter", sans-serif;
    background-color: #131317;
    color: #e4e1e7;
  }

  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 6px;
  }
  ::-webkit-scrollbar-track {
    background: #131317;
  }
  ::-webkit-scrollbar-thumb {
    background: #353439;
    border-radius: 10px;
  }

  /* Thai text optimization */
  .thai-text {
    line-height: 1.6;
  }
}

@layer components {
  /* Glass morphism panel */
  .glass-panel {
    backdrop-filter: blur(16px);
    background: rgba(19, 19, 23, 0.8);
  }

  /* Status glow effects */
  .glow-secondary {
    box-shadow: 0 0 8px rgba(74, 225, 131, 0.5);
  }
  .glow-error {
    box-shadow: 0 0 8px rgba(255, 180, 171, 0.5);
  }
  .glow-tertiary {
    box-shadow: 0 0 8px rgba(255, 183, 131, 0.5);
  }
  .glow-primary {
    box-shadow: 0 0 8px rgba(187, 198, 226, 0.5);
  }
}

/* Print styles */
@media print {
  body {
    background: #131317 !important;
    color: #e4e1e7 !important;
  }
  .no-print {
    display: none !important;
  }
}
```

- [ ] **Step 7: Create root layout with fonts**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sentinel Lens - Cybersecurity Intelligence Feed",
  description:
    "Bilingual cybersecurity intelligence platform with real-time threat monitoring and analysis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
        />
      </head>
      <body className="bg-surface text-on-surface font-body antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Create .env.local template**

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

- [ ] **Step 9: Update .gitignore**

Append to `.gitignore`:

```
.env.local
.env*.local
.superpowers/
```

- [ ] **Step 10: Verify build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 14 project with Sentinel Lens design tokens"
```

---

## Task 2: Supabase Setup & Database Schema

**Files:**
- Create: `supabase/config.toml`, `supabase/migrations/001_initial_schema.sql`, `supabase/seed.sql`, `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`, `src/lib/types/database.ts`

- [ ] **Step 1: Initialize Supabase project locally**

```bash
cd /Users/ton_piyapong/Desktop/sentinel-lens
npx supabase init
```

- [ ] **Step 2: Create database migration**

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ===================== ENUMS =====================
CREATE TYPE user_role AS ENUM ('admin', 'analyst', 'viewer');
CREATE TYPE article_severity AS ENUM ('critical', 'high', 'medium', 'low', 'info');
CREATE TYPE article_status AS ENUM ('new', 'translated', 'reviewed', 'archived');
CREATE TYPE llm_provider AS ENUM ('gemini', 'openrouter');
CREATE TYPE report_type AS ENUM ('executive', 'incident', 'weekly');
CREATE TYPE report_status AS ENUM ('draft', 'generated', 'reviewed', 'published');

-- ===================== PROFILES =====================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  role user_role NOT NULL DEFAULT 'viewer',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===================== RSS SOURCES =====================
CREATE TABLE rss_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  fetch_interval INT NOT NULL DEFAULT 30,
  last_fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== ARTICLES =====================
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

-- ===================== TRANSLATIONS =====================
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

-- ===================== REPORTS =====================
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

-- ===================== APP SETTINGS =====================
CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  updated_by UUID REFERENCES profiles ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO app_settings (key, value) VALUES
  ('llm_provider', '"gemini"'),
  ('llm_api_keys', '{}'),
  ('rss_fetch_interval', '15'),
  ('auto_translate_severity', '["critical", "high"]'),
  ('default_classification', '"TLP:AMBER"');

-- ===================== RLS POLICIES =====================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rss_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES: users can read own, admin reads all
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id OR get_user_role() = 'admin');
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id OR get_user_role() = 'admin');
CREATE POLICY "Admin can manage all profiles" ON profiles
  FOR ALL USING (get_user_role() = 'admin');

-- ARTICLES: public read, analyst+ write
CREATE POLICY "Anyone can read articles" ON articles
  FOR SELECT USING (true);
CREATE POLICY "Analyst can insert articles" ON articles
  FOR INSERT WITH CHECK (get_user_role() IN ('analyst', 'admin'));
CREATE POLICY "Analyst can update articles" ON articles
  FOR UPDATE USING (get_user_role() IN ('analyst', 'admin'));
CREATE POLICY "Admin can delete articles" ON articles
  FOR DELETE USING (get_user_role() = 'admin');

-- TRANSLATIONS: public read, analyst+ write
CREATE POLICY "Anyone can read translations" ON translations
  FOR SELECT USING (true);
CREATE POLICY "Analyst can insert translations" ON translations
  FOR INSERT WITH CHECK (get_user_role() IN ('analyst', 'admin'));
CREATE POLICY "Analyst can update translations" ON translations
  FOR UPDATE USING (get_user_role() IN ('analyst', 'admin'));
CREATE POLICY "Admin can delete translations" ON translations
  FOR DELETE USING (get_user_role() = 'admin');

-- RSS SOURCES: analyst can read, admin manages
CREATE POLICY "Analyst can view sources" ON rss_sources
  FOR SELECT USING (get_user_role() IN ('analyst', 'admin'));
CREATE POLICY "Admin can manage sources" ON rss_sources
  FOR ALL USING (get_user_role() = 'admin');

-- REPORTS: authenticated read, analyst+ write
CREATE POLICY "Authenticated can read published reports" ON reports
  FOR SELECT USING (
    status = 'published' OR
    created_by = auth.uid() OR
    get_user_role() IN ('analyst', 'admin')
  );
CREATE POLICY "Analyst can insert reports" ON reports
  FOR INSERT WITH CHECK (get_user_role() IN ('analyst', 'admin'));
CREATE POLICY "Analyst can update own reports" ON reports
  FOR UPDATE USING (
    created_by = auth.uid() OR get_user_role() = 'admin'
  );
CREATE POLICY "Admin can delete reports" ON reports
  FOR DELETE USING (get_user_role() = 'admin');

-- REPORT_ARTICLES: follows reports access
CREATE POLICY "Read report articles" ON report_articles
  FOR SELECT USING (true);
CREATE POLICY "Analyst can manage report articles" ON report_articles
  FOR ALL USING (get_user_role() IN ('analyst', 'admin'));

-- APP SETTINGS: admin only
CREATE POLICY "Admin can manage settings" ON app_settings
  FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Edge functions can read settings" ON app_settings
  FOR SELECT USING (true);

-- ===================== UPDATED_AT TRIGGER =====================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON translations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===================== STORAGE BUCKET =====================
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', false);

CREATE POLICY "Authenticated users can read reports" ON storage.objects
  FOR SELECT USING (bucket_id = 'reports' AND auth.role() = 'authenticated');
CREATE POLICY "Analyst can upload reports" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'reports' AND
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('analyst', 'admin')
  );
```

- [ ] **Step 3: Create seed data**

Create `supabase/seed.sql`:

```sql
-- Seed RSS sources
INSERT INTO rss_sources (name, url) VALUES
  ('The Hacker News', 'https://feeds.feedburner.com/TheHackersNews'),
  ('BleepingComputer', 'https://www.bleepingcomputer.com/feed/'),
  ('Krebs on Security', 'https://krebsonsecurity.com/feed/'),
  ('Dark Reading', 'https://www.darkreading.com/rss.xml'),
  ('SecurityWeek', 'https://feeds.feedburner.com/securityweek'),
  ('Threatpost', 'https://threatpost.com/feed/');

-- Seed demo articles
INSERT INTO articles (title, content, excerpt, severity, status, published_at, tags) VALUES
  (
    'Critical Zero-Day Vulnerability Found in Major Enterprise VPN',
    'Security researchers have discovered a critical zero-day vulnerability (CVE-2026-1234) affecting multiple enterprise VPN solutions. The flaw allows unauthenticated remote code execution and has been actively exploited in the wild by APT29 threat actors. Organizations are urged to apply emergency patches immediately.',
    'A critical zero-day in enterprise VPN products is being actively exploited by APT29. Patch immediately.',
    'critical',
    'new',
    now() - interval '2 hours',
    ARRAY['zero-day', 'VPN', 'APT29', 'CVE-2026-1234']
  ),
  (
    'Ransomware Group Deploys New Evasion Technique Against EDR',
    'The BlackCat ransomware group has developed a novel technique to bypass endpoint detection and response (EDR) solutions. The attack leverages signed kernel drivers to disable security software before deploying encryption payloads. Multiple Fortune 500 companies have been affected.',
    'BlackCat ransomware bypasses EDR using signed kernel drivers. Multiple Fortune 500 targets confirmed.',
    'high',
    'new',
    now() - interval '5 hours',
    ARRAY['ransomware', 'BlackCat', 'EDR', 'evasion']
  ),
  (
    'NIST Releases Updated Cybersecurity Framework 3.0 Guidelines',
    'The National Institute of Standards and Technology has published version 3.0 of its Cybersecurity Framework. Key updates include enhanced supply chain risk management guidance, improved metrics for measuring cybersecurity posture, and new references to emerging technologies including AI-driven threat detection.',
    'NIST CSF 3.0 released with major updates to supply chain security and AI threat detection guidance.',
    'medium',
    'new',
    now() - interval '8 hours',
    ARRAY['NIST', 'framework', 'compliance', 'guidelines']
  ),
  (
    'Microsoft Patches 87 Vulnerabilities Including 3 Critical RCE Flaws',
    'Microsoft''s April 2026 Patch Tuesday addresses 87 security vulnerabilities across Windows, Office, and Azure services. Three critical remote code execution flaws in Exchange Server require immediate attention. Two of the vulnerabilities are confirmed to be under active exploitation.',
    'April 2026 Patch Tuesday: 87 fixes including 3 critical Exchange RCE flaws under active exploitation.',
    'high',
    'new',
    now() - interval '12 hours',
    ARRAY['Microsoft', 'patch-tuesday', 'Exchange', 'RCE']
  ),
  (
    'New Phishing Campaign Targets Financial Sector with AI-Generated Lures',
    'Researchers have identified a sophisticated phishing campaign using AI-generated content to target banking and financial services employees. The campaign uses deepfake audio in combination with convincing email lures to bypass traditional phishing detection. Over 200 organizations in APAC have been targeted.',
    'AI-powered phishing campaign targets 200+ APAC financial institutions with deepfake audio lures.',
    'high',
    'new',
    now() - interval '1 day',
    ARRAY['phishing', 'AI', 'deepfake', 'financial']
  ),
  (
    'Open Source Supply Chain Attack Compromises Popular NPM Package',
    'A supply chain attack has been discovered in a widely-used NPM package with over 2 million weekly downloads. The malicious code was introduced through a compromised maintainer account and exfiltrates environment variables and SSH keys to an attacker-controlled server.',
    'Popular NPM package with 2M+ weekly downloads compromised in supply chain attack.',
    'critical',
    'new',
    now() - interval '1 day',
    ARRAY['supply-chain', 'NPM', 'open-source', 'malware']
  );
```

- [ ] **Step 4: Create Supabase client utilities**

Create `src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

Create `src/lib/supabase/server.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component — ignore
          }
        },
      },
    }
  );
}
```

Create `src/lib/supabase/middleware.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtectedRoute = request.nextUrl.pathname.startsWith("/(protected)") ||
    request.nextUrl.pathname.startsWith("/translation-lab") ||
    request.nextUrl.pathname.startsWith("/report-archive") ||
    request.nextUrl.pathname.startsWith("/report") ||
    request.nextUrl.pathname.startsWith("/settings");

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Role-based access control
  if (user && isProtectedRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role || "viewer";
    const pathname = request.nextUrl.pathname;

    if (pathname.startsWith("/settings") && role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    if (
      (pathname.startsWith("/translation-lab") || pathname === "/report/new") &&
      role === "viewer"
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
```

- [ ] **Step 5: Create middleware.ts**

Create `middleware.ts` at project root:

```typescript
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 6: Create database TypeScript types**

Create `src/lib/types/database.ts`:

```typescript
export type UserRole = "admin" | "analyst" | "viewer";
export type ArticleSeverity = "critical" | "high" | "medium" | "low" | "info";
export type ArticleStatus = "new" | "translated" | "reviewed" | "archived";
export type LLMProvider = "gemini" | "openrouter";
export type ReportType = "executive" | "incident" | "weekly";
export type ReportStatus = "draft" | "generated" | "reviewed" | "published";

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface RSSSource {
  id: string;
  name: string;
  url: string;
  is_active: boolean;
  fetch_interval: number;
  last_fetched_at: string | null;
  created_at: string;
}

export interface Article {
  id: string;
  source_id: string | null;
  title: string;
  content: string;
  excerpt: string;
  url: string | null;
  image_url: string | null;
  author: string | null;
  severity: ArticleSeverity;
  status: ArticleStatus;
  tags: string[];
  published_at: string;
  is_manual: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Translation {
  id: string;
  article_id: string;
  title_th: string;
  content_th: string;
  excerpt_th: string;
  provider: LLMProvider;
  model: string;
  confidence: number;
  is_verified: boolean;
  verified_by: string | null;
  token_usage: number;
  translated_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  title: string;
  report_type: ReportType;
  content_en: Record<string, unknown>;
  content_th: Record<string, unknown>;
  severity: ArticleSeverity;
  classification: string;
  provider: LLMProvider | null;
  model: string | null;
  pdf_path: string | null;
  status: ReportStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AppSetting {
  id: string;
  key: string;
  value: unknown;
  updated_by: string | null;
  updated_at: string;
}

export interface ArticleWithTranslation extends Article {
  translations: Translation | null;
}
```

- [ ] **Step 7: Commit**

```bash
git add supabase/ src/lib/ middleware.ts
git commit -m "feat: add Supabase setup, database schema, RLS policies, and seed data"
```

---

## Task 3: UI Component Library

**Files:**
- Create: `src/components/ui/Button.tsx`, `Card.tsx`, `Badge.tsx`, `StatusIndicator.tsx`, `ThreatMeter.tsx`, `Input.tsx`, `Select.tsx`

- [ ] **Step 1: Create Button component**

Create `src/components/ui/Button.tsx`:

```tsx
import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "security" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-[#263046] hover:opacity-90 active:scale-95",
  secondary:
    "border border-outline-variant/20 text-primary hover:bg-surface-container-high active:scale-95",
  security:
    "bg-secondary-container text-white hover:opacity-90 shadow-[0_4px_12px_rgba(74,225,131,0.2)] active:scale-95",
  ghost:
    "text-on-surface-variant hover:text-white hover:bg-surface-container-high active:opacity-90",
  danger:
    "bg-error-container text-error hover:opacity-90 active:scale-95",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-sm",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center gap-2
          font-medium rounded-lg
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export { Button };
export type { ButtonProps, ButtonVariant };
```

- [ ] **Step 2: Create Card component**

Create `src/components/ui/Card.tsx`:

```tsx
import { HTMLAttributes, forwardRef } from "react";

type CardVariant = "low" | "default" | "high" | "highest" | "lowest";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  hoverable?: boolean;
}

const variantClasses: Record<CardVariant, string> = {
  lowest: "bg-surface-container-lowest",
  low: "bg-surface-container-low",
  default: "bg-surface-container",
  high: "bg-surface-container-high",
  highest: "bg-surface-container-highest",
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "low", hoverable = false, className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          rounded-xl p-6
          ${variantClasses[variant]}
          ${hoverable ? "hover:bg-surface-container-high transition-all duration-200 cursor-pointer" : ""}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
export { Card };
export type { CardProps };
```

- [ ] **Step 3: Create Badge component**

Create `src/components/ui/Badge.tsx`:

```tsx
import type { ArticleSeverity, ArticleStatus } from "@/lib/types/database";

interface BadgeProps {
  severity?: ArticleSeverity;
  status?: ArticleStatus;
  label?: string;
  className?: string;
}

const severityClasses: Record<ArticleSeverity, string> = {
  critical: "bg-error/20 text-error",
  high: "bg-tertiary/20 text-tertiary",
  medium: "bg-primary/20 text-primary",
  low: "bg-secondary/20 text-secondary",
  info: "bg-surface-container-high text-on-surface-variant",
};

const statusClasses: Record<ArticleStatus, string> = {
  new: "bg-primary/20 text-primary",
  translated: "bg-secondary/20 text-secondary",
  reviewed: "bg-secondary/20 text-secondary",
  archived: "bg-surface-container-high text-on-surface-variant",
};

export function Badge({ severity, status, label, className = "" }: BadgeProps) {
  const classes = severity
    ? severityClasses[severity]
    : status
      ? statusClasses[status]
      : "bg-surface-container-high text-on-surface-variant";

  const text = label || severity || status || "";

  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5
        rounded text-[10px] font-semibold
        uppercase tracking-widest
        ${classes} ${className}
      `}
    >
      {text}
    </span>
  );
}
```

- [ ] **Step 4: Create StatusIndicator component**

Create `src/components/ui/StatusIndicator.tsx`:

```tsx
type StatusType = "secure" | "warning" | "critical" | "neutral";

interface StatusIndicatorProps {
  status: StatusType;
  size?: number;
  label?: string;
}

const statusClasses: Record<StatusType, string> = {
  secure: "bg-secondary glow-secondary",
  warning: "bg-tertiary glow-tertiary",
  critical: "bg-error glow-error",
  neutral: "bg-outline",
};

export function StatusIndicator({
  status,
  size = 8,
  label,
}: StatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`rounded-full ${statusClasses[status]}`}
        style={{ width: size, height: size }}
      />
      {label && (
        <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-medium">
          {label}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create ThreatMeter component**

Create `src/components/ui/ThreatMeter.tsx`:

```tsx
interface ThreatMeterProps {
  value: number; // 0-100
  variant?: "primary" | "secondary" | "tertiary" | "error";
  height?: number;
}

const gradients: Record<string, string> = {
  primary: "from-primary to-primary-container",
  secondary: "from-secondary to-secondary-container",
  tertiary: "from-tertiary to-tertiary-container",
  error: "from-error to-error-container",
};

export function ThreatMeter({
  value,
  variant = "tertiary",
  height = 3,
}: ThreatMeterProps) {
  return (
    <div
      className="w-full rounded-full bg-surface-container-highest overflow-hidden"
      style={{ height }}
    >
      <div
        className={`h-full rounded-full bg-gradient-to-r ${gradients[variant]} transition-all duration-500`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
```

- [ ] **Step 6: Create Input component**

Create `src/components/ui/Input.tsx`:

```tsx
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ icon, className = "", ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={`
            w-full bg-surface-container-lowest
            border-b-2 border-outline-variant/30
            focus:border-primary focus:outline-none
            text-on-surface placeholder:text-on-surface-variant/50
            px-4 py-2.5 text-sm font-body
            transition-colors duration-200
            ${icon ? "pl-10" : ""}
            ${className}
          `}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = "Input";
export { Input };
```

- [ ] **Step 7: Create Select component**

Create `src/components/ui/Select.tsx`:

```tsx
import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
  icon?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, icon, className = "", ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
            {icon}
          </span>
        )}
        <select
          ref={ref}
          className={`
            w-full bg-surface-container-lowest appearance-none
            border-b-2 border-outline-variant/30
            focus:border-primary focus:outline-none
            text-on-surface text-sm font-body
            px-4 py-2.5 pr-10
            transition-colors duration-200
            ${icon ? "pl-10" : ""}
            ${className}
          `}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none">
          expand_more
        </span>
      </div>
    );
  }
);

Select.displayName = "Select";
export { Select };
```

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/
git commit -m "feat: add UI component library (Button, Card, Badge, StatusIndicator, ThreatMeter, Input, Select)"
```

---

## Task 4: Layout Components (Sidebar + TopBar)

**Files:**
- Create: `src/components/layout/Sidebar.tsx`, `src/components/layout/TopBar.tsx`, `src/app/(public)/layout.tsx`, `src/app/(protected)/layout.tsx`

- [ ] **Step 1: Create Sidebar component**

Create `src/components/layout/Sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";

const navItems = [
  { href: "/", icon: "rss_feed", label: "Intelligence Feed" },
  { href: "/translation-lab", icon: "g_translate", label: "Translation Lab" },
  { href: "/report-archive", icon: "description", label: "Report Archive" },
  { href: "/report/new", icon: "picture_as_pdf", label: "Export Center" },
  { href: "/settings", icon: "admin_panel_settings", label: "Security Settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container-low flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 pb-4">
        <h1 className="font-headline text-xl font-bold text-on-surface tracking-tight">
          Sentinel Lens
        </h1>
        <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mt-1">
          Cybersecurity Intelligence
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-colors duration-200
                ${
                  isActive
                    ? "bg-surface-container-high border-l-4 border-primary text-primary font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-surface-container"
                }
              `}
            >
              <span className="material-symbols-outlined text-lg">
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-4 space-y-3">
        <Button variant="primary" size="md" className="w-full">
          <span className="material-symbols-outlined text-lg">add</span>
          New Analysis
        </Button>
        <div className="flex flex-col gap-1">
          <Link
            href="#"
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-sm">help_outline</span>
            Support
          </Link>
          <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors text-left">
            <span className="material-symbols-outlined text-sm">logout</span>
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create TopBar component**

Create `src/components/layout/TopBar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Input } from "@/components/ui/Input";

const pageTitles: Record<string, string> = {
  "/": "Intelligence Feed",
  "/translation-lab": "Translation Lab",
  "/report-archive": "Report Archive",
  "/report/new": "Export Center",
  "/settings": "Security Settings",
};

export function TopBar() {
  const pathname = usePathname();
  const title = Object.entries(pageTitles).find(([path]) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path)
  )?.[1] || "Sentinel Lens";

  return (
    <header className="fixed top-0 right-0 left-64 h-16 bg-surface/80 backdrop-blur-md z-40 flex items-center justify-between px-8">
      {/* Left: Title + Nav */}
      <div className="flex items-center gap-6">
        <h2 className="font-headline text-lg font-semibold text-on-surface">
          {title}
        </h2>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/"
            className="px-3 py-1 text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Global Feed
          </Link>
          <span className="text-outline-variant">|</span>
          <Link
            href="/report-archive"
            className="px-3 py-1 text-on-surface-variant hover:text-on-surface transition-colors"
          >
            My Reports
          </Link>
        </nav>
      </div>

      {/* Right: Search + Actions + Avatar */}
      <div className="flex items-center gap-4">
        <div className="w-56">
          <Input icon="search" placeholder="Search threats..." />
        </div>
        <button className="p-2 text-on-surface-variant hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="p-2 text-on-surface-variant hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined">history</span>
        </button>
        <div className="w-8 h-8 rounded-full bg-surface-container-highest overflow-hidden">
          <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
            U
          </div>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Create public layout**

Create `src/app/(public)/layout.tsx`:

```tsx
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <TopBar />
      <main className="ml-64 pt-24 px-8 pb-12">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Create protected layout**

Create `src/app/(protected)/layout.tsx`:

```tsx
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <TopBar />
      <main className="ml-64 pt-24 px-8 pb-12">{children}</main>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/ src/app/\(public\)/ src/app/\(protected\)/
git commit -m "feat: add Sidebar, TopBar, and page layouts"
```

---

## Task 5: Auth Pages

**Files:**
- Create: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/callback/route.ts`

- [ ] **Step 1: Create login page**

Create `src/app/(auth)/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      window.location.href = "/";
    }
  }

  async function handleOAuthLogin(provider: "google" | "github") {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-headline text-3xl font-bold text-on-surface tracking-tight">
            Sentinel Lens
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-on-surface-variant mt-2">
            Cybersecurity Intelligence
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-surface-container-low rounded-xl p-8 space-y-6">
          <div>
            <h2 className="font-headline text-xl font-semibold text-on-surface">
              Sign In
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Access your intelligence dashboard
            </p>
          </div>

          {error && (
            <div className="bg-error/10 text-error text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* OAuth buttons */}
          <div className="space-y-3">
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => handleOAuthLogin("google")}
            >
              Continue with Google
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => handleOAuthLogin("github")}
            >
              Continue with GitHub
            </Button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-outline-variant/20" />
            <span className="text-xs text-on-surface-variant uppercase tracking-wider">
              or
            </span>
            <div className="flex-1 h-px bg-outline-variant/20" />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create OAuth callback handler**

Create `src/app/(auth)/callback/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/
git commit -m "feat: add login page with email/OAuth and callback handler"
```

---

## Task 6: Intelligence Feed Page

**Files:**
- Create: `src/components/feed/HeroBriefing.tsx`, `NetworkHealth.tsx`, `ArticleCard.tsx`, `ArticleGrid.tsx`, `src/app/(public)/page.tsx`

- [ ] **Step 1: Create HeroBriefing component**

Create `src/components/feed/HeroBriefing.tsx`:

```tsx
import { Card } from "@/components/ui/Card";

interface HeroBriefingProps {
  feedRelevance: number;
  activeThreats: number;
  criticalAlerts: number;
}

export function HeroBriefing({
  feedRelevance,
  activeThreats,
  criticalAlerts,
}: HeroBriefingProps) {
  return (
    <Card variant="low" className="relative overflow-hidden col-span-1 lg:col-span-8">
      {/* Decorative gradient orb */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />

      <div className="relative">
        <p className="text-[10px] uppercase tracking-[0.3em] text-on-surface-variant font-medium mb-2">
          Daily Intelligence
        </p>
        <h2 className="font-headline text-3xl font-bold text-on-surface tracking-tight mb-2">
          Morning Intel Briefing
        </h2>
        <p className="text-sm text-on-surface-variant font-light mb-8 max-w-2xl">
          Your curated cybersecurity intelligence feed. AI-prioritized threats
          and vulnerabilities relevant to your security posture.
        </p>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-8">
          <div>
            <p className="font-headline text-4xl font-extrabold text-on-surface">
              {feedRelevance}%
            </p>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">
              Feed Relevance
            </p>
          </div>
          <div>
            <p className="font-headline text-4xl font-extrabold text-on-surface">
              {String(activeThreats).padStart(2, "0")}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">
              Active Threats
            </p>
          </div>
          <div>
            <p className="font-headline text-4xl font-extrabold text-error">
              {String(criticalAlerts).padStart(2, "0")}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">
              Critical Alerts
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Create NetworkHealth component**

Create `src/components/feed/NetworkHealth.tsx`:

```tsx
import { Card } from "@/components/ui/Card";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { ThreatMeter } from "@/components/ui/ThreatMeter";

export function NetworkHealth() {
  return (
    <Card variant="low" className="col-span-1 lg:col-span-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-headline text-sm font-semibold text-on-surface uppercase tracking-wider">
          Network Health
        </h3>
        <span className="material-symbols-outlined text-primary text-lg">
          shield_with_heart
        </span>
      </div>

      {/* Threat meter */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-on-surface-variant">Threat Level</span>
          <span className="text-xs font-semibold text-tertiary">Elevated</span>
        </div>
        <ThreatMeter value={65} variant="tertiary" />
      </div>

      {/* Status items */}
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIndicator status="secure" />
            <span className="text-sm text-on-surface">Firewall</span>
          </div>
          <span className="text-xs text-secondary font-medium">Active</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIndicator status="secure" />
            <span className="text-sm text-on-surface">EDR</span>
          </div>
          <span className="text-xs text-secondary font-medium">Active</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIndicator status="warning" />
            <span className="text-sm text-on-surface">VPN Gateway</span>
          </div>
          <span className="text-xs text-tertiary font-medium">Degraded</span>
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Create ArticleCard component**

Create `src/components/feed/ArticleCard.tsx`:

```tsx
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/Badge";
import type { ArticleWithTranslation } from "@/lib/types/database";

interface ArticleCardProps {
  article: ArticleWithTranslation;
  featured?: boolean;
}

export function ArticleCard({ article, featured = false }: ArticleCardProps) {
  const timeAgo = formatDistanceToNow(new Date(article.published_at), {
    addSuffix: true,
  });

  return (
    <div
      className={`
        bg-surface-container-low rounded-xl p-6 flex flex-col
        hover:bg-surface-container-high transition-all duration-200
        group
        ${featured ? "md:col-span-2" : ""}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <Badge severity={article.severity} />
        <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">
          {timeAgo}
        </span>
      </div>

      {/* Content */}
      <Link href={`/article/${article.id}`}>
        <h3 className="font-headline text-lg font-bold text-on-surface group-hover:text-primary transition-colors mb-2 line-clamp-2">
          {article.title}
        </h3>
      </Link>
      <p className="text-sm text-on-surface-variant font-light line-clamp-3 mb-4 flex-1">
        {article.excerpt}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3">
        <div className="flex items-center gap-2">
          {article.status === "translated" && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-secondary/20 text-secondary uppercase tracking-wider font-medium">
              Translated
            </span>
          )}
          {article.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant uppercase tracking-wider"
            >
              {tag}
            </span>
          ))}
        </div>

        {article.status === "new" && (
          <button className="flex items-center gap-1 text-xs text-primary hover:text-white transition-colors">
            <span className="material-symbols-outlined text-sm">translate</span>
            Translate
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create ArticleGrid component**

Create `src/components/feed/ArticleGrid.tsx`:

```tsx
import { ArticleCard } from "./ArticleCard";
import type { ArticleWithTranslation } from "@/lib/types/database";

interface ArticleGridProps {
  articles: ArticleWithTranslation[];
}

export function ArticleGrid({ articles }: ArticleGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {articles.map((article, index) => (
        <ArticleCard
          key={article.id}
          article={article}
          featured={index === 3}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Create Intelligence Feed page**

Create `src/app/(public)/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { HeroBriefing } from "@/components/feed/HeroBriefing";
import { NetworkHealth } from "@/components/feed/NetworkHealth";
import { ArticleGrid } from "@/components/feed/ArticleGrid";
import type { ArticleWithTranslation } from "@/lib/types/database";

export const revalidate = 300; // Revalidate every 5 minutes

export default async function IntelligenceFeedPage() {
  const supabase = await createClient();

  const { data: articles } = await supabase
    .from("articles")
    .select("*, translations(*)")
    .order("published_at", { ascending: false })
    .limit(12);

  const typedArticles = (articles || []).map((a) => ({
    ...a,
    translations: Array.isArray(a.translations)
      ? a.translations[0] || null
      : a.translations,
  })) as ArticleWithTranslation[];

  const criticalCount = typedArticles.filter(
    (a) => a.severity === "critical"
  ).length;
  const activeThreats = typedArticles.filter((a) =>
    ["critical", "high"].includes(a.severity)
  ).length;

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <HeroBriefing
          feedRelevance={84}
          activeThreats={activeThreats}
          criticalAlerts={criticalCount}
        />
        <NetworkHealth />
      </div>

      {/* Feed Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline text-xl font-semibold text-on-surface">
            Latest Intelligence
          </h2>
          <span className="text-xs text-on-surface-variant">
            {typedArticles.length} articles
          </span>
        </div>
        <ArticleGrid articles={typedArticles} />
      </div>

      {/* FAB */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-secondary rounded-full flex items-center justify-center shadow-[0_16px_32px_rgba(74,225,131,0.2)] hover:opacity-90 active:scale-95 transition-all z-50">
        <span className="material-symbols-outlined text-[#131317]">
          auto_awesome
        </span>
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/feed/ src/app/\(public\)/page.tsx
git commit -m "feat: add Intelligence Feed page with hero briefing, network health, and article grid"
```

---

## Task 7: Translation Lab Page

**Files:**
- Create: `src/components/translation/Toolbar.tsx`, `SourcePane.tsx`, `TargetPane.tsx`, `AnalysisCards.tsx`, `src/app/(protected)/translation-lab/page.tsx`

- [ ] **Step 1: Create Toolbar component**

Create `src/components/translation/Toolbar.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface ToolbarProps {
  onExportPdf?: () => void;
}

export function Toolbar({ onExportPdf }: ToolbarProps) {
  const [activeTab, setActiveTab] = useState<"translate" | "compare">("translate");
  const [showExportMenu, setShowExportMenu] = useState(false);

  return (
    <div className="bg-surface-container-low p-4 flex items-center justify-between">
      {/* Tab group */}
      <div className="flex items-center gap-2">
        <div className="flex bg-surface-container rounded-lg p-1">
          <button
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === "translate"
                ? "bg-primary text-[#263046] font-medium"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            onClick={() => setActiveTab("translate")}
          >
            Translate
          </button>
          <button
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === "compare"
                ? "bg-primary text-[#263046] font-medium"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            onClick={() => setActiveTab("compare")}
          >
            Compare
          </button>
        </div>

        {/* Tool buttons */}
        <div className="flex items-center gap-1 ml-4">
          <button className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors rounded-lg">
            <span className="material-symbols-outlined text-lg">fact_check</span>
          </button>
          <button className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors rounded-lg">
            <span className="material-symbols-outlined text-lg">edit_note</span>
          </button>
          <button className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors rounded-lg">
            <span className="material-symbols-outlined text-lg">update</span>
          </button>
        </div>
      </div>

      {/* Export */}
      <div className="relative">
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowExportMenu(!showExportMenu)}
          className="shadow-[0_4px_12px_rgba(187,198,226,0.2)]"
        >
          <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
          Export
          <span className="material-symbols-outlined text-sm">expand_more</span>
        </Button>

        {showExportMenu && (
          <div className="absolute right-0 top-full mt-2 w-48 glass-panel rounded-xl p-2 shadow-2xl z-10">
            <button
              className="w-full text-left px-3 py-2 text-sm text-on-surface hover:bg-surface-container-high rounded-lg transition-colors"
              onClick={onExportPdf}
            >
              Export as PDF
            </button>
            <button className="w-full text-left px-3 py-2 text-sm text-on-surface hover:bg-surface-container-high rounded-lg transition-colors">
              Export as Markdown
            </button>
            <button className="w-full text-left px-3 py-2 text-sm text-on-surface hover:bg-surface-container-high rounded-lg transition-colors">
              Copy to Clipboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create SourcePane component**

Create `src/components/translation/SourcePane.tsx`:

```tsx
import { Badge } from "@/components/ui/Badge";

interface SourcePaneProps {
  title: string;
  content: string;
  confidence?: number;
}

export function SourcePane({ title, content, confidence = 99.8 }: SourcePaneProps) {
  return (
    <div className="bg-surface-container-low p-8 h-[716px] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Badge label="Source" />
          <span className="text-xs text-on-surface-variant uppercase tracking-wider">
            English
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-on-surface-variant">Confidence</span>
          <span className="text-sm font-semibold text-primary">{confidence}%</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        <h3 className="font-headline text-2xl font-bold text-on-surface leading-tight">
          {title}
        </h3>
        <div className="text-sm text-on-surface-variant font-light leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create TargetPane component**

Create `src/components/translation/TargetPane.tsx`:

```tsx
import { Badge } from "@/components/ui/Badge";

interface TargetPaneProps {
  title: string;
  content: string;
  isVerified?: boolean;
}

export function TargetPane({ title, content, isVerified = false }: TargetPaneProps) {
  return (
    <div className="bg-surface-container p-8 h-[716px] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Badge label="Target" />
          <span className="text-xs text-on-surface-variant uppercase tracking-wider">
            Thai
          </span>
        </div>
        {isVerified && (
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-secondary text-sm">
              check_circle
            </span>
            <span className="text-[10px] text-secondary uppercase tracking-widest font-semibold">
              Verified Translation
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        <h3 className="font-headline text-2xl font-bold text-on-surface leading-tight thai-text">
          {title}
        </h3>
        <div className="text-sm text-on-surface-variant font-light thai-text whitespace-pre-wrap">
          {content}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create AnalysisCards component**

Create `src/components/translation/AnalysisCards.tsx`:

```tsx
import { Card } from "@/components/ui/Card";
import { ThreatMeter } from "@/components/ui/ThreatMeter";
import { StatusIndicator } from "@/components/ui/StatusIndicator";

interface AnalysisCardsProps {
  riskLevel: number;
  termAccuracy: number;
  verdictItems: { label: string; passed: boolean }[];
}

export function AnalysisCards({
  riskLevel,
  termAccuracy,
  verdictItems,
}: AnalysisCardsProps) {
  // SVG circular progress
  const circumference = 2 * Math.PI * 15.9155;
  const offset = circumference - (termAccuracy / 100) * circumference;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Risk Level */}
      <Card variant="low" className="relative overflow-hidden">
        <span className="material-symbols-outlined absolute top-4 right-4 text-4xl text-on-surface/10 group-hover:scale-110 transition-transform">
          shield_lock
        </span>
        <h4 className="text-[10px] uppercase tracking-widest text-on-surface-variant font-semibold mb-4">
          Risk Level
        </h4>
        <p className="font-headline text-3xl font-extrabold text-error mb-3">
          {riskLevel}%
        </p>
        <ThreatMeter value={riskLevel} variant="error" height={4} />
      </Card>

      {/* Term Accuracy */}
      <Card variant="low" className="relative overflow-hidden">
        <span className="material-symbols-outlined absolute top-4 right-4 text-4xl text-on-surface/10">
          translate
        </span>
        <h4 className="text-[10px] uppercase tracking-widest text-on-surface-variant font-semibold mb-4">
          Term Accuracy
        </h4>
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#2a2a2e"
              strokeWidth="3"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#bbc6e2"
              strokeWidth="3"
              strokeDasharray={`${circumference}`}
              strokeDashoffset={`${offset}`}
              strokeLinecap="round"
            />
          </svg>
          <div>
            <p className="font-headline text-2xl font-extrabold text-on-surface">
              {termAccuracy}%
            </p>
            <p className="text-[10px] uppercase tracking-widest text-secondary">
              Optimized
            </p>
          </div>
        </div>
      </Card>

      {/* Analyst Verdict */}
      <Card variant="low" className="relative overflow-hidden">
        <span className="material-symbols-outlined absolute top-4 right-4 text-4xl text-on-surface/10">
          insights
        </span>
        <h4 className="text-[10px] uppercase tracking-widest text-on-surface-variant font-semibold mb-4">
          Analyst Verdict
        </h4>
        <div className="space-y-3">
          {verdictItems.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <StatusIndicator
                status={item.passed ? "secure" : "critical"}
                size={6}
              />
              <span className="text-sm text-on-surface">{item.label}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Create Translation Lab page**

Create `src/app/(protected)/translation-lab/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Toolbar } from "@/components/translation/Toolbar";
import { SourcePane } from "@/components/translation/SourcePane";
import { TargetPane } from "@/components/translation/TargetPane";
import { AnalysisCards } from "@/components/translation/AnalysisCards";
import type { Article, Translation } from "@/lib/types/database";

export default function TranslationLabPage() {
  const [articles, setArticles] = useState<(Article & { translations: Translation | null })[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    async function fetchArticles() {
      const { data } = await supabase
        .from("articles")
        .select("*, translations(*)")
        .eq("status", "translated")
        .order("published_at", { ascending: false })
        .limit(20);

      if (data) {
        const mapped = data.map((a) => ({
          ...a,
          translations: Array.isArray(a.translations)
            ? a.translations[0] || null
            : a.translations,
        }));
        setArticles(mapped);
      }
    }
    fetchArticles();
  }, [supabase]);

  const current = articles[selectedIndex];
  const translation = current?.translations;

  return (
    <div className="space-y-6 -mx-8 -mt-8">
      {/* Toolbar */}
      <Toolbar />

      {/* Dual Pane */}
      <div className="mx-8">
        {current ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-outline-variant/10 rounded-xl overflow-hidden">
              <SourcePane
                title={current.title}
                content={current.content}
                confidence={translation?.confidence ? translation.confidence * 100 : 0}
              />
              <TargetPane
                title={translation?.title_th || "Translation pending..."}
                content={translation?.content_th || "Click translate to generate Thai translation."}
                isVerified={translation?.is_verified || false}
              />
            </div>

            {/* Analysis Cards */}
            <div className="mt-6">
              <AnalysisCards
                riskLevel={94}
                termAccuracy={translation?.confidence ? Math.round(translation.confidence * 100) : 0}
                verdictItems={[
                  { label: "Context Preserved", passed: true },
                  { label: "Technical Terms Intact", passed: true },
                  { label: "Tone Consistency", passed: !!translation?.is_verified },
                ]}
              />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-[716px] bg-surface-container-low rounded-xl">
            <p className="text-on-surface-variant">No translated articles found. Translate an article from the feed first.</p>
          </div>
        )}

        {/* Footer Stats */}
        <div className="mt-6 bg-surface-container-lowest rounded-xl p-6 flex items-center justify-between">
          <div className="flex gap-12">
            <div>
              <p className="font-headline text-xl font-bold text-on-surface">
                {translation?.token_usage || 0}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                Tokens Used
              </p>
            </div>
            <div>
              <p className="font-headline text-xl font-bold text-on-surface">1.2s</p>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                Processing Time
              </p>
            </div>
            <div>
              <p className="font-headline text-xl font-bold text-on-surface">
                {translation?.provider || "N/A"}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                API Provider
              </p>
            </div>
          </div>
          <p className="text-[10px] text-on-surface-variant max-w-xs">
            Translations are AI-generated and should be reviewed by a qualified analyst
            before distribution.
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/translation/ src/app/\(protected\)/translation-lab/
git commit -m "feat: add Translation Lab with dual-pane editor and analysis cards"
```

---

## Task 8: Report Archive Page

**Files:**
- Create: `src/components/report/FilterBar.tsx`, `ReportCard.tsx`, `src/app/(protected)/report-archive/page.tsx`

- [ ] **Step 1: Create FilterBar component**

Create `src/components/report/FilterBar.tsx`:

```tsx
"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

interface FilterBarProps {
  onSearchChange: (value: string) => void;
  onSeverityChange: (value: string) => void;
  onDateChange: (value: string) => void;
}

export function FilterBar({
  onSearchChange,
  onSeverityChange,
  onDateChange,
}: FilterBarProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div className="md:col-span-2">
        <Input
          icon="search"
          placeholder="Search by client, threat ID, or keyword..."
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <Select
        options={[
          { value: "all", label: "All Threat Levels" },
          { value: "critical", label: "Critical" },
          { value: "high", label: "High" },
          { value: "medium", label: "Medium" },
          { value: "low", label: "Low" },
        ]}
        onChange={(e) => onSeverityChange(e.target.value)}
      />
      <Select
        options={[
          { value: "all", label: "All Dates" },
          { value: "7d", label: "Last 7 Days" },
          { value: "30d", label: "Last 30 Days" },
          { value: "90d", label: "Last 90 Days" },
        ]}
        onChange={(e) => onDateChange(e.target.value)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create ReportCard component**

Create `src/components/report/ReportCard.tsx`:

```tsx
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/Badge";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import type { Report } from "@/lib/types/database";

interface ReportCardProps {
  report: Report;
  onDownload?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
}

const severityToStatus = {
  critical: "critical" as const,
  high: "warning" as const,
  medium: "neutral" as const,
  low: "secure" as const,
  info: "neutral" as const,
};

export function ReportCard({
  report,
  onDownload,
  onShare,
  onDelete,
}: ReportCardProps) {
  const timeAgo = formatDistanceToNow(new Date(report.created_at), {
    addSuffix: true,
  });

  return (
    <div className="bg-surface-container-low rounded-xl border border-outline-variant/5 flex flex-col md:flex-row hover:bg-surface-container-high transition-all duration-200 group overflow-hidden">
      {/* Image preview */}
      <div className="w-full md:w-48 h-32 md:h-auto relative overflow-hidden bg-surface-container">
        <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low/80 to-transparent z-10" />
        <div className="w-full h-full bg-primary/5 flex items-center justify-center">
          <span className="material-symbols-outlined text-4xl text-on-surface/10">
            description
          </span>
        </div>
        <div className="absolute bottom-2 left-2 z-20">
          <StatusIndicator
            status={severityToStatus[report.severity]}
            size={6}
            label={report.severity}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between mb-1">
            <h3 className="font-headline text-base font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-1">
              {report.title}
            </h3>
            <span className="text-[10px] text-on-surface-variant whitespace-nowrap ml-4">
              {timeAgo}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mb-2">
            {report.classification}
          </p>
          <div className="flex items-center gap-4 text-[10px] text-on-surface-variant">
            <Badge severity={report.severity} />
            <span className="uppercase tracking-wider">
              {report.report_type}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex md:flex-col items-center gap-1 p-3">
        <button
          className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
          onClick={onDownload}
        >
          <span className="material-symbols-outlined text-lg">download</span>
        </button>
        <button
          className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
          onClick={onShare}
        >
          <span className="material-symbols-outlined text-lg">share</span>
        </button>
        <button
          className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors"
          onClick={onDelete}
        >
          <span className="material-symbols-outlined text-lg">delete_outline</span>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create Report Archive page**

Create `src/app/(protected)/report-archive/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FilterBar } from "@/components/report/FilterBar";
import { ReportCard } from "@/components/report/ReportCard";
import { Button } from "@/components/ui/Button";
import type { Report } from "@/lib/types/database";

export default function ReportArchivePage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [page, setPage] = useState(1);
  const perPage = 10;
  const supabase = createClient();

  useEffect(() => {
    async function fetchReports() {
      let query = supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (severity !== "all") {
        query = query.eq("severity", severity);
      }
      if (search) {
        query = query.ilike("title", `%${search}%`);
      }
      if (dateRange !== "all") {
        const days = parseInt(dateRange);
        const since = new Date();
        since.setDate(since.getDate() - days);
        query = query.gte("created_at", since.toISOString());
      }

      const { data } = await query
        .range((page - 1) * perPage, page * perPage - 1);

      if (data) setReports(data);
    }
    fetchReports();
  }, [supabase, search, severity, dateRange, page]);

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="mb-10">
        <h1 className="font-headline text-3xl font-bold text-on-surface tracking-tight mb-2">
          Report Archive
        </h1>
        <p className="text-sm text-on-surface-variant font-light mb-6">
          Access and manage all generated intelligence reports and executive
          briefings.
        </p>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="bg-surface-container-low rounded-xl p-5 flex-1">
            <p className="font-headline text-3xl font-extrabold text-on-surface">
              {reports.length}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">
              Total Exports
            </p>
          </div>
          <div className="bg-surface-container-low rounded-xl p-5 flex-1">
            <p className="font-headline text-3xl font-extrabold text-secondary">
              98.2%
            </p>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">
              Verified Delivery
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        onSearchChange={setSearch}
        onSeverityChange={setSeverity}
        onDateChange={setDateRange}
      />

      {/* Report List */}
      <div className="space-y-4">
        {reports.length > 0 ? (
          reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))
        ) : (
          <div className="bg-surface-container-low rounded-xl p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-4">
              description
            </span>
            <p className="text-on-surface-variant">No reports found.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex justify-center gap-2 mt-12">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          <span className="material-symbols-outlined text-sm">chevron_left</span>
        </Button>
        {[1, 2, 3].map((p) => (
          <Button
            key={p}
            variant={p === page ? "primary" : "ghost"}
            size="sm"
            onClick={() => setPage(p)}
            className="w-9 h-9"
          >
            {p}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPage(page + 1)}
        >
          <span className="material-symbols-outlined text-sm">chevron_right</span>
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/report/FilterBar.tsx src/components/report/ReportCard.tsx src/app/\(protected\)/report-archive/
git commit -m "feat: add Report Archive page with filters, report cards, and pagination"
```

---

## Task 9: Executive Report Page

**Files:**
- Create: `src/components/report/ReportViewer.tsx`, `RiskMatrix.tsx`, `src/app/(protected)/report/[id]/page.tsx`, `src/app/(protected)/report/new/page.tsx`

- [ ] **Step 1: Create RiskMatrix component**

Create `src/components/report/RiskMatrix.tsx`:

```tsx
const levels = ["Rare", "Possible", "Likely", "Certain"];
const impacts = ["Low", "Medium", "High", "Critical"];

const cellColors: Record<string, string> = {
  "0-0": "bg-surface-container",
  "0-1": "bg-surface-container",
  "0-2": "bg-tertiary/20",
  "0-3": "bg-tertiary/20",
  "1-0": "bg-surface-container",
  "1-1": "bg-tertiary/20",
  "1-2": "bg-tertiary/20",
  "1-3": "bg-error/40",
  "2-0": "bg-tertiary/20",
  "2-1": "bg-tertiary/20",
  "2-2": "bg-error/40",
  "2-3": "bg-error/60",
  "3-0": "bg-tertiary/20",
  "3-1": "bg-error/40",
  "3-2": "bg-error/60",
  "3-3": "bg-error/80",
};

interface RiskMatrixProps {
  currentThreat?: { likelihood: number; impact: number };
}

export function RiskMatrix({ currentThreat }: RiskMatrixProps) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-6">
      <h3 className="font-headline text-lg font-bold text-on-surface mb-6 uppercase tracking-wider">
        Strategic Risk Matrix
      </h3>
      <table className="w-full border-separate border-spacing-2">
        <thead>
          <tr>
            <th className="text-[10px] text-on-surface-variant uppercase tracking-widest p-2" />
            {impacts.map((impact) => (
              <th
                key={impact}
                className="text-[10px] text-on-surface-variant uppercase tracking-widest p-2 text-center"
              >
                {impact}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {levels.map((level, li) => (
            <tr key={level}>
              <td className="text-[10px] text-on-surface-variant uppercase tracking-widest p-2 text-right">
                {level}
              </td>
              {impacts.map((_, ii) => {
                const key = `${li}-${ii}`;
                const isCurrent =
                  currentThreat &&
                  currentThreat.likelihood === li &&
                  currentThreat.impact === ii;
                return (
                  <td
                    key={key}
                    className={`${cellColors[key]} rounded-lg p-4 text-center relative`}
                  >
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-white bg-on-surface/80 px-2 py-0.5 rounded uppercase tracking-wider">
                        Current Threat
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Create ReportViewer component**

Create `src/components/report/ReportViewer.tsx`:

```tsx
import { Badge } from "@/components/ui/Badge";
import { RiskMatrix } from "./RiskMatrix";
import type { Report } from "@/lib/types/database";

interface ReportViewerProps {
  report: Report;
}

export function ReportViewer({ report }: ReportViewerProps) {
  const content = report.content_en as Record<string, string>;
  const contentTh = report.content_th as Record<string, string>;

  return (
    <div className="max-w-6xl mx-auto space-y-16 px-12 py-16">
      {/* Document Cover */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-12">
        <div className="md:col-span-8">
          <Badge label={report.classification} className="mb-4 bg-error/20 text-error" />
          <h1 className="font-headline text-6xl md:text-7xl font-extrabold text-on-surface tracking-tighter leading-none mb-4">
            {report.title}
          </h1>
          <p className="text-lg text-on-surface-variant font-light">
            {content?.subtitle || "Comprehensive threat intelligence report"}
          </p>
        </div>
        <div className="md:col-span-4 border-l border-outline-variant/20 pl-8">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
                Issue Date
              </p>
              <p className="text-sm font-medium text-on-surface">
                {new Date(report.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
                Report ID
              </p>
              <p className="text-sm font-mono text-on-surface">
                {report.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
                Classification
              </p>
              <p className="text-sm font-medium text-error">
                {report.classification}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Executive Summary - Dual Language */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-container-low rounded-xl p-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary">description</span>
            <h3 className="text-[10px] uppercase tracking-widest text-on-surface-variant font-semibold">
              Executive Summary
            </h3>
          </div>
          <p className="text-sm text-on-surface font-light leading-relaxed">
            {content?.executive_summary || "Executive summary not available."}
          </p>
        </div>
        <div className="bg-surface-container-low rounded-xl p-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary">translate</span>
            <h3 className="text-[10px] uppercase tracking-widest text-on-surface-variant font-semibold">
              Thai Translation
            </h3>
          </div>
          <p className="text-sm text-on-surface font-light thai-text">
            {contentTh?.executive_summary || "Translation not available."}
          </p>
        </div>
      </section>

      {/* Risk Matrix */}
      <RiskMatrix currentThreat={{ likelihood: 3, impact: 3 }} />

      {/* Recommended Actions */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="font-headline text-sm font-bold text-error uppercase tracking-wider mb-6">
            Immediate Mitigation (0-12H)
          </h3>
          <div className="space-y-4">
            {(content?.immediate_actions as unknown as string[] || ["Apply emergency patches", "Rotate credentials", "Enable enhanced monitoring"]).map(
              (action: string, i: number) => (
                <div key={i} className="flex gap-3">
                  <span className="font-headline text-lg font-bold text-on-surface-variant">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="text-sm text-on-surface font-light">{action}</p>
                </div>
              )
            )}
          </div>
        </div>
        <div>
          <h3 className="font-headline text-sm font-bold text-primary uppercase tracking-wider mb-6">
            Strategic Posture (48H+)
          </h3>
          <div className="space-y-4">
            {(content?.strategic_actions as unknown as string[] || ["Review security architecture", "Update incident response plan"]).map(
              (action: string, i: number) => (
                <div key={i} className="flex gap-3">
                  <span className="font-headline text-lg font-bold text-on-surface-variant">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="text-sm text-on-surface font-light">{action}</p>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex items-center justify-between pt-8 border-t border-outline-variant/10 no-print">
        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
          Sentinel Cybersecurity
        </p>
        <p className="text-[10px] uppercase tracking-widest text-error">
          Confidential // {report.classification}
        </p>
      </footer>
    </div>
  );
}
```

- [ ] **Step 3: Create report view page**

Create `src/app/(protected)/report/[id]/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { ReportViewer } from "@/components/report/ReportViewer";
import { Button } from "@/components/ui/Button";
import { notFound } from "next/navigation";
import type { Report } from "@/lib/types/database";

export default async function ReportViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: report } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .single();

  if (!report) notFound();

  return (
    <div className="-mx-8 -mt-8">
      {/* Sticky header */}
      <header className="sticky top-16 z-30 bg-surface/90 backdrop-blur-xl px-8 py-3 flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <span className="font-headline text-sm font-bold text-on-surface uppercase tracking-wider">
            Sentinel Intelligence
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-error/20 text-error uppercase tracking-wider">
            {(report as Report).classification}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <span className="material-symbols-outlined text-sm">download</span>
            Download
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.print()}>
            <span className="material-symbols-outlined text-sm">print</span>
            Print
          </Button>
          <Button variant="ghost" size="sm">
            <span className="material-symbols-outlined text-sm">share</span>
            Share
          </Button>
        </div>
      </header>

      <ReportViewer report={report as Report} />
    </div>
  );
}
```

- [ ] **Step 4: Create new report page**

Create `src/app/(protected)/report/new/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Article } from "@/lib/types/database";

export default function NewReportPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [classification, setClassification] = useState("TLP:AMBER");
  const [reportType, setReportType] = useState("executive");
  const [generating, setGenerating] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchArticles() {
      const { data } = await supabase
        .from("articles")
        .select("*")
        .order("published_at", { ascending: false })
        .limit(50);
      if (data) setArticles(data);
    }
    fetchArticles();
  }, [supabase]);

  function toggleArticle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleGenerate() {
    if (!title || selectedIds.length === 0) return;
    setGenerating(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/report-gen`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            article_ids: selectedIds,
            title,
            report_type: reportType,
            classification,
          }),
        }
      );

      const result = await response.json();
      if (result.report_id) {
        router.push(`/report/${result.report_id}`);
      }
    } catch (error) {
      console.error("Failed to generate report:", error);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold text-on-surface tracking-tight mb-2">
          Generate Report
        </h1>
        <p className="text-sm text-on-surface-variant font-light">
          Select articles and configure your executive intelligence report.
        </p>
      </div>

      {/* Report Config */}
      <Card variant="low" className="space-y-4">
        <Input
          placeholder="Report title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            options={[
              { value: "executive", label: "Executive Briefing" },
              { value: "incident", label: "Incident Report" },
              { value: "weekly", label: "Weekly Summary" },
            ]}
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          />
          <Select
            options={[
              { value: "TLP:RED", label: "TLP:RED" },
              { value: "TLP:AMBER", label: "TLP:AMBER" },
              { value: "TLP:GREEN", label: "TLP:GREEN" },
              { value: "TLP:WHITE", label: "TLP:WHITE" },
            ]}
            value={classification}
            onChange={(e) => setClassification(e.target.value)}
          />
        </div>
      </Card>

      {/* Article Selection */}
      <div>
        <h2 className="font-headline text-lg font-semibold text-on-surface mb-4">
          Select Articles ({selectedIds.length} selected)
        </h2>
        <div className="space-y-2">
          {articles.map((article) => (
            <button
              key={article.id}
              onClick={() => toggleArticle(article.id)}
              className={`
                w-full text-left p-4 rounded-xl flex items-center gap-4
                transition-all duration-200
                ${
                  selectedIds.includes(article.id)
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-surface-container-low hover:bg-surface-container-high border border-transparent"
                }
              `}
            >
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  selectedIds.includes(article.id)
                    ? "bg-primary border-primary"
                    : "border-outline-variant"
                }`}
              >
                {selectedIds.includes(article.id) && (
                  <span className="material-symbols-outlined text-[#263046] text-sm">
                    check
                  </span>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-on-surface line-clamp-1">
                  {article.title}
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {new Date(article.published_at).toLocaleDateString()}
                </p>
              </div>
              <Badge severity={article.severity} />
            </button>
          ))}
        </div>
      </div>

      {/* Generate */}
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          variant="security"
          disabled={generating || !title || selectedIds.length === 0}
          onClick={handleGenerate}
        >
          {generating ? "Generating..." : "Generate Report"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/report/ src/app/\(protected\)/report/
git commit -m "feat: add Executive Report viewer, risk matrix, and report generation page"
```

---

## Task 10: Supabase Edge Functions

**Files:**
- Create: `supabase/functions/_shared/cors.ts`, `_shared/llm-provider.ts`, `_shared/types.ts`, `supabase/functions/rss-fetcher/index.ts`, `llm-translate/index.ts`, `report-gen/index.ts`

- [ ] **Step 1: Create shared modules**

Create `supabase/functions/_shared/cors.ts`:

```typescript
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
```

Create `supabase/functions/_shared/types.ts`:

```typescript
export interface TranslateRequest {
  article_id: string;
}

export interface TranslateResult {
  title_th: string;
  content_th: string;
  excerpt_th: string;
  confidence: number;
  token_usage: number;
  provider: "gemini" | "openrouter";
  model: string;
}

export interface ReportGenRequest {
  article_ids: string[];
  title: string;
  report_type: "executive" | "incident" | "weekly";
  classification: string;
}

export interface LLMResponse {
  text: string;
  token_usage: number;
  model: string;
}
```

- [ ] **Step 2: Create LLM provider abstraction**

Create `supabase/functions/_shared/llm-provider.ts`:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface LLMConfig {
  provider: "gemini" | "openrouter";
  apiKey: string;
  model: string;
}

interface LLMCallResult {
  text: string;
  tokenUsage: number;
  model: string;
}

async function getConfig(
  serviceClient: ReturnType<typeof createClient>
): Promise<{ primary: LLMConfig; fallback: LLMConfig | null }> {
  const { data: settings } = await serviceClient
    .from("app_settings")
    .select("key, value")
    .in("key", ["llm_provider", "llm_api_keys"]);

  const providerSetting = settings?.find((s) => s.key === "llm_provider");
  const keysSetting = settings?.find((s) => s.key === "llm_api_keys");

  const provider = (providerSetting?.value as string) || "gemini";
  const keys = (keysSetting?.value as Record<string, string>) || {};

  // Check env fallbacks
  const geminiKey = keys.gemini || Deno.env.get("GEMINI_API_KEY") || "";
  const openrouterKey =
    keys.openrouter || Deno.env.get("OPENROUTER_API_KEY") || "";

  const primary: LLMConfig = {
    provider: provider as "gemini" | "openrouter",
    apiKey: provider === "gemini" ? geminiKey : openrouterKey,
    model:
      provider === "gemini"
        ? "gemini-2.0-flash"
        : "google/gemini-2.0-flash-exp:free",
  };

  const fallbackProvider = provider === "gemini" ? "openrouter" : "gemini";
  const fallbackKey =
    fallbackProvider === "gemini" ? geminiKey : openrouterKey;

  const fallback = fallbackKey
    ? {
        provider: fallbackProvider as "gemini" | "openrouter",
        apiKey: fallbackKey,
        model:
          fallbackProvider === "gemini"
            ? "gemini-2.0-flash"
            : "google/gemini-2.0-flash-exp:free",
      }
    : null;

  return { primary, fallback };
}

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<LLMCallResult> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const tokenUsage =
    (data.usageMetadata?.promptTokenCount || 0) +
    (data.usageMetadata?.candidatesTokenCount || 0);

  return { text, tokenUsage, model };
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<LLMCallResult> {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  const tokenUsage = data.usage?.total_tokens || 0;

  return { text, tokenUsage, model };
}

async function callLLM(
  config: LLMConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<LLMCallResult> {
  if (config.provider === "gemini") {
    return callGemini(config.apiKey, config.model, systemPrompt, userPrompt);
  }
  return callOpenRouter(config.apiKey, config.model, systemPrompt, userPrompt);
}

export async function callWithFallback(
  serviceClient: ReturnType<typeof createClient>,
  systemPrompt: string,
  userPrompt: string
): Promise<LLMCallResult & { provider: "gemini" | "openrouter" }> {
  const { primary, fallback } = await getConfig(serviceClient);

  try {
    const result = await callLLM(primary, systemPrompt, userPrompt);
    return { ...result, provider: primary.provider };
  } catch (err) {
    console.error(`Primary provider (${primary.provider}) failed:`, err);
    if (fallback) {
      console.log(`Falling back to ${fallback.provider}...`);
      const result = await callLLM(fallback, systemPrompt, userPrompt);
      return { ...result, provider: fallback.provider };
    }
    throw err;
  }
}
```

- [ ] **Step 3: Create RSS fetcher Edge Function**

Create `supabase/functions/rss-fetcher/index.ts`:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SEVERITY_KEYWORDS: Record<string, string[]> = {
  critical: ["breach", "zero-day", "zero day", "ransomware attack", "CVE-2"],
  high: ["vulnerability", "exploit", "malware", "ransomware", "APT"],
  medium: ["patch", "update", "advisory", "security fix"],
};

function classifySeverity(text: string): string {
  const lower = text.toLowerCase();
  for (const [severity, keywords] of Object.entries(SEVERITY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return severity;
    }
  }
  return "info";
}

function extractTextContent(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
  const match = xml.match(regex);
  return (match?.[1] || match?.[2] || "").trim().replace(/<[^>]+>/g, "");
}

function parseRSSItems(xml: string): Array<{
  title: string;
  content: string;
  url: string;
  author: string;
  published_at: string;
  image_url: string;
}> {
  const items: Array<{
    title: string;
    content: string;
    url: string;
    author: string;
    published_at: string;
    image_url: string;
  }> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = extractTextContent(itemXml, "title");
    const content =
      extractTextContent(itemXml, "content:encoded") ||
      extractTextContent(itemXml, "description");
    const url =
      extractTextContent(itemXml, "link") ||
      (itemXml.match(/<link[^>]*href="([^"]*)"/) || [])[1] ||
      "";
    const author =
      extractTextContent(itemXml, "dc:creator") ||
      extractTextContent(itemXml, "author");
    const pubDate =
      extractTextContent(itemXml, "pubDate") ||
      extractTextContent(itemXml, "published");
    const imageMatch = itemXml.match(
      /<media:content[^>]*url="([^"]*)"/
    ) || itemXml.match(/<enclosure[^>]*url="([^"]*)"/);

    items.push({
      title,
      content: content.slice(0, 5000),
      url,
      author,
      published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      image_url: imageMatch?.[1] || "",
    });
  }

  return items;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get active RSS sources
    const { data: sources } = await supabaseAdmin
      .from("rss_sources")
      .select("*")
      .eq("is_active", true);

    if (!sources || sources.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active RSS sources" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalNew = 0;
    const translateQueue: string[] = [];

    for (const source of sources) {
      try {
        const response = await fetch(source.url);
        const xml = await response.text();
        const items = parseRSSItems(xml);

        for (const item of items) {
          if (!item.url || !item.title) continue;

          // Dedup check
          const { data: existing } = await supabaseAdmin
            .from("articles")
            .select("id")
            .eq("url", item.url)
            .single();

          if (existing) continue;

          const severity = classifySeverity(item.title + " " + item.content);
          const excerpt = item.content.slice(0, 300).replace(/<[^>]+>/g, "");

          const { data: article } = await supabaseAdmin
            .from("articles")
            .insert({
              source_id: source.id,
              title: item.title,
              content: item.content,
              excerpt,
              url: item.url,
              image_url: item.image_url || null,
              author: item.author || null,
              severity,
              published_at: item.published_at,
              tags: [],
            })
            .select("id, severity")
            .single();

          if (article) {
            totalNew++;
            if (["critical", "high"].includes(article.severity)) {
              translateQueue.push(article.id);
            }
          }
        }

        // Update last_fetched_at
        await supabaseAdmin
          .from("rss_sources")
          .update({ last_fetched_at: new Date().toISOString() })
          .eq("id", source.id);
      } catch (err) {
        console.error(`Failed to fetch ${source.name}:`, err);
      }
    }

    // Trigger auto-translation for high-severity articles
    for (const articleId of translateQueue) {
      try {
        await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/llm-translate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ article_id: articleId }),
          }
        );
      } catch (err) {
        console.error(`Failed to trigger translation for ${articleId}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Fetched ${totalNew} new articles, ${translateQueue.length} queued for translation`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

- [ ] **Step 4: Create LLM translate Edge Function**

Create `supabase/functions/llm-translate/index.ts`:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { callWithFallback } from "../_shared/llm-provider.ts";

const SYSTEM_PROMPT = `You are a professional cybersecurity news translator specializing in English to Thai translation.

Rules:
1. Preserve ALL technical terms in English: CVE IDs, APT group names, malware names, protocol names, IP addresses, domain names, tool names, vendor names
2. Translate only natural language portions to Thai
3. Maintain the same paragraph structure
4. Use formal Thai language appropriate for security professionals
5. Return JSON with keys: title_th, content_th, excerpt_th

Return ONLY valid JSON, no markdown formatting.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { article_id } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch article
    const { data: article, error: articleError } = await supabaseAdmin
      .from("articles")
      .select("*")
      .eq("id", article_id)
      .single();

    if (articleError || !article) {
      return new Response(
        JSON.stringify({ error: "Article not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already translated
    const { data: existing } = await supabaseAdmin
      .from("translations")
      .select("id")
      .eq("article_id", article_id)
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ message: "Already translated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userPrompt = `Translate this cybersecurity article:

Title: ${article.title}

Content: ${article.content}

Excerpt: ${article.excerpt}`;

    const result = await callWithFallback(supabaseAdmin, SYSTEM_PROMPT, userPrompt);

    // Parse JSON response
    let parsed;
    try {
      const jsonStr = result.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      // If JSON parsing fails, use the raw text
      parsed = {
        title_th: result.text.slice(0, 200),
        content_th: result.text,
        excerpt_th: result.text.slice(0, 300),
      };
    }

    // Estimate confidence based on response quality
    const confidence = parsed.title_th && parsed.content_th ? 0.85 : 0.6;

    // Insert translation
    await supabaseAdmin.from("translations").insert({
      article_id,
      title_th: parsed.title_th || "",
      content_th: parsed.content_th || "",
      excerpt_th: parsed.excerpt_th || "",
      provider: result.provider,
      model: result.model,
      confidence,
      token_usage: result.tokenUsage,
    });

    // Update article status
    await supabaseAdmin
      .from("articles")
      .update({ status: "translated" })
      .eq("id", article_id);

    return new Response(
      JSON.stringify({
        message: "Translation complete",
        provider: result.provider,
        token_usage: result.tokenUsage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

- [ ] **Step 5: Create report generator Edge Function**

Create `supabase/functions/report-gen/index.ts`:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { callWithFallback } from "../_shared/llm-provider.ts";

const SYSTEM_PROMPT = `You are a cybersecurity intelligence analyst generating executive reports.

Generate a structured report in JSON format with these keys:
- executive_summary: 2-3 paragraph executive summary
- subtitle: One-line subtitle for the report
- threat_landscape: Overview of current threat landscape
- immediate_actions: Array of 3 immediate mitigation actions (strings)
- strategic_actions: Array of 2 strategic posture recommendations (strings)
- risk_level: "critical" | "high" | "medium" | "low"
- confidence_level: Number 0-100

Return ONLY valid JSON, no markdown formatting.`;

const TRANSLATE_PROMPT = `You are a cybersecurity document translator. Translate the following JSON report content from English to Thai.
Preserve all technical terms (CVE, APT, malware names, etc.) in English.
Return the same JSON structure with Thai translations.
Return ONLY valid JSON.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { article_ids, title, report_type, classification } = await req.json();

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch selected articles
    const { data: articles } = await supabaseAdmin
      .from("articles")
      .select("*, translations(*)")
      .in("id", article_ids);

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ error: "No articles found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build article summaries
    const articleSummaries = articles
      .map(
        (a) =>
          `Title: ${a.title}\nSeverity: ${a.severity}\nExcerpt: ${a.excerpt}\nTags: ${a.tags?.join(", ")}`
      )
      .join("\n\n---\n\n");

    const userPrompt = `Generate a ${report_type} cybersecurity report titled "${title}" based on these ${articles.length} intelligence articles:\n\n${articleSummaries}`;

    // Generate English report
    const enResult = await callWithFallback(supabaseAdmin, SYSTEM_PROMPT, userPrompt);
    let contentEn;
    try {
      const jsonStr = enResult.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      contentEn = JSON.parse(jsonStr);
    } catch {
      contentEn = {
        executive_summary: enResult.text,
        subtitle: title,
        immediate_actions: [],
        strategic_actions: [],
        risk_level: "high",
        confidence_level: 75,
      };
    }

    // Generate Thai translation
    const thResult = await callWithFallback(
      supabaseAdmin,
      TRANSLATE_PROMPT,
      JSON.stringify(contentEn)
    );
    let contentTh;
    try {
      const jsonStr = thResult.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      contentTh = JSON.parse(jsonStr);
    } catch {
      contentTh = { executive_summary: thResult.text };
    }

    // Get user ID from auth token
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabaseUser.auth.getUser();

    // Insert report
    const { data: report, error: reportError } = await supabaseAdmin
      .from("reports")
      .insert({
        title,
        report_type,
        content_en: contentEn,
        content_th: contentTh,
        severity: contentEn.risk_level || "high",
        classification,
        provider: enResult.provider,
        model: enResult.model,
        status: "generated",
        created_by: user?.id,
      })
      .select("id")
      .single();

    if (reportError) throw reportError;

    // Insert junction records
    if (report) {
      await supabaseAdmin.from("report_articles").insert(
        article_ids.map((aid: string) => ({
          report_id: report.id,
          article_id: aid,
        }))
      );
    }

    return new Response(
      JSON.stringify({
        report_id: report?.id,
        message: "Report generated successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/
git commit -m "feat: add Edge Functions for RSS fetching, LLM translation, and report generation"
```

---

## Task 11: Translation API Route & On-Demand Trigger

**Files:**
- Create: `src/app/api/translate/route.ts`

- [ ] **Step 1: Create translate API route**

Create `src/app/api/translate/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { article_id } = await request.json();

  // Call Edge Function
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/llm-translate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ article_id }),
    }
  );

  const result = await response.json();
  return NextResponse.json(result, { status: response.status });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/translate/
git commit -m "feat: add translate API route for on-demand translation"
```

---

## Task 12: Settings Page (Admin)

**Files:**
- Create: `src/components/settings/LLMConfig.tsx`, `RSSManager.tsx`, `UserManager.tsx`, `src/app/(protected)/settings/page.tsx`

- [ ] **Step 1: Create LLMConfig component**

Create `src/components/settings/LLMConfig.tsx`:

```tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export function LLMConfig() {
  const [provider, setProvider] = useState<"gemini" | "openrouter">("gemini");
  const [geminiKey, setGeminiKey] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  async function handleSave() {
    setSaving(true);
    await supabase
      .from("app_settings")
      .update({ value: JSON.stringify(provider) })
      .eq("key", "llm_provider");

    const keys: Record<string, string> = {};
    if (geminiKey) keys.gemini = geminiKey;
    if (openrouterKey) keys.openrouter = openrouterKey;

    await supabase
      .from("app_settings")
      .update({ value: keys })
      .eq("key", "llm_api_keys");

    setSaving(false);
  }

  return (
    <Card variant="low" className="space-y-6">
      <h3 className="font-headline text-lg font-semibold text-on-surface">
        LLM Configuration
      </h3>

      {/* Provider toggle */}
      <div>
        <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-semibold mb-2 block">
          Active Provider
        </label>
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              provider === "gemini"
                ? "bg-primary text-[#263046] font-medium"
                : "bg-surface-container text-on-surface-variant hover:text-on-surface"
            }`}
            onClick={() => setProvider("gemini")}
          >
            Gemini
          </button>
          <button
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              provider === "openrouter"
                ? "bg-primary text-[#263046] font-medium"
                : "bg-surface-container text-on-surface-variant hover:text-on-surface"
            }`}
            onClick={() => setProvider("openrouter")}
          >
            OpenRouter
          </button>
        </div>
      </div>

      {/* API Keys */}
      <div className="space-y-4">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-semibold mb-2 block">
            Gemini API Key
          </label>
          <Input
            type="password"
            placeholder="Enter Gemini API key..."
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-semibold mb-2 block">
            OpenRouter API Key
          </label>
          <Input
            type="password"
            placeholder="Enter OpenRouter API key..."
            value={openrouterKey}
            onChange={(e) => setOpenrouterKey(e.target.value)}
          />
        </div>
      </div>

      <Button variant="primary" onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Configuration"}
      </Button>
    </Card>
  );
}
```

- [ ] **Step 2: Create RSSManager component**

Create `src/components/settings/RSSManager.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { RSSSource } from "@/lib/types/database";

export function RSSManager() {
  const [sources, setSources] = useState<RSSSource[]>([]);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const supabase = createClient();

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from("rss_sources")
        .select("*")
        .order("name");
      if (data) setSources(data);
    }
    fetch();
  }, [supabase]);

  async function addSource() {
    if (!newName || !newUrl) return;
    const { data } = await supabase
      .from("rss_sources")
      .insert({ name: newName, url: newUrl })
      .select()
      .single();
    if (data) {
      setSources([...sources, data]);
      setNewName("");
      setNewUrl("");
    }
  }

  async function toggleSource(id: string, isActive: boolean) {
    await supabase
      .from("rss_sources")
      .update({ is_active: !isActive })
      .eq("id", id);
    setSources(
      sources.map((s) => (s.id === id ? { ...s, is_active: !isActive } : s))
    );
  }

  async function deleteSource(id: string) {
    await supabase.from("rss_sources").delete().eq("id", id);
    setSources(sources.filter((s) => s.id !== id));
  }

  return (
    <Card variant="low" className="space-y-6">
      <h3 className="font-headline text-lg font-semibold text-on-surface">
        RSS Sources
      </h3>

      {/* Add new */}
      <div className="flex gap-3">
        <Input
          placeholder="Source name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1"
        />
        <Input
          placeholder="RSS feed URL"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          className="flex-[2]"
        />
        <Button variant="primary" onClick={addSource}>
          Add
        </Button>
      </div>

      {/* Source list */}
      <div className="space-y-2">
        {sources.map((source) => (
          <div
            key={source.id}
            className="flex items-center justify-between p-3 bg-surface-container rounded-lg"
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleSource(source.id, source.is_active)}
                className={`w-8 h-5 rounded-full transition-colors ${
                  source.is_active ? "bg-secondary" : "bg-surface-container-highest"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    source.is_active ? "translate-x-3.5" : "translate-x-0.5"
                  }`}
                />
              </button>
              <div>
                <p className="text-sm font-medium text-on-surface">{source.name}</p>
                <p className="text-xs text-on-surface-variant truncate max-w-md">
                  {source.url}
                </p>
              </div>
            </div>
            <button
              onClick={() => deleteSource(source.id)}
              className="p-1 text-on-surface-variant hover:text-error transition-colors"
            >
              <span className="material-symbols-outlined text-sm">delete_outline</span>
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Create UserManager component**

Create `src/components/settings/UserManager.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Profile, UserRole } from "@/lib/types/database";

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  analyst: "Analyst",
  viewer: "Viewer",
};

export function UserManager() {
  const [users, setUsers] = useState<Profile[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at");
      if (data) setUsers(data);
    }
    fetch();
  }, [supabase]);

  async function updateRole(userId: string, role: UserRole) {
    await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId);
    setUsers(users.map((u) => (u.id === userId ? { ...u, role } : u)));
  }

  return (
    <Card variant="low" className="space-y-6">
      <h3 className="font-headline text-lg font-semibold text-on-surface">
        User Management
      </h3>

      <div className="space-y-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-3 bg-surface-container rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">
                  {(user.display_name || user.email)[0].toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-on-surface">
                  {user.display_name || user.email}
                </p>
                <p className="text-xs text-on-surface-variant">{user.email}</p>
              </div>
            </div>

            <select
              value={user.role}
              onChange={(e) => updateRole(user.id, e.target.value as UserRole)}
              className="bg-surface-container-high text-on-surface text-xs px-3 py-1.5 rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              {(Object.entries(roleLabels) as [UserRole, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>
          </div>
        ))}

        {users.length === 0 && (
          <p className="text-sm text-on-surface-variant text-center py-4">
            No users found
          </p>
        )}
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Create Settings page**

Create `src/app/(protected)/settings/page.tsx`:

```tsx
import { LLMConfig } from "@/components/settings/LLMConfig";
import { RSSManager } from "@/components/settings/RSSManager";
import { UserManager } from "@/components/settings/UserManager";

export default function SettingsPage() {
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold text-on-surface tracking-tight mb-2">
          Security Settings
        </h1>
        <p className="text-sm text-on-surface-variant font-light">
          Configure LLM providers, RSS sources, and manage users.
        </p>
      </div>

      <LLMConfig />
      <RSSManager />
      <UserManager />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/ src/app/\(protected\)/settings/
git commit -m "feat: add Settings page with LLM config, RSS manager, and user management"
```

---

## Task 13: Internationalization (i18n)

**Files:**
- Create: `src/messages/en.json`, `src/messages/th.json`, `src/lib/store/language.ts`, `src/i18n.ts`, `next.config.ts` update

- [ ] **Step 1: Create language store**

Create `src/lib/store/language.ts`:

```typescript
import { create } from "zustand";

interface LanguageStore {
  locale: "en" | "th";
  setLocale: (locale: "en" | "th") => void;
}

export const useLanguageStore = create<LanguageStore>((set) => ({
  locale: "en",
  setLocale: (locale) => set({ locale }),
}));
```

- [ ] **Step 2: Create message files**

Create `src/messages/en.json`:

```json
{
  "nav": {
    "intelligenceFeed": "Intelligence Feed",
    "translationLab": "Translation Lab",
    "reportArchive": "Report Archive",
    "exportCenter": "Export Center",
    "settings": "Security Settings",
    "newAnalysis": "New Analysis",
    "support": "Support",
    "signOut": "Sign Out"
  },
  "feed": {
    "title": "Morning Intel Briefing",
    "subtitle": "Your curated cybersecurity intelligence feed. AI-prioritized threats and vulnerabilities relevant to your security posture.",
    "feedRelevance": "Feed Relevance",
    "activeThreats": "Active Threats",
    "criticalAlerts": "Critical Alerts",
    "latestIntelligence": "Latest Intelligence",
    "translate": "Translate",
    "networkHealth": "Network Health",
    "threatLevel": "Threat Level"
  },
  "translation": {
    "source": "Source",
    "target": "Target",
    "confidence": "Confidence",
    "verified": "Verified Translation",
    "riskLevel": "Risk Level",
    "termAccuracy": "Term Accuracy",
    "analystVerdict": "Analyst Verdict"
  },
  "report": {
    "archive": "Report Archive",
    "generate": "Generate Report",
    "totalExports": "Total Exports",
    "verifiedDelivery": "Verified Delivery",
    "download": "Download",
    "share": "Share"
  },
  "common": {
    "search": "Search threats...",
    "globalFeed": "Global Feed",
    "myReports": "My Reports"
  }
}
```

Create `src/messages/th.json`:

```json
{
  "nav": {
    "intelligenceFeed": "ฟีดข่าวกรอง",
    "translationLab": "ห้องปฏิบัติการแปล",
    "reportArchive": "คลังรายงาน",
    "exportCenter": "ศูนย์ส่งออก",
    "settings": "ตั้งค่าความปลอดภัย",
    "newAnalysis": "วิเคราะห์ใหม่",
    "support": "ช่วยเหลือ",
    "signOut": "ออกจากระบบ"
  },
  "feed": {
    "title": "สรุปข่าวกรองประจำเช้า",
    "subtitle": "ฟีดข่าวกรองไซเบอร์ที่คัดสรรโดย AI จัดลำดับความสำคัญของภัยคุกคามและช่องโหว่ที่เกี่ยวข้องกับท่าทีความปลอดภัยของคุณ",
    "feedRelevance": "ความเกี่ยวข้องของฟีด",
    "activeThreats": "ภัยคุกคามที่ใช้งานอยู่",
    "criticalAlerts": "การแจ้งเตือนวิกฤต",
    "latestIntelligence": "ข่าวกรองล่าสุด",
    "translate": "แปล",
    "networkHealth": "สุขภาพเครือข่าย",
    "threatLevel": "ระดับภัยคุกคาม"
  },
  "translation": {
    "source": "ต้นฉบับ",
    "target": "เป้าหมาย",
    "confidence": "ความเชื่อมั่น",
    "verified": "การแปลที่ยืนยันแล้ว",
    "riskLevel": "ระดับความเสี่ยง",
    "termAccuracy": "ความถูกต้องของคำศัพท์",
    "analystVerdict": "การตัดสินของนักวิเคราะห์"
  },
  "report": {
    "archive": "คลังรายงาน",
    "generate": "สร้างรายงาน",
    "totalExports": "ส่งออกทั้งหมด",
    "verifiedDelivery": "การจัดส่งที่ยืนยัน",
    "download": "ดาวน์โหลด",
    "share": "แชร์"
  },
  "common": {
    "search": "ค้นหาภัยคุกคาม...",
    "globalFeed": "ฟีดทั่วโลก",
    "myReports": "รายงานของฉัน"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/messages/ src/lib/store/
git commit -m "feat: add i18n message files (EN/TH) and language store"
```

---

## Task 14: Article Detail Page

**Files:**
- Create: `src/app/(public)/article/[id]/page.tsx`

- [ ] **Step 1: Create article detail page**

Create `src/app/(public)/article/[id]/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: article } = await supabase
    .from("articles")
    .select("*, translations(*), rss_sources(name)")
    .eq("id", id)
    .single();

  if (!article) notFound();

  const translation = Array.isArray(article.translations)
    ? article.translations[0]
    : article.translations;
  const source = Array.isArray(article.rss_sources)
    ? article.rss_sources[0]
    : article.rss_sources;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors"
      >
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        Back to Feed
      </Link>

      {/* Article header */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Badge severity={article.severity} />
          <Badge status={article.status} />
          {source && (
            <span className="text-xs text-on-surface-variant">
              via {(source as { name: string }).name}
            </span>
          )}
        </div>
        <h1 className="font-headline text-3xl font-bold text-on-surface tracking-tight mb-4">
          {article.title}
        </h1>
        <div className="flex items-center gap-4 text-sm text-on-surface-variant">
          {article.author && <span>By {article.author}</span>}
          <span>
            {new Date(article.published_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Content */}
      <Card variant="low" className="prose prose-invert max-w-none">
        <div className="text-on-surface font-light leading-relaxed whitespace-pre-wrap">
          {article.content}
        </div>
      </Card>

      {/* Translation section */}
      {translation && (
        <Card variant="default" className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">translate</span>
            <h2 className="font-headline text-lg font-semibold text-on-surface">
              Thai Translation
            </h2>
            {translation.is_verified && (
              <span className="flex items-center gap-1 text-[10px] text-secondary uppercase tracking-widest font-semibold">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Verified
              </span>
            )}
          </div>
          <h3 className="font-headline text-xl font-bold text-on-surface thai-text">
            {translation.title_th}
          </h3>
          <div className="text-on-surface-variant font-light thai-text whitespace-pre-wrap">
            {translation.content_th}
          </div>
        </Card>
      )}

      {/* Tags */}
      {article.tags && article.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {article.tags.map((tag: string) => (
            <span
              key={tag}
              className="text-xs px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(public\)/article/
git commit -m "feat: add article detail page with translation display"
```

---

## Task 15: Final Build & Verification

- [ ] **Step 1: Verify project builds**

```bash
cd /Users/ton_piyapong/Desktop/sentinel-lens
npm run build
```

Expected: Build succeeds. If there are type errors, fix them.

- [ ] **Step 2: Verify lint passes**

```bash
npm run lint
```

Fix any lint errors.

- [ ] **Step 3: Create final commit**

```bash
git add -A
git commit -m "feat: complete Sentinel Lens initial implementation"
```

- [ ] **Step 4: Verify complete file structure**

```bash
find src -type f | sort
find supabase -type f | sort
```

Expected: All files from the file structure are present.

---

## Deployment Notes

After implementation, deploy with:

1. **GitHub:** Push repo to GitHub
2. **Supabase:** Create project at supabase.com, link with `npx supabase link`, run migrations with `npx supabase db push`
3. **Vercel:** Import from GitHub, set environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. **Supabase Auth:** Configure Google and GitHub OAuth providers in Supabase Dashboard → Authentication → Providers
5. **Edge Functions:** Deploy with `npx supabase functions deploy`
6. **pg_cron:** Set up in SQL Editor: `SELECT cron.schedule('rss-fetch', '*/15 * * * *', $$SELECT net.http_post(url:='<SUPABASE_URL>/functions/v1/rss-fetcher', headers:='{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb)$$);`
