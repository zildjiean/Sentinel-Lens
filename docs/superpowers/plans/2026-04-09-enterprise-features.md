# Enterprise Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Enterprise News Report (AI-designed layouts, PDF/DOCX export) and Enterprise NEWS Watch List (keyword monitoring with Thai email alerts) to Sentinel Lens.

**Architecture:** Modular separation — new tables, API routes, and pages isolated from existing report/notification system. Shared infrastructure for email (Resend/Nodemailer) and a single migration file for all new tables.

**Tech Stack:** Next.js 14 App Router, Supabase (PostgreSQL + RLS), Zod validation, Puppeteer (PDF), docx.js (DOCX), Resend/Nodemailer (email), lucide-react icons, Tailwind CSS with MD3 color system.

---

## File Map

### Shared Infrastructure
- Create: `supabase/migrations/005_add_enterprise_features.sql` — all new tables, RLS, indexes, preset data
- Create: `src/lib/email.ts` — email sender utility (Resend + Nodemailer fallback)
- Create: `src/lib/types/enterprise.ts` — TypeScript types for both features
- Modify: `src/lib/types/database.ts` — add new type exports
- Modify: `src/components/layout/Sidebar.tsx` — add 2 nav items
- Modify: `src/app/(protected)/settings/page.tsx` — add Email and Report Layouts tabs
- Create: `src/components/settings/EmailConfig.tsx` — email provider settings
- Create: `src/components/settings/LayoutManager.tsx` — layout CRUD in settings

### Feature 1: Enterprise News Report
- Create: `src/app/api/enterprise-report/generate/route.ts` — report generation with LLM
- Create: `src/app/api/enterprise-report/[id]/route.ts` — GET/PUT/DELETE single report
- Create: `src/app/api/enterprise-report/[id]/export/route.ts` — PDF export
- Create: `src/app/api/enterprise-report/layouts/route.ts` — GET/POST layouts
- Create: `src/app/api/enterprise-report/layouts/[id]/route.ts` — PUT layout
- Create: `src/app/api/enterprise-report/ai-design/route.ts` — AI layout preview
- Create: `src/app/(protected)/enterprise-report/page.tsx` — report archive/list
- Create: `src/app/(protected)/enterprise-report/new/page.tsx` — wizard page
- Create: `src/app/(protected)/enterprise-report/[id]/page.tsx` — report viewer
- Create: `src/app/(protected)/enterprise-report/loading.tsx` — skeleton
- Create: `src/components/enterprise-report/ReportWizard.tsx` — 4-step wizard
- Create: `src/components/enterprise-report/ArticleSelector.tsx` — article picker
- Create: `src/components/enterprise-report/LayoutPicker.tsx` — layout grid
- Create: `src/components/enterprise-report/AIDesignPanel.tsx` — AI prompt + preview
- Create: `src/components/enterprise-report/EnterpriseReportViewer.tsx` — styled viewer
- Create: `src/components/enterprise-report/ReportExporter.tsx` — PDF/DOCX buttons
- Create: `src/components/enterprise-report/ReportPDFTemplate.ts` — HTML template builder
- Create: `src/components/enterprise-report/LayoutEditor.tsx` — visual config editor
- Create: `src/lib/enterprise-report/generate-pdf.ts` — Puppeteer PDF generation
- Create: `src/lib/enterprise-report/generate-docx.ts` — client-side DOCX generation
- Create: `src/lib/enterprise-report/merge-layout.ts` — merge base layout + override

### Feature 2: Enterprise NEWS Watch List
- Create: `src/app/api/watchlists/route.ts` — GET/POST watchlists
- Create: `src/app/api/watchlists/[id]/route.ts` — GET/PUT/DELETE single watchlist
- Create: `src/app/api/watchlists/[id]/matches/route.ts` — match history
- Create: `src/app/api/watchlists/scan/route.ts` — manual scan trigger
- Create: `src/app/api/cron/watchlist-digest/route.ts` — batch digest cron
- Create: `src/app/(protected)/watchlist/page.tsx` — dashboard
- Create: `src/app/(protected)/watchlist/new/page.tsx` — create form
- Create: `src/app/(protected)/watchlist/[id]/page.tsx` — match history
- Create: `src/app/(protected)/watchlist/[id]/edit/page.tsx` — edit form
- Create: `src/app/(protected)/watchlist/loading.tsx` — skeleton
- Create: `src/components/watchlist/WatchlistDashboard.tsx` — stats + list
- Create: `src/components/watchlist/WatchlistCard.tsx` — single watchlist card
- Create: `src/components/watchlist/WatchlistForm.tsx` — create/edit form
- Create: `src/components/watchlist/KeywordInput.tsx` — tag-style keyword input
- Create: `src/components/watchlist/MatchTimeline.tsx` — timeline view
- Create: `src/components/watchlist/MatchCard.tsx` — single match entry
- Create: `src/lib/watchlist/matcher.ts` — keyword matching logic
- Create: `src/lib/watchlist/summarizer.ts` — LLM Thai summary generation
- Create: `src/lib/watchlist/email-templates.ts` — HTML email templates
- Modify: `src/app/api/articles/route.ts` — add watchlist hook after article creation

---

## Phase 1: Foundation (Migration + Types + Dependencies + Email)

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install production dependencies**

```bash
npm install resend nodemailer puppeteer-core docx file-saver
```

- [ ] **Step 2: Install type definitions**

```bash
npm install -D @types/nodemailer @types/file-saver
```

- [ ] **Step 3: Verify installation**

```bash
npm run build 2>&1 | head -5
```

Expected: build starts without missing module errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add enterprise feature dependencies (resend, puppeteer, docx, nodemailer)"
```

---

### Task 2: Database Migration

**Files:**
- Create: `supabase/migrations/005_add_enterprise_features.sql`

- [ ] **Step 1: Write migration file**

```sql
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

-- Updated_at triggers
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
```

- [ ] **Step 2: Commit migration**

```bash
git add supabase/migrations/005_add_enterprise_features.sql
git commit -m "feat: add migration for enterprise reports, watchlists, and related tables"
```

**Note:** User must run this SQL in Supabase Dashboard SQL Editor before testing.

---

### Task 3: TypeScript Types

**Files:**
- Create: `src/lib/types/enterprise.ts`
- Modify: `src/lib/types/database.ts`

- [ ] **Step 1: Create enterprise types file**

```typescript
// src/lib/types/enterprise.ts

// === Layout Types ===

export interface LayoutConfig {
  theme: "dark" | "light";
  primary_color: string;
  accent_color: string;
  font_heading: string;
  font_body: string;
  cover_style: "minimal" | "branded" | "full-image";
  logo_url: string | null;
  sections: ReportSection[];
  show_page_numbers: boolean;
  show_header_footer: boolean;
  classification_watermark: boolean;
}

export type ReportSection =
  | "cover"
  | "executive_summary"
  | "threat_landscape"
  | "risk_matrix"
  | "immediate_actions"
  | "strategic_actions"
  | "ioc_table"
  | "references";

export interface EnterpriseReportLayout {
  id: string;
  name: string;
  description: string | null;
  is_preset: boolean;
  layout_config: LayoutConfig;
  thumbnail_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// === Report Types ===

export type EnterpriseReportStatus =
  | "draft"
  | "generating"
  | "generated"
  | "reviewed"
  | "published";

export interface ReportContentEN {
  executive_summary: string;
  subtitle: string;
  threat_landscape: string;
  immediate_actions: string[];
  strategic_actions: string[];
  risk_level: string;
  confidence_level: string;
  ioc_table?: { type: string; value: string; source: string }[];
}

export interface EnterpriseReport {
  id: string;
  title: string;
  subtitle: string | null;
  report_type: string;
  classification: string;
  severity: string | null;
  layout_id: string | null;
  layout_config_override: Partial<LayoutConfig> | null;
  ai_design_prompt: string | null;
  content_en: ReportContentEN | null;
  content_th: ReportContentEN | null;
  content_prompt_template: string | null;
  status: EnterpriseReportStatus;
  export_history: { format: string; exported_at: string; file_size: number }[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EnterpriseReportWithArticles extends EnterpriseReport {
  articles: {
    article_id: string;
    display_order: number;
    article: {
      id: string;
      title: string;
      severity: string;
      excerpt: string | null;
      source_url: string | null;
      published_at: string | null;
      tags: string[];
    };
  }[];
  layout: EnterpriseReportLayout | null;
}

// === Watchlist Types ===

export type NotifyMode = "realtime" | "batch";
export type SummaryLevel = "short" | "detailed";
export type MatchMode = "exact" | "contains" | "regex";

export interface Watchlist {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  notify_mode: NotifyMode;
  batch_interval_minutes: number;
  summary_level: SummaryLevel;
  email_recipients: string[];
  is_active: boolean;
  last_checked_at: string | null;
  last_notified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WatchlistKeyword {
  id: string;
  watchlist_id: string;
  keyword: string;
  match_mode: MatchMode;
  created_at: string;
}

export interface WatchlistMatch {
  id: string;
  watchlist_id: string;
  article_id: string;
  keyword_id: string;
  matched_keyword: string;
  matched_in: string;
  summary_th: string | null;
  notified_at: string | null;
  created_at: string;
}

export interface WatchlistWithKeywords extends Watchlist {
  watchlist_keywords: WatchlistKeyword[];
}

export interface WatchlistWithStats extends Watchlist {
  keyword_count: number;
  match_count: number;
  today_match_count: number;
}

export interface WatchlistMatchWithArticle extends WatchlistMatch {
  article: {
    id: string;
    title: string;
    severity: string;
    excerpt: string | null;
    source_url: string | null;
    published_at: string | null;
  };
}

// === Email Config ===

export interface EmailConfig {
  provider: "resend" | "sendgrid" | "smtp";
  api_key: string;
  from_address: string;
  from_name: string;
  smtp_config?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  };
}
```

- [ ] **Step 2: Add exports to database.ts**

Add at the end of `src/lib/types/database.ts`:

```typescript
export type {
  LayoutConfig,
  ReportSection,
  EnterpriseReportLayout,
  EnterpriseReportStatus,
  ReportContentEN,
  EnterpriseReport,
  EnterpriseReportWithArticles,
  NotifyMode,
  SummaryLevel,
  MatchMode,
  Watchlist,
  WatchlistKeyword,
  WatchlistMatch,
  WatchlistWithKeywords,
  WatchlistWithStats,
  WatchlistMatchWithArticle,
  EmailConfig,
} from "./enterprise";
```

- [ ] **Step 3: Verify types compile**

```bash
npx tsc --noEmit --pretty 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types/enterprise.ts src/lib/types/database.ts
git commit -m "feat: add TypeScript types for enterprise reports and watchlists"
```

---

### Task 4: Email Utility

**Files:**
- Create: `src/lib/email.ts`

- [ ] **Step 1: Create email sender utility**

```typescript
// src/lib/email.ts
import { Resend } from "resend";
import nodemailer from "nodemailer";
import type { EmailConfig } from "@/lib/types/enterprise";
import { createClient } from "@/lib/supabase/server";

async function getEmailConfig(): Promise<EmailConfig | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "email_config")
    .single();
  if (!data?.value) return null;
  return data.value as EmailConfig;
}

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  const config = await getEmailConfig();
  if (!config) {
    return { success: false, error: "Email not configured. Set up email in Settings → Email." };
  }

  const recipients = Array.isArray(params.to) ? params.to : [params.to];

  try {
    if (config.provider === "resend") {
      const resend = new Resend(config.api_key);
      await resend.emails.send({
        from: `${config.from_name} <${config.from_address}>`,
        to: recipients,
        subject: params.subject,
        html: params.html,
      });
    } else if (config.provider === "sendgrid") {
      const resend = new Resend(config.api_key);
      await resend.emails.send({
        from: `${config.from_name} <${config.from_address}>`,
        to: recipients,
        subject: params.subject,
        html: params.html,
      });
    } else if (config.provider === "smtp" && config.smtp_config) {
      const transporter = nodemailer.createTransport({
        host: config.smtp_config.host,
        port: config.smtp_config.port,
        secure: config.smtp_config.secure,
        auth: {
          user: config.smtp_config.user,
          pass: config.smtp_config.pass,
        },
      });
      await transporter.sendMail({
        from: `"${config.from_name}" <${config.from_address}>`,
        to: recipients.join(", "),
        subject: params.subject,
        html: params.html,
      });
    } else {
      return { success: false, error: `Unknown provider: ${config.provider}` };
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    console.error("[email] Send failed:", message);
    return { success: false, error: message };
  }
}

export async function sendTestEmail(toAddress: string): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: toAddress,
    subject: "[Sentinel Lens] Test Email",
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#1E3A5F;margin-bottom:8px;">Sentinel Lens</h2>
        <p style="color:#475569;">Email configuration is working correctly.</p>
        <p style="color:#94a3b8;font-size:12px;">Sent at ${new Date().toISOString()}</p>
      </div>
    `,
  });
}
```

- [ ] **Step 2: Verify no compile errors**

```bash
npx tsc --noEmit --pretty 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat: add email utility with Resend and Nodemailer SMTP support"
```

---

### Task 5: Sidebar Navigation + Settings Tabs

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/app/(protected)/settings/page.tsx`

- [ ] **Step 1: Add nav items to Sidebar.tsx**

Add two new entries to the `navItems` array in `src/components/layout/Sidebar.tsx`. Find the existing array and add after the current entries (before Settings):

```typescript
{ href: "/enterprise-report", icon: FileBarChart, label: "Enterprise Report" },
{ href: "/watchlist", icon: Eye, label: "Watch List" },
```

Also add the imports at the top:

```typescript
import { FileBarChart, Eye } from "lucide-react";
```

(Merge with existing lucide-react import.)

- [ ] **Step 2: Add tabs to Settings page**

In `src/app/(protected)/settings/page.tsx`, add to the `tabs` array:

```typescript
{ id: "email", label: "Email", icon: Mail, description: "Email provider configuration for alerts" },
{ id: "layouts", label: "Report Layouts", icon: Layout, description: "Enterprise report layout templates" },
```

Add imports: `Mail`, `Layout` from `lucide-react`.

Add tab content rendering for the new tabs in the JSX (in the tab content switch/conditional):

```tsx
{activeTab === "email" && <EmailConfig />}
{activeTab === "layouts" && <LayoutManager />}
```

Add component imports:

```typescript
import EmailConfig from "@/components/settings/EmailConfig";
import LayoutManager from "@/components/settings/LayoutManager";
```

- [ ] **Step 3: Create EmailConfig settings component**

Create `src/components/settings/EmailConfig.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Save, Send, Loader2 } from "lucide-react";
import type { EmailConfig as EmailConfigType } from "@/lib/types/enterprise";

const PROVIDERS = [
  { value: "resend", label: "Resend" },
  { value: "sendgrid", label: "SendGrid" },
  { value: "smtp", label: "SMTP" },
] as const;

export default function EmailConfig() {
  const [config, setConfig] = useState<EmailConfigType>({
    provider: "resend",
    api_key: "",
    from_address: "",
    from_name: "Sentinel Lens Alerts",
    smtp_config: { host: "", port: 587, secure: false, user: "", pass: "" },
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "email_config")
        .single();
      if (data?.value) setConfig(data.value as EmailConfigType);
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "email_config", value: config as unknown as Record<string, unknown> }, { onConflict: "key" });
      if (error) throw error;
      setMessage({ type: "success", text: "Email settings saved" });
    } catch {
      setMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!testEmail) return;
    setTesting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/enterprise-report/ai-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test_email: testEmail }),
      });
      // Use a dedicated test endpoint instead
      const testRes = await fetch("/api/watchlists/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_email", to: testEmail }),
      });
      if (!testRes.ok) throw new Error("Test send failed");
      setMessage({ type: "success", text: `Test email sent to ${testEmail}` });
    } catch {
      setMessage({ type: "error", text: "Failed to send test email" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card variant="low" className="p-6">
        <h3 className="text-lg font-headline font-semibold text-on-surface mb-4">Email Provider</h3>

        <div className="space-y-4">
          {/* Provider selector */}
          <div>
            <label className="block text-sm text-on-surface-variant mb-1">Provider</label>
            <div className="flex gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setConfig({ ...config, provider: p.value })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    config.provider === p.value
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container/80"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* API Key (for Resend/SendGrid) */}
          {config.provider !== "smtp" && (
            <div>
              <label className="block text-sm text-on-surface-variant mb-1">API Key</label>
              <Input
                type="password"
                value={config.api_key}
                onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                placeholder="re_xxx... or SG.xxx..."
              />
            </div>
          )}

          {/* SMTP Config */}
          {config.provider === "smtp" && config.smtp_config && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-on-surface-variant mb-1">SMTP Host</label>
                <Input
                  value={config.smtp_config.host}
                  onChange={(e) => setConfig({ ...config, smtp_config: { ...config.smtp_config!, host: e.target.value } })}
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div>
                <label className="block text-sm text-on-surface-variant mb-1">Port</label>
                <Input
                  type="number"
                  value={config.smtp_config.port}
                  onChange={(e) => setConfig({ ...config, smtp_config: { ...config.smtp_config!, port: parseInt(e.target.value) || 587 } })}
                />
              </div>
              <div>
                <label className="block text-sm text-on-surface-variant mb-1">Username</label>
                <Input
                  value={config.smtp_config.user}
                  onChange={(e) => setConfig({ ...config, smtp_config: { ...config.smtp_config!, user: e.target.value } })}
                />
              </div>
              <div>
                <label className="block text-sm text-on-surface-variant mb-1">Password</label>
                <Input
                  type="password"
                  value={config.smtp_config.pass}
                  onChange={(e) => setConfig({ ...config, smtp_config: { ...config.smtp_config!, pass: e.target.value } })}
                />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.smtp_config.secure}
                  onChange={(e) => setConfig({ ...config, smtp_config: { ...config.smtp_config!, secure: e.target.checked } })}
                  className="rounded"
                />
                <label className="text-sm text-on-surface-variant">Use TLS/SSL</label>
              </div>
            </div>
          )}

          {/* From address */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-on-surface-variant mb-1">From Name</label>
              <Input
                value={config.from_name}
                onChange={(e) => setConfig({ ...config, from_name: e.target.value })}
                placeholder="Sentinel Lens Alerts"
              />
            </div>
            <div>
              <label className="block text-sm text-on-surface-variant mb-1">From Address</label>
              <Input
                value={config.from_address}
                onChange={(e) => setConfig({ ...config, from_address: e.target.value })}
                placeholder="alerts@your-domain.com"
              />
            </div>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </button>
        </div>
      </Card>

      {/* Test email */}
      <Card variant="low" className="p-6">
        <h3 className="text-lg font-headline font-semibold text-on-surface mb-4">Send Test Email</h3>
        <div className="flex gap-2">
          <Input
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="your@email.com"
            className="flex-1"
          />
          <button
            onClick={sendTest}
            disabled={testing || !testEmail}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container text-on-surface rounded-lg hover:bg-surface-container/80 disabled:opacity-50"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Test
          </button>
        </div>
      </Card>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.type === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create LayoutManager settings component (stub)**

Create `src/components/settings/LayoutManager.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import type { EnterpriseReportLayout } from "@/lib/types/enterprise";

export default function LayoutManager() {
  const [layouts, setLayouts] = useState<EnterpriseReportLayout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("enterprise_report_layouts")
        .select("*")
        .order("is_preset", { ascending: false })
        .order("name");
      if (data) setLayouts(data as EnterpriseReportLayout[]);
      setLoading(false);
    };
    load();
  }, []);

  const deleteLayout = async (id: string) => {
    if (!confirm("Delete this layout?")) return;
    const supabase = createClient();
    await supabase.from("enterprise_report_layouts").delete().eq("id", id);
    setLayouts(layouts.filter((l) => l.id !== id));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-on-surface-variant">{layouts.length} layouts available</p>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 text-sm">
          <Plus className="w-4 h-4" />
          New Layout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {layouts.map((layout) => (
          <Card key={layout.id} variant="low" className="p-4">
            {/* Color preview */}
            <div
              className="h-20 rounded-lg mb-3 flex items-center justify-center"
              style={{
                background: layout.layout_config.theme === "dark"
                  ? layout.layout_config.primary_color
                  : "#f8fafc",
                border: `2px solid ${layout.layout_config.accent_color}`,
              }}
            >
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{
                  color: layout.layout_config.theme === "dark" ? "#fff" : layout.layout_config.primary_color,
                }}
              >
                {layout.name}
              </span>
            </div>

            <h4 className="font-medium text-on-surface">{layout.name}</h4>
            <p className="text-xs text-on-surface-variant mt-1">
              {layout.is_preset ? "Preset" : "Custom"} · {layout.layout_config.sections.length} sections
            </p>

            {!layout.is_preset && (
              <div className="flex gap-2 mt-3">
                <button className="p-1.5 rounded hover:bg-surface-container">
                  <Pencil className="w-3.5 h-3.5 text-on-surface-variant" />
                </button>
                <button
                  onClick={() => deleteLayout(layout.id)}
                  className="p-1.5 rounded hover:bg-red-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/Sidebar.tsx src/app/\(protected\)/settings/page.tsx src/components/settings/EmailConfig.tsx src/components/settings/LayoutManager.tsx
git commit -m "feat: add enterprise nav items, email config, and layout manager to settings"
```

---

## Phase 2: Enterprise News Report

### Task 6: Layout Merge Utility

**Files:**
- Create: `src/lib/enterprise-report/merge-layout.ts`

- [ ] **Step 1: Create merge utility**

```typescript
// src/lib/enterprise-report/merge-layout.ts
import type { LayoutConfig } from "@/lib/types/enterprise";

const DEFAULT_LAYOUT: LayoutConfig = {
  theme: "dark",
  primary_color: "#1E3A5F",
  accent_color: "#60A5FA",
  font_heading: "Manrope",
  font_body: "Inter",
  cover_style: "minimal",
  logo_url: null,
  sections: ["cover", "executive_summary", "threat_landscape", "risk_matrix", "immediate_actions", "strategic_actions", "references"],
  show_page_numbers: true,
  show_header_footer: true,
  classification_watermark: true,
};

export function mergeLayoutConfig(
  base: LayoutConfig | undefined | null,
  override: Partial<LayoutConfig> | undefined | null
): LayoutConfig {
  const resolvedBase = base ?? DEFAULT_LAYOUT;
  if (!override) return resolvedBase;
  return {
    ...resolvedBase,
    ...override,
    // Deep merge: sections from override replaces entirely if provided
    sections: override.sections ?? resolvedBase.sections,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/enterprise-report/merge-layout.ts
git commit -m "feat: add layout config merge utility for enterprise reports"
```

---

### Task 7: Layout API Routes

**Files:**
- Create: `src/app/api/enterprise-report/layouts/route.ts`
- Create: `src/app/api/enterprise-report/layouts/[id]/route.ts`

- [ ] **Step 1: Create GET/POST layouts route**

```typescript
// src/app/api/enterprise-report/layouts/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const layoutSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().default(""),
  layout_config: z.object({
    theme: z.enum(["dark", "light"]),
    primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    font_heading: z.string().min(1),
    font_body: z.string().min(1),
    cover_style: z.enum(["minimal", "branded", "full-image"]),
    logo_url: z.string().url().nullable().optional().default(null),
    sections: z.array(z.enum([
      "cover", "executive_summary", "threat_landscape", "risk_matrix",
      "immediate_actions", "strategic_actions", "ioc_table", "references",
    ])).min(1),
    show_page_numbers: z.boolean(),
    show_header_footer: z.boolean(),
    classification_watermark: z.boolean(),
  }),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("enterprise_report_layouts")
    .select("*")
    .order("is_preset", { ascending: false })
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parseResult = layoutSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid request", details: parseResult.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("enterprise_report_layouts")
    .insert({
      ...parseResult.data,
      is_preset: false,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
```

- [ ] **Step 2: Create PUT layout route**

```typescript
// src/app/api/enterprise-report/layouts/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateLayoutSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  layout_config: z.object({
    theme: z.enum(["dark", "light"]),
    primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    font_heading: z.string().min(1),
    font_body: z.string().min(1),
    cover_style: z.enum(["minimal", "branded", "full-image"]),
    logo_url: z.string().url().nullable().optional().default(null),
    sections: z.array(z.enum([
      "cover", "executive_summary", "threat_landscape", "risk_matrix",
      "immediate_actions", "strategic_actions", "ioc_table", "references",
    ])).min(1),
    show_page_numbers: z.boolean(),
    show_header_footer: z.boolean(),
    classification_watermark: z.boolean(),
  }).optional(),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check ownership and non-preset
  const { data: existing } = await supabase
    .from("enterprise_report_layouts")
    .select("is_preset, created_by")
    .eq("id", id)
    .single();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.is_preset) return NextResponse.json({ error: "Cannot edit preset layouts" }, { status: 403 });
  if (existing.created_by !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parseResult = updateLayoutSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid request", details: parseResult.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("enterprise_report_layouts")
    .update(parseResult.data)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/enterprise-report/layouts/
git commit -m "feat: add enterprise report layout CRUD API routes"
```

---

### Task 8: Report Generation API

**Files:**
- Create: `src/app/api/enterprise-report/generate/route.ts`
- Create: `src/app/api/enterprise-report/ai-design/route.ts`

- [ ] **Step 1: Create report generation route**

```typescript
// src/app/api/enterprise-report/generate/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { mergeLayoutConfig } from "@/lib/enterprise-report/merge-layout";
import type { LayoutConfig } from "@/lib/types/enterprise";

const generateSchema = z.object({
  article_ids: z.array(z.string().uuid()).min(1).max(50),
  title: z.string().min(1).max(300),
  report_type: z.string().min(1).max(50),
  classification: z.string().min(1),
  layout_id: z.string().uuid(),
  ai_design_prompt: z.string().max(1000).optional(),
});

const REPORT_SYSTEM_PROMPT = `You are an enterprise cybersecurity report writer. Generate a structured threat intelligence report in English based on the provided articles.

Return ONLY valid JSON with this structure:
{
  "executive_summary": "2-3 paragraph executive summary",
  "subtitle": "Short subtitle for the report",
  "threat_landscape": "Detailed threat landscape analysis",
  "immediate_actions": ["action 1", "action 2", ...],
  "strategic_actions": ["action 1", "action 2", ...],
  "risk_level": "critical|high|medium|low",
  "confidence_level": "high|medium|low",
  "ioc_table": [{"type": "ip|domain|hash|url", "value": "...", "source": "..."}]
}`;

const TRANSLATE_PROMPT = `Translate the following cybersecurity report from English to Thai. Keep all technical terms, CVE IDs, IP addresses, domain names, and tool names in English. Return the same JSON structure with Thai text.`;

const AI_DESIGN_PROMPT = `You are a report layout designer. Given a base layout configuration and a user's design request, modify the layout_config JSON to match their request. You can change: theme, primary_color, accent_color, cover_style, sections order, show_page_numbers, show_header_footer, classification_watermark. Return ONLY valid JSON matching the LayoutConfig structure.`;

async function callLLM(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, systemPrompt: string, userPrompt: string): Promise<string> {
  const { data: providerSetting } = await supabase.from("app_settings").select("value").eq("key", "llm_provider").single();
  const provider = (providerSetting?.value as string) || "gemini";

  const { data: apiKeySetting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", provider === "gemini" ? "gemini_api_key" : "openrouter_api_key")
    .single();

  const apiKey = apiKeySetting?.value as string;
  if (!apiKey) throw new Error(`No API key configured for ${provider}`);

  const { data: modelSetting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", provider === "gemini" ? "gemini_model" : "openrouter_model")
    .single();

  const model = (modelSetting?.value as string) || (provider === "gemini" ? "gemini-2.0-flash" : "google/gemini-2.0-flash-exp:free");

  if (provider === "gemini") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
        }),
      }
    );
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } else {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
        temperature: 0.3,
        max_tokens: 8192,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }
}

function parseJSON(text: string): Record<string, unknown> {
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parseResult = generateSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid request", details: parseResult.error.flatten() }, { status: 400 });
  }

  const { article_ids, title, report_type, classification, layout_id, ai_design_prompt } = parseResult.data;

  try {
    // 1. Fetch layout
    const { data: layout } = await supabase
      .from("enterprise_report_layouts")
      .select("*")
      .eq("id", layout_id)
      .single();

    if (!layout) return NextResponse.json({ error: "Layout not found" }, { status: 404 });

    // 2. AI Design (optional)
    let layoutOverride: Partial<LayoutConfig> | null = null;
    if (ai_design_prompt) {
      const designResult = await callLLM(
        supabase,
        AI_DESIGN_PROMPT,
        `Base layout:\n${JSON.stringify(layout.layout_config, null, 2)}\n\nUser request: ${ai_design_prompt}`
      );
      try {
        layoutOverride = parseJSON(designResult) as Partial<LayoutConfig>;
      } catch {
        // If AI design fails, continue without override
        console.error("[enterprise-report] AI design parse failed, using base layout");
      }
    }

    // 3. Fetch articles
    const { data: articles } = await supabase
      .from("articles")
      .select("id, title, severity, content, excerpt, source_url, published_at, tags")
      .in("id", article_ids);

    if (!articles?.length) return NextResponse.json({ error: "No articles found" }, { status: 404 });

    const articlesText = articles.map((a, i) =>
      `Article ${i + 1}: [${a.severity?.toUpperCase()}] ${a.title}\n${a.excerpt || a.content?.substring(0, 500) || "No content"}\nTags: ${a.tags?.join(", ") || "none"}`
    ).join("\n\n");

    // 4. Create report record first (status: generating)
    const { data: report, error: insertError } = await supabase
      .from("enterprise_reports")
      .insert({
        title,
        report_type,
        classification,
        layout_id,
        layout_config_override: layoutOverride,
        ai_design_prompt: ai_design_prompt || null,
        status: "generating",
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError || !report) {
      return NextResponse.json({ error: insertError?.message || "Failed to create report" }, { status: 500 });
    }

    // Insert junction table
    const junctionRows = article_ids.map((aid, i) => ({
      report_id: report.id,
      article_id: aid,
      display_order: i,
    }));
    await supabase.from("enterprise_report_articles").insert(junctionRows);

    // 5. Generate content EN
    const contentRaw = await callLLM(
      supabase,
      REPORT_SYSTEM_PROMPT,
      `Report type: ${report_type}\nClassification: ${classification}\nTitle: ${title}\n\n${articlesText}`
    );
    const contentEn = parseJSON(contentRaw);

    // 6. Translate to TH
    const translateRaw = await callLLM(
      supabase,
      TRANSLATE_PROMPT,
      JSON.stringify(contentEn, null, 2)
    );
    const contentTh = parseJSON(translateRaw);

    // 7. Determine severity from articles
    const severityOrder = ["critical", "high", "medium", "low", "info"];
    const highestSeverity = articles.reduce((highest, a) => {
      const idx = severityOrder.indexOf(a.severity || "info");
      const hIdx = severityOrder.indexOf(highest);
      return idx < hIdx ? (a.severity || "info") : highest;
    }, "info");

    // 8. Update report with content
    const { data: updated, error: updateError } = await supabase
      .from("enterprise_reports")
      .update({
        content_en: contentEn,
        content_th: contentTh,
        subtitle: (contentEn as Record<string, string>).subtitle || null,
        severity: highestSeverity,
        status: "generated",
      })
      .eq("id", report.id)
      .select()
      .single();

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    // 9. Audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "create",
      entity_type: "enterprise_report",
      entity_id: report.id,
      details: { title, report_type, article_count: article_ids.length },
    });

    return NextResponse.json(updated, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create AI design preview route**

```typescript
// src/app/api/enterprise-report/ai-design/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const aiDesignSchema = z.object({
  layout_id: z.string().uuid(),
  prompt: z.string().min(1).max(1000),
});

const AI_DESIGN_PROMPT = `You are a report layout designer. Given a base layout configuration and a user's design request, modify the layout_config JSON. You can change: theme, primary_color, accent_color, cover_style, sections (array), show_page_numbers, show_header_footer, classification_watermark. Keep font_heading and font_body as-is unless explicitly requested. Return ONLY valid JSON matching the layout structure.`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parseResult = aiDesignSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid request", details: parseResult.error.flatten() }, { status: 400 });
  }

  const { layout_id, prompt } = parseResult.data;

  const { data: layout } = await supabase
    .from("enterprise_report_layouts")
    .select("layout_config")
    .eq("id", layout_id)
    .single();

  if (!layout) return NextResponse.json({ error: "Layout not found" }, { status: 404 });

  // Call LLM
  const { data: providerSetting } = await supabase.from("app_settings").select("value").eq("key", "llm_provider").single();
  const provider = (providerSetting?.value as string) || "gemini";
  const { data: apiKeySetting } = await supabase
    .from("app_settings").select("value")
    .eq("key", provider === "gemini" ? "gemini_api_key" : "openrouter_api_key").single();

  const apiKey = apiKeySetting?.value as string;
  if (!apiKey) return NextResponse.json({ error: "LLM not configured" }, { status: 500 });

  const userPrompt = `Base layout:\n${JSON.stringify(layout.layout_config, null, 2)}\n\nUser request: ${prompt}`;

  try {
    let resultText: string;
    if (provider === "gemini") {
      const model = "gemini-2.0-flash";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: AI_DESIGN_PROMPT }] },
            contents: [{ parts: [{ text: userPrompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
          }),
        }
      );
      const data = await res.json();
      resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-exp:free",
          messages: [{ role: "system", content: AI_DESIGN_PROMPT }, { role: "user", content: userPrompt }],
          temperature: 0.3,
          max_tokens: 2048,
        }),
      });
      const data = await res.json();
      resultText = data.choices?.[0]?.message?.content || "";
    }

    const cleaned = resultText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const modifiedConfig = JSON.parse(cleaned);
    return NextResponse.json({ layout_config: modifiedConfig });
  } catch {
    return NextResponse.json({ error: "AI design generation failed" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/enterprise-report/generate/ src/app/api/enterprise-report/ai-design/
git commit -m "feat: add enterprise report generation and AI design API routes"
```

---

### Task 9: Report CRUD API

**Files:**
- Create: `src/app/api/enterprise-report/[id]/route.ts`

- [ ] **Step 1: Create GET/PUT/DELETE route**

```typescript
// src/app/api/enterprise-report/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mergeLayoutConfig } from "@/lib/enterprise-report/merge-layout";
import type { LayoutConfig } from "@/lib/types/enterprise";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: report, error } = await supabase
    .from("enterprise_reports")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch layout
  let layout = null;
  if (report.layout_id) {
    const { data } = await supabase
      .from("enterprise_report_layouts")
      .select("*")
      .eq("id", report.layout_id)
      .single();
    layout = data;
  }

  // Fetch articles
  const { data: reportArticles } = await supabase
    .from("enterprise_report_articles")
    .select("article_id, display_order")
    .eq("report_id", id)
    .order("display_order");

  let articles: Record<string, unknown>[] = [];
  if (reportArticles?.length) {
    const articleIds = reportArticles.map((ra) => ra.article_id);
    const { data: articleData } = await supabase
      .from("articles")
      .select("id, title, severity, excerpt, source_url, published_at, tags")
      .in("id", articleIds);

    articles = (reportArticles || []).map((ra) => ({
      ...ra,
      article: articleData?.find((a) => a.id === ra.article_id) || null,
    }));
  }

  // Merge layout config
  const mergedConfig = mergeLayoutConfig(
    layout?.layout_config as LayoutConfig | undefined,
    report.layout_config_override as Partial<LayoutConfig> | undefined
  );

  return NextResponse.json({
    ...report,
    layout,
    articles,
    merged_layout_config: mergedConfig,
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const allowedFields = ["title", "subtitle", "content_en", "content_th", "layout_config_override", "status", "export_history"];
  const updateData: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) updateData[key] = body[key];
  }

  const { data, error } = await supabase
    .from("enterprise_reports")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("enterprise_reports").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "delete",
    entity_type: "enterprise_report",
    entity_id: id,
    details: {},
  });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/enterprise-report/\[id\]/route.ts
git commit -m "feat: add enterprise report GET/PUT/DELETE API"
```

---

### Task 10: PDF Export API

**Files:**
- Create: `src/lib/enterprise-report/generate-pdf.ts`
- Create: `src/app/api/enterprise-report/[id]/export/route.ts`

- [ ] **Step 1: Create PDF HTML template builder**

```typescript
// src/lib/enterprise-report/generate-pdf.ts
import type { LayoutConfig, ReportContentEN } from "@/lib/types/enterprise";

interface PDFData {
  title: string;
  subtitle: string | null;
  classification: string;
  severity: string | null;
  report_type: string;
  content: ReportContentEN;
  layout: LayoutConfig;
  created_at: string;
  language: "en" | "th";
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#EF4444",
  high: "#F97316",
  medium: "#3B82F6",
  low: "#22C55E",
  info: "#6B7280",
};

export function buildReportHTML(data: PDFData): string {
  const { title, subtitle, classification, severity, content, layout, created_at, language } = data;
  const bgColor = layout.theme === "dark" ? "#0F172A" : "#FFFFFF";
  const textColor = layout.theme === "dark" ? "#E2E8F0" : "#1E293B";
  const mutedColor = layout.theme === "dark" ? "#94A3B8" : "#64748B";
  const borderColor = layout.theme === "dark" ? "#334155" : "#E2E8F0";
  const sevColor = SEVERITY_COLORS[severity || "info"] || "#6B7280";
  const dateStr = new Date(created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const sections: string[] = [];

  for (const section of layout.sections) {
    switch (section) {
      case "cover":
        sections.push(`
          <div style="page-break-after:always;display:flex;flex-direction:column;justify-content:center;min-height:90vh;text-align:center;padding:60px;">
            ${layout.classification_watermark ? `<div style="color:${sevColor};font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:24px;">${classification}</div>` : ""}
            ${layout.logo_url ? `<img src="${layout.logo_url}" style="max-height:60px;margin:0 auto 24px;" />` : ""}
            <h1 style="font-family:${layout.font_heading},sans-serif;font-size:32px;color:${layout.primary_color};margin:0 0 12px;">${title}</h1>
            ${subtitle ? `<p style="font-size:16px;color:${mutedColor};margin:0 0 24px;">${subtitle}</p>` : ""}
            <div style="font-size:13px;color:${mutedColor};">${dateStr} · Sentinel Lens · ${data.report_type.charAt(0).toUpperCase() + data.report_type.slice(1)} Report</div>
            <div style="margin-top:32px;display:inline-block;padding:6px 16px;border-radius:6px;background:${sevColor}20;color:${sevColor};font-size:12px;font-weight:600;">Risk Level: ${content.risk_level?.toUpperCase() || "N/A"} · Confidence: ${content.confidence_level?.toUpperCase() || "N/A"}</div>
          </div>
        `);
        break;
      case "executive_summary":
        sections.push(`
          <div style="margin-bottom:32px;">
            <h2 style="font-family:${layout.font_heading},sans-serif;font-size:22px;color:${layout.primary_color};border-bottom:2px solid ${layout.accent_color};padding-bottom:8px;margin-bottom:16px;">${language === "th" ? "สรุปสำหรับผู้บริหาร" : "Executive Summary"}</h2>
            <p style="line-height:1.8;white-space:pre-wrap;">${content.executive_summary}</p>
          </div>
        `);
        break;
      case "threat_landscape":
        sections.push(`
          <div style="margin-bottom:32px;">
            <h2 style="font-family:${layout.font_heading},sans-serif;font-size:22px;color:${layout.primary_color};border-bottom:2px solid ${layout.accent_color};padding-bottom:8px;margin-bottom:16px;">${language === "th" ? "ภูมิทัศน์ภัยคุกคาม" : "Threat Landscape"}</h2>
            <p style="line-height:1.8;white-space:pre-wrap;">${content.threat_landscape}</p>
          </div>
        `);
        break;
      case "risk_matrix":
        sections.push(`
          <div style="margin-bottom:32px;">
            <h2 style="font-family:${layout.font_heading},sans-serif;font-size:22px;color:${layout.primary_color};border-bottom:2px solid ${layout.accent_color};padding-bottom:8px;margin-bottom:16px;">${language === "th" ? "เมทริกซ์ความเสี่ยง" : "Risk Matrix"}</h2>
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
              <div style="padding:12px 20px;background:${SEVERITY_COLORS.critical}20;border-left:4px solid ${SEVERITY_COLORS.critical};border-radius:4px;"><strong>Risk Level:</strong> ${content.risk_level?.toUpperCase()}</div>
              <div style="padding:12px 20px;background:${layout.accent_color}20;border-left:4px solid ${layout.accent_color};border-radius:4px;"><strong>Confidence:</strong> ${content.confidence_level?.toUpperCase()}</div>
            </div>
          </div>
        `);
        break;
      case "immediate_actions":
        if (content.immediate_actions?.length) {
          sections.push(`
            <div style="margin-bottom:32px;">
              <h2 style="font-family:${layout.font_heading},sans-serif;font-size:22px;color:${layout.primary_color};border-bottom:2px solid ${layout.accent_color};padding-bottom:8px;margin-bottom:16px;">${language === "th" ? "การดำเนินการเร่งด่วน" : "Immediate Actions"}</h2>
              <ol style="padding-left:20px;line-height:2;">${content.immediate_actions.map((a) => `<li>${a}</li>`).join("")}</ol>
            </div>
          `);
        }
        break;
      case "strategic_actions":
        if (content.strategic_actions?.length) {
          sections.push(`
            <div style="margin-bottom:32px;">
              <h2 style="font-family:${layout.font_heading},sans-serif;font-size:22px;color:${layout.primary_color};border-bottom:2px solid ${layout.accent_color};padding-bottom:8px;margin-bottom:16px;">${language === "th" ? "การดำเนินการเชิงกลยุทธ์" : "Strategic Actions"}</h2>
              <ol style="padding-left:20px;line-height:2;">${content.strategic_actions.map((a) => `<li>${a}</li>`).join("")}</ol>
            </div>
          `);
        }
        break;
      case "ioc_table":
        if (content.ioc_table?.length) {
          sections.push(`
            <div style="margin-bottom:32px;">
              <h2 style="font-family:${layout.font_heading},sans-serif;font-size:22px;color:${layout.primary_color};border-bottom:2px solid ${layout.accent_color};padding-bottom:8px;margin-bottom:16px;">${language === "th" ? "ตัวชี้วัดการโจมตี (IOC)" : "Indicators of Compromise"}</h2>
              <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead><tr style="background:${layout.primary_color}15;">
                  <th style="padding:8px 12px;text-align:left;border-bottom:2px solid ${borderColor};">Type</th>
                  <th style="padding:8px 12px;text-align:left;border-bottom:2px solid ${borderColor};">Value</th>
                  <th style="padding:8px 12px;text-align:left;border-bottom:2px solid ${borderColor};">Source</th>
                </tr></thead>
                <tbody>${content.ioc_table.map((ioc) => `
                  <tr><td style="padding:8px 12px;border-bottom:1px solid ${borderColor};">${ioc.type}</td>
                  <td style="padding:8px 12px;border-bottom:1px solid ${borderColor};font-family:monospace;font-size:12px;">${ioc.value}</td>
                  <td style="padding:8px 12px;border-bottom:1px solid ${borderColor};">${ioc.source}</td></tr>
                `).join("")}</tbody>
              </table>
            </div>
          `);
        }
        break;
      case "references":
        sections.push(`
          <div style="margin-bottom:32px;">
            <h2 style="font-family:${layout.font_heading},sans-serif;font-size:22px;color:${layout.primary_color};border-bottom:2px solid ${layout.accent_color};padding-bottom:8px;margin-bottom:16px;">${language === "th" ? "อ้างอิง" : "References"}</h2>
            <p style="color:${mutedColor};font-size:13px;">Generated by Sentinel Lens Threat Intelligence Platform</p>
          </div>
        `);
        break;
    }
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&family=Inter:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: '${layout.font_body}', 'Sarabun', sans-serif;
      font-size: 14px;
      color: ${textColor};
      background: ${bgColor};
      padding: 40px;
      line-height: 1.6;
    }
    h1, h2, h3 { font-family: '${layout.font_heading}', sans-serif; }
    @page {
      size: A4;
      margin: 20mm;
    }
  </style>
</head>
<body>${sections.join("")}</body>
</html>`;
}
```

- [ ] **Step 2: Create export API route**

```typescript
// src/app/api/enterprise-report/[id]/export/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mergeLayoutConfig } from "@/lib/enterprise-report/merge-layout";
import { buildReportHTML } from "@/lib/enterprise-report/generate-pdf";
import type { LayoutConfig, ReportContentEN } from "@/lib/types/enterprise";
import puppeteer from "puppeteer-core";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const format = body.format || "pdf";
  const language = body.language || "en";

  if (format !== "pdf") {
    return NextResponse.json({ error: "Only PDF export is supported server-side. Use client-side for DOCX." }, { status: 400 });
  }

  // Fetch report
  const { data: report } = await supabase
    .from("enterprise_reports")
    .select("*")
    .eq("id", id)
    .single();

  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  // Fetch layout
  let layoutConfig: LayoutConfig | undefined;
  if (report.layout_id) {
    const { data: layout } = await supabase
      .from("enterprise_report_layouts")
      .select("layout_config")
      .eq("id", report.layout_id)
      .single();
    layoutConfig = layout?.layout_config as LayoutConfig | undefined;
  }

  const mergedLayout = mergeLayoutConfig(layoutConfig, report.layout_config_override as Partial<LayoutConfig> | undefined);
  const content = (language === "th" ? report.content_th : report.content_en) as ReportContentEN;

  if (!content) {
    return NextResponse.json({ error: "Report content not generated yet" }, { status: 400 });
  }

  const html = buildReportHTML({
    title: report.title,
    subtitle: report.subtitle,
    classification: report.classification,
    severity: report.severity,
    report_type: report.report_type,
    content,
    layout: mergedLayout,
    created_at: report.created_at,
    language,
  });

  try {
    // Try to find Chrome/Chromium
    const executablePath = process.platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : process.platform === "win32"
        ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        : "/usr/bin/chromium-browser";

    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
      displayHeaderFooter: mergedLayout.show_header_footer,
      headerTemplate: mergedLayout.show_header_footer
        ? `<div style="font-size:8px;color:#94a3b8;width:100%;text-align:center;padding:5px 20mm;">${report.classification} · ${report.title}</div>`
        : "",
      footerTemplate: mergedLayout.show_page_numbers
        ? `<div style="font-size:8px;color:#94a3b8;width:100%;text-align:center;padding:5px 20mm;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`
        : "",
    });

    await browser.close();

    // Update export history
    const history = Array.isArray(report.export_history) ? report.export_history : [];
    history.push({ format: "pdf", exported_at: new Date().toISOString(), file_size: pdfBuffer.length });
    await supabase.from("enterprise_reports").update({ export_history: history }).eq("id", id);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${report.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF generation failed";
    console.error("[enterprise-report] PDF export error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/enterprise-report/generate-pdf.ts src/app/api/enterprise-report/\[id\]/export/
git commit -m "feat: add enterprise report PDF export with Puppeteer"
```

---

### Task 11: DOCX Client-Side Generator

**Files:**
- Create: `src/lib/enterprise-report/generate-docx.ts`

- [ ] **Step 1: Create DOCX generator**

```typescript
// src/lib/enterprise-report/generate-docx.ts
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  TableOfContents,
  PageBreak,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";
import { saveAs } from "file-saver";
import type { LayoutConfig, ReportContentEN } from "@/lib/types/enterprise";

interface DocxData {
  title: string;
  subtitle: string | null;
  classification: string;
  severity: string | null;
  report_type: string;
  content: ReportContentEN;
  layout: LayoutConfig;
  created_at: string;
}

export async function generateAndDownloadDocx(data: DocxData): Promise<void> {
  const { title, subtitle, classification, content, layout, created_at } = data;
  const dateStr = new Date(created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const sections: Paragraph[] = [];

  for (const section of layout.sections) {
    switch (section) {
      case "cover":
        sections.push(
          new Paragraph({ spacing: { before: 4000 } }),
          new Paragraph({
            children: [new TextRun({ text: classification, bold: true, size: 20, color: "DC2626", font: layout.font_heading })],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [new TextRun({ text: title, bold: true, size: 52, color: layout.primary_color.replace("#", ""), font: layout.font_heading })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 },
          }),
          ...(subtitle ? [new Paragraph({
            children: [new TextRun({ text: subtitle, size: 24, color: "64748B", font: layout.font_body })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200 },
          })] : []),
          new Paragraph({
            children: [new TextRun({ text: `${dateStr} · Sentinel Lens`, size: 20, color: "94A3B8", font: layout.font_body })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 },
          }),
          new Paragraph({ children: [new PageBreak()] }),
        );
        break;

      case "executive_summary":
        sections.push(
          new Paragraph({ text: "Executive Summary", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
          new Paragraph({ children: [new TextRun({ text: content.executive_summary, size: 22, font: layout.font_body })], spacing: { after: 200 } }),
        );
        break;

      case "threat_landscape":
        sections.push(
          new Paragraph({ text: "Threat Landscape", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
          new Paragraph({ children: [new TextRun({ text: content.threat_landscape, size: 22, font: layout.font_body })], spacing: { after: 200 } }),
        );
        break;

      case "risk_matrix":
        sections.push(
          new Paragraph({ text: "Risk Assessment", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
          new Paragraph({ children: [
            new TextRun({ text: `Risk Level: ${content.risk_level?.toUpperCase() || "N/A"}`, bold: true, size: 22 }),
            new TextRun({ text: `  ·  Confidence: ${content.confidence_level?.toUpperCase() || "N/A"}`, size: 22, color: "64748B" }),
          ], spacing: { after: 200 } }),
        );
        break;

      case "immediate_actions":
        if (content.immediate_actions?.length) {
          sections.push(
            new Paragraph({ text: "Immediate Actions", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
            ...content.immediate_actions.map((action, i) =>
              new Paragraph({
                children: [new TextRun({ text: `${i + 1}. ${action}`, size: 22, font: layout.font_body })],
                spacing: { after: 100 },
              })
            ),
          );
        }
        break;

      case "strategic_actions":
        if (content.strategic_actions?.length) {
          sections.push(
            new Paragraph({ text: "Strategic Actions", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
            ...content.strategic_actions.map((action, i) =>
              new Paragraph({
                children: [new TextRun({ text: `${i + 1}. ${action}`, size: 22, font: layout.font_body })],
                spacing: { after: 100 },
              })
            ),
          );
        }
        break;

      case "ioc_table":
        if (content.ioc_table?.length) {
          sections.push(
            new Paragraph({ text: "Indicators of Compromise", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: ["Type", "Value", "Source"].map((h) =>
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20 })] })],
                      width: { size: 33, type: WidthType.PERCENTAGE },
                    })
                  ),
                }),
                ...content.ioc_table.map((ioc) =>
                  new TableRow({
                    children: [ioc.type, ioc.value, ioc.source].map((val) =>
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: val, size: 20 })] })],
                      })
                    ),
                  })
                ),
              ],
            }),
          );
        }
        break;

      case "references":
        sections.push(
          new Paragraph({ text: "References", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
          new Paragraph({
            children: [new TextRun({ text: "Generated by Sentinel Lens Threat Intelligence Platform", size: 20, color: "94A3B8" })],
          }),
        );
        break;
    }
  }

  const doc = new Document({
    sections: [{ children: sections }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${title.replace(/[^a-zA-Z0-9]/g, "_")}.docx`);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/enterprise-report/generate-docx.ts
git commit -m "feat: add client-side DOCX generation for enterprise reports"
```

---

### Task 12: Enterprise Report UI — Wizard Components

**Files:**
- Create: `src/components/enterprise-report/ArticleSelector.tsx`
- Create: `src/components/enterprise-report/LayoutPicker.tsx`
- Create: `src/components/enterprise-report/AIDesignPanel.tsx`
- Create: `src/components/enterprise-report/ReportWizard.tsx`

This task creates 4 components. Due to the length of each, they should be implemented as separate files following the patterns from `src/app/(protected)/iocs/page.tsx` and `src/app/(protected)/report/new/page.tsx`.

- [ ] **Step 1: Create ArticleSelector component**

Create `src/components/enterprise-report/ArticleSelector.tsx` — a "use client" component that fetches articles from supabase, shows checkbox list with search input and severity filter, tracks selected article IDs, and calls `onSelect(ids: string[])` callback. Use existing patterns: `createClient()`, severity badge colors, `Input` component for search.

- [ ] **Step 2: Create LayoutPicker component**

Create `src/components/enterprise-report/LayoutPicker.tsx` — fetches layouts from `/api/enterprise-report/layouts`, shows grid of layout cards with color preview (like LayoutManager in settings), calls `onSelect(layoutId: string)` when clicked. Highlight selected card with `ring-2 ring-primary`.

- [ ] **Step 3: Create AIDesignPanel component**

Create `src/components/enterprise-report/AIDesignPanel.tsx` — textarea for AI prompt, "Generate Preview" button that calls `/api/enterprise-report/ai-design`, shows resulting layout_config preview (color swatches, section list), "Apply" and "Skip" buttons. Calls `onApply(override: Partial<LayoutConfig>)` or `onSkip()`.

- [ ] **Step 4: Create ReportWizard component**

Create `src/components/enterprise-report/ReportWizard.tsx` — 4-step wizard orchestrator. State: `step` (1-4), `selectedArticleIds`, `selectedLayoutId`, `layoutOverride`, `title`, `reportType`, `classification`. Step indicator bar at top. Renders the appropriate child component per step. Step 4 shows summary + "Generate Report" button that POSTs to `/api/enterprise-report/generate`, then redirects to `/enterprise-report/[id]`.

- [ ] **Step 5: Verify build**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 6: Commit**

```bash
git add src/components/enterprise-report/
git commit -m "feat: add enterprise report wizard components (article selector, layout picker, AI design)"
```

---

### Task 13: Enterprise Report UI — Viewer & Exporter

**Files:**
- Create: `src/components/enterprise-report/EnterpriseReportViewer.tsx`
- Create: `src/components/enterprise-report/ReportExporter.tsx`

- [ ] **Step 1: Create EnterpriseReportViewer**

Create `src/components/enterprise-report/EnterpriseReportViewer.tsx` — renders report content using merged layout_config. Shows sections in order, applies colors/fonts via inline styles on a card container. Language toggle (EN/TH) at top. Props: `report: EnterpriseReportWithArticles`, `mergedLayout: LayoutConfig`.

- [ ] **Step 2: Create ReportExporter**

Create `src/components/enterprise-report/ReportExporter.tsx` — two buttons: "Export PDF" (calls `/api/enterprise-report/[id]/export` with fetch, downloads response blob) and "Export DOCX" (calls `generateAndDownloadDocx()` from lib). Shows loading spinner during export. Props: `reportId: string`, `report: EnterpriseReport`, `mergedLayout: LayoutConfig`.

- [ ] **Step 3: Commit**

```bash
git add src/components/enterprise-report/EnterpriseReportViewer.tsx src/components/enterprise-report/ReportExporter.tsx
git commit -m "feat: add enterprise report viewer and PDF/DOCX exporter components"
```

---

### Task 14: Enterprise Report Pages

**Files:**
- Create: `src/app/(protected)/enterprise-report/page.tsx`
- Create: `src/app/(protected)/enterprise-report/new/page.tsx`
- Create: `src/app/(protected)/enterprise-report/[id]/page.tsx`
- Create: `src/app/(protected)/enterprise-report/loading.tsx`

- [ ] **Step 1: Create report list page**

Create `src/app/(protected)/enterprise-report/page.tsx` — server component. Fetch enterprise_reports from supabase ordered by created_at desc. Show grid of report cards (title, type badge, severity badge, classification, date, status). "New Report" button links to `/enterprise-report/new`. Pattern from `/report-archive/page.tsx`.

- [ ] **Step 2: Create new report page**

Create `src/app/(protected)/enterprise-report/new/page.tsx` — client page that renders `<ReportWizard />`.

- [ ] **Step 3: Create report viewer page**

Create `src/app/(protected)/enterprise-report/[id]/page.tsx` — server component. Fetch report via `/api/enterprise-report/[id]` (internal fetch or direct supabase). Render `<EnterpriseReportViewer />` and `<ReportExporter />`. Add `generateMetadata()` for SEO.

- [ ] **Step 4: Create loading skeleton**

Create `src/app/(protected)/enterprise-report/loading.tsx` — skeleton with animated pulse bars matching the report list layout.

- [ ] **Step 5: Verify build**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 6: Commit**

```bash
git add src/app/\(protected\)/enterprise-report/
git commit -m "feat: add enterprise report pages (list, wizard, viewer)"
```

---

## Phase 3: Enterprise NEWS Watch List

### Task 15: Watchlist Matcher & Summarizer

**Files:**
- Create: `src/lib/watchlist/matcher.ts`
- Create: `src/lib/watchlist/summarizer.ts`
- Create: `src/lib/watchlist/email-templates.ts`

- [ ] **Step 1: Create keyword matcher**

```typescript
// src/lib/watchlist/matcher.ts
import type { WatchlistKeyword } from "@/lib/types/enterprise";

interface ArticleFields {
  title: string;
  content: string | null;
  excerpt: string | null;
  tags: string[] | null;
}

export interface MatchResult {
  keyword_id: string;
  matched_keyword: string;
  matched_in: string; // "title" | "content" | "excerpt" | "tags"
}

export function matchArticleAgainstKeywords(
  article: ArticleFields,
  keywords: WatchlistKeyword[]
): MatchResult[] {
  const results: MatchResult[] = [];
  const fields: { name: string; value: string }[] = [
    { name: "title", value: article.title || "" },
    { name: "content", value: article.content || "" },
    { name: "excerpt", value: article.excerpt || "" },
    { name: "tags", value: (article.tags || []).join(" ") },
  ];

  for (const kw of keywords) {
    for (const field of fields) {
      if (!field.value) continue;
      let matched = false;

      switch (kw.match_mode) {
        case "contains":
          matched = field.value.toLowerCase().includes(kw.keyword.toLowerCase());
          break;
        case "exact": {
          const regex = new RegExp(`\\b${escapeRegex(kw.keyword)}\\b`, "i");
          matched = regex.test(field.value);
          break;
        }
        case "regex":
          try {
            const regex = new RegExp(kw.keyword, "i");
            matched = regex.test(field.value);
          } catch {
            // Invalid regex, skip
          }
          break;
      }

      if (matched) {
        // Only record first match per keyword (avoid duplicates across fields)
        if (!results.some((r) => r.keyword_id === kw.id)) {
          results.push({
            keyword_id: kw.id,
            matched_keyword: kw.keyword,
            matched_in: field.name,
          });
        }
      }
    }
  }

  return results;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
```

- [ ] **Step 2: Create Thai summarizer**

```typescript
// src/lib/watchlist/summarizer.ts
import type { SummaryLevel } from "@/lib/types/enterprise";

const SHORT_PROMPT = `สรุปข่าว cybersecurity ต่อไปนี้เป็นภาษาไทย 2-3 บรรทัด เก็บคำศัพท์เทคนิค (CVE, IP, domain, ชื่อเครื่องมือ) ไว้เป็นภาษาอังกฤษ ตอบเป็นข้อความเปล่าๆ ไม่ต้องมี JSON`;

const DETAILED_PROMPT = `สรุปข่าว cybersecurity ต่อไปนี้เป็นภาษาไทยอย่างละเอียด 1-2 ย่อหน้า พร้อมแนวทางดำเนินการ (recommended actions) เก็บคำศัพท์เทคนิค (CVE, IP, domain, ชื่อเครื่องมือ) ไว้เป็นภาษาอังกฤษ ตอบเป็นข้อความเปล่าๆ ไม่ต้องมี JSON`;

interface SummarizeParams {
  title: string;
  content: string | null;
  excerpt: string | null;
  severity: string | null;
  level: SummaryLevel;
  supabase: {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (col: string, val: string) => {
          single: () => Promise<{ data: { value: unknown } | null }>;
        };
      };
    };
  };
}

export async function summarizeInThai(params: SummarizeParams): Promise<string> {
  const { title, content, excerpt, severity, level, supabase } = params;

  const systemPrompt = level === "short" ? SHORT_PROMPT : DETAILED_PROMPT;
  const articleText = `Title: ${title}\nSeverity: ${severity || "unknown"}\n\n${excerpt || content?.substring(0, 1500) || "No content available"}`;

  const { data: providerSetting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "llm_provider")
    .single();

  const provider = (providerSetting?.value as string) || "gemini";

  const { data: apiKeySetting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", provider === "gemini" ? "gemini_api_key" : "openrouter_api_key")
    .single();

  const apiKey = apiKeySetting?.value as string;
  if (!apiKey) return "(ไม่สามารถสรุปได้ — ยังไม่ได้ตั้งค่า LLM API Key)";

  try {
    if (provider === "gemini") {
      const model = "gemini-2.0-flash";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: articleText }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
          }),
        }
      );
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "(สรุปล้มเหลว)";
    } else {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-exp:free",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: articleText }],
          temperature: 0.3,
          max_tokens: 1024,
        }),
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || "(สรุปล้มเหลว)";
    }
  } catch {
    return "(เกิดข้อผิดพลาดในการสรุป)";
  }
}
```

- [ ] **Step 3: Create email templates**

```typescript
// src/lib/watchlist/email-templates.ts
interface MatchEmailData {
  watchlistName: string;
  matches: {
    title: string;
    severity: string;
    matchedKeyword: string;
    matchedIn: string;
    summaryTh: string;
    articleUrl: string;
  }[];
}

const SEVERITY_EMOJI: Record<string, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🔵",
  low: "🟢",
  info: "⚪",
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#EF4444",
  high: "#F97316",
  medium: "#3B82F6",
  low: "#22C55E",
  info: "#6B7280",
};

export function buildSingleMatchEmail(data: MatchEmailData): { subject: string; html: string } {
  const match = data.matches[0];
  const emoji = SEVERITY_EMOJI[match.severity] || "⚪";
  const color = SEVERITY_COLOR[match.severity] || "#6B7280";

  return {
    subject: `[Sentinel Lens] ${emoji} พบข่าว ${match.severity.toUpperCase()} ตรง Watchlist "${data.watchlistName}"`,
    html: `
      <div style="font-family:'Inter','Sarabun',sans-serif;max-width:600px;margin:0 auto;background:#0F172A;color:#E2E8F0;border-radius:12px;overflow:hidden;">
        <div style="background:#1E293B;padding:16px 24px;border-bottom:2px solid ${color};">
          <h2 style="margin:0;font-size:16px;color:#60A5FA;">Sentinel Lens Alert</h2>
          <p style="margin:4px 0 0;font-size:12px;color:#64748B;">Watchlist: ${data.watchlistName}</p>
        </div>
        <div style="padding:24px;">
          <div style="margin-bottom:16px;">
            <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;color:white;background:${color};">${match.severity.toUpperCase()}</span>
            <span style="font-size:11px;color:#64748B;margin-left:8px;">Keyword: "${match.matchedKeyword}" (${match.matchedIn})</span>
          </div>
          <h3 style="margin:0 0 12px;font-size:18px;color:#F8FAFC;">${match.title}</h3>
          <p style="color:#CBD5E1;line-height:1.7;font-size:14px;">${match.summaryTh}</p>
          <a href="${match.articleUrl}" style="display:inline-block;margin-top:16px;padding:8px 20px;background:#3B82F6;color:white;text-decoration:none;border-radius:6px;font-size:13px;">อ่านรายละเอียดเพิ่มเติม →</a>
        </div>
        <div style="padding:12px 24px;background:#1E293B;font-size:11px;color:#64748B;text-align:center;">
          Sentinel Lens Threat Intelligence Platform
        </div>
      </div>
    `,
  };
}

export function buildDigestEmail(data: MatchEmailData): { subject: string; html: string } {
  const highestSeverity = data.matches.reduce((h, m) => {
    const order = ["critical", "high", "medium", "low", "info"];
    return order.indexOf(m.severity) < order.indexOf(h) ? m.severity : h;
  }, "info");
  const emoji = SEVERITY_EMOJI[highestSeverity] || "⚪";

  const matchesHtml = data.matches.map((m, i) => {
    const color = SEVERITY_COLOR[m.severity] || "#6B7280";
    return `
      <div style="background:#1E293B;border-radius:8px;padding:16px;margin-bottom:12px;border-left:3px solid ${color};">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:11px;font-weight:600;color:${color};">${m.severity.toUpperCase()}</span>
          <span style="font-size:11px;color:#64748B;">Keyword: "${m.matchedKeyword}"</span>
        </div>
        <h4 style="margin:0 0 8px;font-size:15px;color:#F8FAFC;">${m.title}</h4>
        <p style="color:#CBD5E1;font-size:13px;line-height:1.6;margin:0 0 8px;">${m.summaryTh}</p>
        <a href="${m.articleUrl}" style="color:#60A5FA;font-size:12px;text-decoration:none;">อ่านต่อ →</a>
      </div>
    `;
  }).join("");

  return {
    subject: `[Sentinel Lens] ${emoji} รายงานเฝ้าระวัง "${data.watchlistName}" — ${data.matches.length} ข่าวใหม่`,
    html: `
      <div style="font-family:'Inter','Sarabun',sans-serif;max-width:600px;margin:0 auto;background:#0F172A;color:#E2E8F0;border-radius:12px;overflow:hidden;">
        <div style="background:#1E293B;padding:16px 24px;border-bottom:2px solid #3B82F6;">
          <h2 style="margin:0;font-size:16px;color:#60A5FA;">Sentinel Lens Digest</h2>
          <p style="margin:4px 0 0;font-size:12px;color:#64748B;">Watchlist: ${data.watchlistName} · ${data.matches.length} matches</p>
        </div>
        <div style="padding:24px;">${matchesHtml}</div>
        <div style="padding:12px 24px;background:#1E293B;font-size:11px;color:#64748B;text-align:center;">
          Sentinel Lens Threat Intelligence Platform
        </div>
      </div>
    `,
  };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/watchlist/
git commit -m "feat: add watchlist keyword matcher, Thai summarizer, and email templates"
```

---

### Task 16: Watchlist CRUD API

**Files:**
- Create: `src/app/api/watchlists/route.ts`
- Create: `src/app/api/watchlists/[id]/route.ts`
- Create: `src/app/api/watchlists/[id]/matches/route.ts`

- [ ] **Step 1: Create GET/POST watchlists route**

Pattern: Zod validation, supabase auth check, user-scoped queries. POST creates watchlist + keywords in one transaction. GET returns watchlists with keyword_count and match_count using separate count queries.

- [ ] **Step 2: Create GET/PUT/DELETE watchlist by ID route**

GET returns watchlist with keywords array and recent 20 matches. PUT allows updating name, description, notify_mode, batch_interval_minutes, summary_level, email_recipients, is_active, and keywords (full replace). DELETE sets is_active = false.

- [ ] **Step 3: Create matches history route**

GET with pagination (page, limit query params). Returns matches joined with article data (title, severity, source_url, published_at). Ordered by created_at desc.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/watchlists/
git commit -m "feat: add watchlist CRUD and match history API routes"
```

---

### Task 17: Watchlist Scan & Article Hook

**Files:**
- Create: `src/app/api/watchlists/scan/route.ts`
- Create: `src/app/api/cron/watchlist-digest/route.ts`
- Modify: `src/app/api/articles/route.ts`

- [ ] **Step 1: Create manual scan route**

POST `/api/watchlists/scan` — fetches all active watchlists with keywords, fetches articles from last 24 hours, runs matcher, inserts matches, generates summaries, sends real-time emails for real-time watchlists. Auth required (analyst/admin).

- [ ] **Step 2: Create cron digest route**

POST `/api/cron/watchlist-digest` — authenticated via CRON_SECRET. Finds batch watchlists past their interval. Collects unnotified matches. Generates digest email. Sends via email utility. Updates notified_at timestamps.

- [ ] **Step 3: Add watchlist hook to articles route**

In `src/app/api/articles/route.ts` POST handler, after successful article insert, add:

```typescript
// Fire watchlist matching in background (don't block response)
matchWatchlistsForArticle(article).catch(console.error);
```

Create the helper function that:
1. Fetches active watchlists with notify_mode = "realtime" and their keywords
2. Runs matcher
3. Inserts matches
4. Generates Thai summaries
5. Sends email immediately
6. Updates notified_at

- [ ] **Step 4: Commit**

```bash
git add src/app/api/watchlists/scan/ src/app/api/cron/watchlist-digest/ src/app/api/articles/route.ts
git commit -m "feat: add watchlist scan, cron digest, and real-time article hook"
```

---

### Task 18: Watchlist UI Components

**Files:**
- Create: `src/components/watchlist/WatchlistCard.tsx`
- Create: `src/components/watchlist/KeywordInput.tsx`
- Create: `src/components/watchlist/WatchlistForm.tsx`
- Create: `src/components/watchlist/WatchlistDashboard.tsx`
- Create: `src/components/watchlist/MatchTimeline.tsx`
- Create: `src/components/watchlist/MatchCard.tsx`

- [ ] **Step 1: Create KeywordInput** — tag-style input. Type keyword + Enter to add as chip. Each chip has keyword text, match_mode dropdown (contains/exact/regex), and × remove button. Props: `value: {keyword, match_mode}[]`, `onChange`.

- [ ] **Step 2: Create WatchlistForm** — form with name, description, KeywordInput, notify mode toggle (real-time/batch), batch interval select (15/30/60 min), summary level toggle (short/detailed), email recipients (tag input), save button. Props: `initialData?`, `onSave`.

- [ ] **Step 3: Create WatchlistCard** — displays single watchlist with name, keyword count chips, match stats, notify mode badge, active/paused indicator, edit/pause/delete action buttons.

- [ ] **Step 4: Create WatchlistDashboard** — stats bar (active lists, matches today, total keywords), list of WatchlistCards, "New Watch List" button.

- [ ] **Step 5: Create MatchCard** — single match entry: article title, severity badge, matched keyword pill, matched_in location, Thai summary text, email status (sent/pending), "อ่านต่อ" link, time ago.

- [ ] **Step 6: Create MatchTimeline** — wraps MatchCards in timeline layout with vertical line and dot indicators colored by severity.

- [ ] **Step 7: Commit**

```bash
git add src/components/watchlist/
git commit -m "feat: add watchlist UI components (form, dashboard, timeline)"
```

---

### Task 19: Watchlist Pages

**Files:**
- Create: `src/app/(protected)/watchlist/page.tsx`
- Create: `src/app/(protected)/watchlist/new/page.tsx`
- Create: `src/app/(protected)/watchlist/[id]/page.tsx`
- Create: `src/app/(protected)/watchlist/[id]/edit/page.tsx`
- Create: `src/app/(protected)/watchlist/loading.tsx`

- [ ] **Step 1: Create dashboard page** — server component that fetches watchlists and renders `<WatchlistDashboard />`.

- [ ] **Step 2: Create new watchlist page** — client page rendering `<WatchlistForm />` with POST to `/api/watchlists`, redirect on success.

- [ ] **Step 3: Create match history page** — server component fetching watchlist by ID + matches, renders watchlist header + `<MatchTimeline />`.

- [ ] **Step 4: Create edit page** — client page fetching watchlist data, renders `<WatchlistForm initialData={...} />` with PUT to `/api/watchlists/[id]`.

- [ ] **Step 5: Create loading skeleton**

- [ ] **Step 6: Verify build**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 7: Commit**

```bash
git add src/app/\(protected\)/watchlist/
git commit -m "feat: add watchlist pages (dashboard, create, edit, match history)"
```

---

## Phase 4: Final Integration

### Task 20: Build Verification & Cleanup

- [ ] **Step 1: Full build check**

```bash
npm run build
```

Fix any TypeScript or build errors.

- [ ] **Step 2: Lint check**

```bash
npm run lint
```

Fix any lint errors.

- [ ] **Step 3: Manual smoke test checklist**

Verify in browser:
- [ ] Sidebar shows "Enterprise Report" and "Watch List" nav items
- [ ] Settings shows "Email" and "Report Layouts" tabs
- [ ] `/enterprise-report` page loads with preset layouts visible
- [ ] `/enterprise-report/new` wizard flows through 4 steps
- [ ] `/watchlist` dashboard page loads
- [ ] `/watchlist/new` form works with keyword tag input

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix: build and lint fixes for enterprise features"
```

- [ ] **Step 5: Push**

```bash
git push
```
