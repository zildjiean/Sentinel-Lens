# Sentinel Lens Cybersecurity Intelligence Feed — Design Spec

**Date:** 2026-04-07
**Status:** Approved
**Approach:** Next.js App Router + Supabase Edge Functions

---

## 1. Overview

Sentinel Lens is a bilingual (EN/TH) cybersecurity intelligence platform that aggregates news from RSS feeds and manual input, translates content using LLM (Gemini / OpenRouter), and generates executive reports for CISOs.

### Key Requirements

- **Public feed**: Anyone can browse cybersecurity news (SSR, SEO-friendly)
- **Protected features**: Translation Lab, Report Archive, Executive Reports require login
- **Bilingual**: UI labels via next-intl (EN/TH), article content via LLM translation
- **Hybrid translation**: Auto-translate critical/high severity articles; on-demand for the rest
- **LLM provider**: Admin selects Gemini or OpenRouter via Settings UI with fallback support
- **Report generation**: LLM auto-generates CISO executive reports from selected articles + PDF export
- **3 roles**: Admin (full access), Analyst (translate, create reports), Viewer (read-only)
- **Auth**: Supabase Auth + Google/GitHub OAuth, SSO/SAML-ready architecture
- **All 4 pages** delivered simultaneously (no phased rollout)

### Tech Stack

| Layer | Technology | Tier |
|-------|-----------|------|
| Frontend | Next.js 14 (App Router) | Vercel Free |
| Database | Supabase PostgreSQL + RLS | Supabase Free |
| Auth | Supabase Auth (email, Google, GitHub) | Supabase Free |
| Backend Logic | Supabase Edge Functions (Deno) | Supabase Free |
| Scheduling | pg_cron | Supabase Free |
| Storage | Supabase Storage (PDFs) | Supabase Free |
| LLM | Gemini API / OpenRouter API | Pay-per-use |
| Hosting | Vercel | Free |
| VCS | GitHub | Free |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Vercel (Free)                     │
│  ┌───────────────────────────────────────────────┐  │
│  │          Next.js 14 (App Router)              │  │
│  │  ┌──────────┐ ┌───────────┐ ┌─────────────┐  │  │
│  │  │ Public   │ │ Protected │ │ API Routes  │  │  │
│  │  │ Feed SSR │ │ Pages CSR │ │ (lightweight│  │  │
│  │  │          │ │           │ │  proxy only)│  │  │
│  │  └──────────┘ └───────────┘ └─────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │ Supabase Client SDK
┌──────────────────────▼──────────────────────────────┐
│                 Supabase (Free Tier)                 │
│  ┌────────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │ PostgreSQL │ │ Auth     │ │ Edge Functions    │  │
│  │ + RLS      │ │ (OAuth)  │ │ - rss-fetcher    │  │
│  │ + pg_cron  │ │          │ │ - llm-translate   │  │
│  │            │ │          │ │ - report-gen      │  │
│  │            │ │          │ │ - llm-provider    │  │
│  └────────────┘ └──────────┘ └───────────────────┘  │
│  ┌────────────┐                                     │
│  │ Storage    │ (PDF exports, report assets)        │
│  └────────────┘                                     │
└─────────────────────────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │ RSS Feeds│ │ Gemini   │ │OpenRouter│
   │ (ext.)   │ │ API      │ │ API      │
   └──────────┘ └──────────┘ └──────────┘
```

**Key decisions:**
- Next.js App Router — SSR for public feed (SEO), client-side for protected pages
- Supabase RLS — enforce permissions at database level per role
- Edge Functions — all heavy tasks (RSS fetch, translation, report generation)
- pg_cron — schedule RSS fetch + auto-translate high severity every 15-30 minutes
- Supabase Storage — store PDF exports

---

## 3. Database Schema

### profiles

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | FK → auth.users, PK |
| email | TEXT | |
| display_name | TEXT | |
| role | ENUM('admin', 'analyst', 'viewer') | |
| avatar_url | TEXT | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### rss_sources

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | TEXT | e.g. "The Hacker News" |
| url | TEXT | RSS feed URL |
| is_active | BOOLEAN | |
| fetch_interval | INT | minutes, default 30 |
| last_fetched_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

### articles

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| source_id | UUID | FK → rss_sources, nullable for manual |
| title | TEXT | |
| content | TEXT | |
| excerpt | TEXT | |
| url | TEXT | original article URL |
| image_url | TEXT | |
| author | TEXT | |
| severity | ENUM('critical','high','medium','low','info') | |
| status | ENUM('new','translated','reviewed','archived') | |
| tags | TEXT[] | |
| published_at | TIMESTAMPTZ | |
| is_manual | BOOLEAN | default false |
| created_by | UUID | FK → profiles, nullable |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### translations

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| article_id | UUID | FK → articles, unique |
| title_th | TEXT | |
| content_th | TEXT | |
| excerpt_th | TEXT | |
| provider | ENUM('gemini','openrouter') | |
| model | TEXT | e.g. "gemini-2.0-flash" |
| confidence | FLOAT | 0-1 |
| is_verified | BOOLEAN | analyst verified |
| verified_by | UUID | FK → profiles, nullable |
| token_usage | INT | |
| translated_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### reports

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| title | TEXT | |
| report_type | ENUM('executive','incident','weekly') | |
| content_en | JSONB | structured report sections |
| content_th | JSONB | |
| severity | ENUM('critical','high','medium','low') | |
| classification | TEXT | e.g. "TLP:RED" |
| provider | ENUM('gemini','openrouter') | |
| model | TEXT | |
| pdf_path | TEXT | Supabase Storage path |
| status | ENUM('draft','generated','reviewed','published') | |
| created_by | UUID | FK → profiles |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### report_articles (junction)

| Column | Type | Notes |
|--------|------|-------|
| report_id | UUID | FK → reports, composite PK |
| article_id | UUID | FK → articles, composite PK |

### app_settings

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| key | TEXT | UNIQUE |
| value | JSONB | |
| updated_by | UUID | FK → profiles |
| updated_at | TIMESTAMPTZ | |

Settings keys: `llm_provider`, `llm_api_keys` (encrypted), `rss_fetch_interval`, `auto_translate_severity`, `default_classification`

### RLS Policies

| Table | Viewer | Analyst | Admin |
|-------|--------|---------|-------|
| articles | SELECT (published) | SELECT, INSERT, UPDATE | ALL |
| translations | SELECT | SELECT, INSERT, UPDATE | ALL |
| reports | SELECT (published) | SELECT, INSERT, UPDATE | ALL |
| rss_sources | - | SELECT | ALL |
| app_settings | - | - | ALL |
| profiles | SELECT (own) | SELECT (own) | ALL |

### Indexes

- `articles(severity, status)` — filter high severity for auto-translate
- `articles(published_at DESC)` — feed ordering
- `articles(source_id, published_at)` — dedup check
- `translations(article_id)` — unique, 1:1 lookup

---

## 4. Edge Functions & Backend Logic

### 4.1 RSS Fetcher (`rss-fetcher`)

**Trigger:** pg_cron every 15 minutes

1. Query `rss_sources` WHERE `is_active = true`
2. Fetch RSS XML from each source (parallel)
3. Parse → extract title, content, excerpt, url, image, author, published_at
4. Dedup check: if url exists in articles → skip
5. Classify severity via keyword matching:
   - critical: "breach", "zero-day", "ransomware attack", "CVE-2..."
   - high: "vulnerability", "exploit", "malware"
   - medium: "patch", "update", "advisory"
   - low/info: everything else
6. INSERT new articles
7. If severity = critical/high → trigger `llm-translate` automatically
8. UPDATE `rss_sources.last_fetched_at`

### 4.2 LLM Translate (`llm-translate`)

**Trigger:** Auto (from rss-fetcher for critical/high) or on-demand (user clicks Translate)

1. Read `app_settings` → get active provider + API key
2. Build prompt:
   - System: "You are a cybersecurity news translator EN→TH. Preserve technical terms (CVE, APT, IoC, etc.) in English. Translate only natural language portions."
   - User: title + content + excerpt
3. Call LLM provider:
   - Gemini: POST generativelanguage.googleapis.com
   - OpenRouter: POST openrouter.ai/api/v1/chat/completions
4. Parse response → title_th, content_th, excerpt_th
5. INSERT translations with confidence score (derived from LLM response metadata or heuristic based on token probability) + token_usage
6. UPDATE `articles.status = 'translated'`
7. If provider fails → try fallback provider (if configured)

### 4.3 Report Generator (`report-gen`)

**Trigger:** Analyst/Admin creates report from UI

**Input:** article_ids[], report_type, classification

1. Fetch articles + translations for selected IDs
2. Build structured prompt per report_type:
   - executive: Executive Summary, Threat Landscape, Risk Matrix, Mitigation Recommendations
3. Call LLM → generate content_en (JSONB structured sections)
4. Call LLM → generate content_th (translate report)
5. INSERT reports + report_articles junction
6. Generate PDF using @react-pdf/renderer with CISO Executive Report template styling
7. Upload PDF → Supabase Storage
8. UPDATE `reports.pdf_path` + `status = 'generated'`

### 4.4 LLM Provider Abstraction (`llm-provider`)

Shared module used by other Edge Functions:

```typescript
interface LLMProvider {
  translate(text: string, opts: TranslateOpts): Promise<TranslateResult>
  generateReport(articles: Article[], opts: ReportOpts): Promise<ReportResult>
}
```

Provider selection flow:
1. Read `app_settings.llm_provider`
2. Read `app_settings.llm_api_keys` (encrypted)
3. Return GeminiProvider or OpenRouterProvider
4. Fallback: if primary fails → switch to secondary

### Error Handling

- Rate limit → exponential backoff (max 3 retries)
- Provider down → fallback to secondary provider
- Invalid API key → log error + notify admin via app_settings
- Translation quality low (confidence < 0.7) → flag for analyst review

---

## 5. Frontend Pages & Components

### 5.1 Route Structure

```
app/
├── (public)/
│   ├── page.tsx                    # Intelligence Feed (SSR, public)
│   └── article/[id]/page.tsx       # Article detail (SSR, public)
├── (protected)/
│   ├── translation-lab/page.tsx    # Translation Lab (Analyst+)
│   ├── report-archive/page.tsx     # Report Archive (all roles)
│   ├── report/new/page.tsx         # Create new report (Analyst+)
│   ├── report/[id]/page.tsx        # View/export report
│   └── settings/page.tsx           # Settings (Admin only)
├── (auth)/
│   ├── login/page.tsx
│   └── callback/page.tsx           # OAuth callback
└── api/
    └── translate/route.ts          # Trigger Edge Function
```

### 5.2 Page → Design Mapping

| Page | Design File | Key Features |
|------|------------|--------------|
| Intelligence Feed | sentinel_intelligence_feed/code.html | Hero briefing card, bento grid, severity badges, FAB, search/filter |
| Translation Lab | sentinel_translation_lab/code.html | Dual-pane EN/TH, confidence score, term accuracy, analyst verdict |
| Report Archive | sentinel_report_archive/code.html | Filter bento, report cards with preview, pagination, batch actions |
| Executive Report | ciso_executive_report_template/code.html | Print-optimized, risk matrix, dual-language sections, PDF export |
| Settings | New (not in design) | LLM config, RSS sources, user management, auto-translate settings |

### 5.3 Shared Components

```
components/
├── layout/
│   ├── Sidebar.tsx              # 256px fixed, nav, active states
│   ├── TopBar.tsx               # Search, notifications, avatar
│   └── PublicLayout.tsx         # Public pages layout (no sidebar)
├── ui/
│   ├── Button.tsx               # Primary, secondary, security-action
│   ├── Card.tsx                 # Tonal nesting, no borders
│   ├── Badge.tsx                # Severity variants
│   ├── StatusIndicator.tsx      # 8px dot with glow
│   ├── ThreatMeter.tsx          # Gradient fill bar
│   ├── Input.tsx                # Bottom-border style
│   └── Select.tsx               # Glass-panel dropdown
├── feed/
│   ├── HeroBriefing.tsx         # Hero card with 3 metrics
│   ├── ArticleCard.tsx          # Bento grid card
│   └── ArticleGrid.tsx          # Responsive bento layout
├── translation/
│   ├── SourcePane.tsx           # English source (left)
│   ├── TargetPane.tsx           # Thai translation (right)
│   └── AnalysisCards.tsx        # Risk, accuracy, verdict
├── report/
│   ├── ReportCard.tsx           # Archive list item
│   ├── ReportViewer.tsx         # Executive template renderer
│   └── RiskMatrix.tsx           # 5x5 interactive matrix
└── shared/
    ├── LanguageToggle.tsx       # EN/TH switch
    ├── Pagination.tsx
    └── GlassPanel.tsx           # Backdrop blur panel
```

### 5.4 Internationalization

- **UI labels**: next-intl with `messages/en.json` and `messages/th.json`
- **Article content**: LLM translation stored in `translations` table
- Public feed: user toggles UI language + views articles in EN or TH
- Translation Lab: always shows both languages side-by-side

---

## 6. Design System Implementation

### Color Tokens

| Token | Value | Use |
|-------|-------|-----|
| surface | #131317 | Base background |
| surface-container-lowest | #0e0e12 | Data wells, inputs |
| surface-container-low | #1b1b1f | Sidebar, cards |
| surface-container | #1f1f23 | Standard cards |
| surface-container-high | #2a2a2e | Active/elevated |
| surface-container-highest | #353439 | Deepest nesting |
| on-surface | #e4e1e7 | Primary text |
| on-surface-variant | #c4c6cc | Secondary text |
| primary | #bbc6e2 | CTAs, active states |
| primary-container | #0f1a2e | Gradient overlays |
| secondary | #4ae183 | Success, secure |
| secondary-container | #06bb63 | Success actions |
| tertiary | #ffb783 | Warnings, alerts |
| tertiary-container | #2e1300 | Warning backgrounds |
| error | #ffb4ab | Critical, breach |
| error-container | #93000a | Error backgrounds |
| outline | #8e9196 | Subtle elements |
| outline-variant | #44474c | Ghost borders (5-15% opacity) |

### Typography

| Use | Font | Weight | Size |
|-----|------|--------|------|
| Headlines, Display | Manrope | 600-800 | text-3xl to text-6xl |
| Body, Interface | Inter | 300-500 | text-sm to text-base |
| Labels, Metadata | Inter | 500-700 | text-xs / 10px, uppercase, tracking-widest |

### Design Rules

- **No divider lines** — containers defined by background color shifts only
- **No drop shadows on cards** — depth via tonal nesting layers
- **Editorial scale contrast** — large metrics paired with tiny uppercase labels
- **Ghost borders** — outline-variant at 5-10% opacity only (WCAG compliance)
- **Glassmorphism** — only on floating elements: backdrop-blur-xl + 60-80% opacity
- **Thai text** — line-height: 1.6 for Thai content
- **Status glow** — box-shadow with rgba glow for status indicators
- **Asymmetric grids** — 60/40 or 70/30 splits, not 50/50

### Key Libraries

| Purpose | Library |
|---------|---------|
| Framework | next@14 (App Router) |
| Styling | tailwindcss@4 + @tailwindcss/typography |
| Auth | @supabase/ssr + @supabase/supabase-js |
| i18n | next-intl |
| State | zustand |
| PDF | @react-pdf/renderer |
| Icons | lucide-react |
| Date | date-fns |
| RSS parsing | fast-xml-parser (Edge Function) |
| Fonts | @fontsource/manrope + @fontsource/inter |

---

## 7. Security & Data Flow

### Authentication Flow

1. User visits login page
2. Chooses email/password, Google, or GitHub
3. Supabase Auth handles OAuth flow → session cookie
4. Next.js middleware checks session on `/(protected)/*` routes
5. Fetches `profile.role` and enforces route permissions:
   - `/settings` → admin only
   - `/translation-lab` → analyst, admin
   - `/report/new` → analyst, admin
   - `/report-archive` → all authenticated

### API Key Security

- LLM API keys never exposed to client-side
- Admin enters keys via Settings UI
- Keys encrypted with pgcrypto before storing in `app_settings`
- Edge Functions decrypt keys at runtime
- RLS ensures only admin role can access `app_settings`

### Article Lifecycle

```
RSS Feed / Manual Input
        │
        ▼
   articles (NEW)
        │
        │ severity = critical/high?
        ├── YES → llm-translate (auto)
        ├── NO  → wait for "Translate" click (on-demand)
        │
        ▼
   translations (TRANSLATED)
        │
        │ Analyst review?
        ├── verified → is_verified = true
        │
        ▼
   Select articles for report
        │
        ▼
   report-gen Edge Function
        │
        ▼
   reports (GENERATED) + PDF → Supabase Storage
```

### Rate Limiting

| Layer | Protection |
|-------|-----------|
| Supabase RLS | DB-level access control per role |
| Edge Functions | Auth token check before every operation |
| LLM calls | Max 50 translations/day per user (configurable) |
| RSS fetch | Dedup by URL + cooldown per source |
| Public feed | Supabase built-in rate limiting |

### Environment Variables

```
# Vercel
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Supabase Edge Functions
SUPABASE_SERVICE_ROLE_KEY=

# Optional fallback (primary keys stored in DB encrypted)
GEMINI_API_KEY=
OPENROUTER_API_KEY=
```

---

## 8. Design Reference

UX/UI designs are located in `stitch_sentinel_intelligence_feed/`:

- `sentinel_core/DESIGN.md` — Full design system documentation
- `sentinel_intelligence_feed/code.html` + `screen.png` — Intelligence Feed
- `sentinel_translation_lab/code.html` + `screen.png` — Translation Lab
- `sentinel_report_archive/code.html` + `screen.png` — Report Archive
- `ciso_executive_report_template/code.html` + `screen.png` — Executive Report

Implementation must match these designs pixel-perfect following "The Sentinel's Lens" design philosophy.
