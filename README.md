# Sentinel Lens

Bilingual cybersecurity intelligence platform for threat monitoring, analysis, and reporting.

Built with **Next.js 14**, **Supabase**, and **LLM-powered analysis** (Gemini / OpenRouter).

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss)

---

## Features

### Intelligence Feed
- Aggregates cybersecurity news from configurable RSS sources
- AI-powered article analysis with severity classification (critical / high / medium / low / info)
- Auto-tagging and article correlation via shared tags
- Real-time feed updates with Supabase Realtime

### AI Chat Assistant
- Context-aware chat that searches platform articles first
- Falls back to general cybersecurity expertise
- Bilingual responses (English & Thai)

### Manual URL Analysis
- Submit any URL for AI-powered threat analysis
- SSRF protection with private IP/hostname blocking
- Generates structured articles with severity, tags, and excerpts

### Translation Lab
- One-click Thai translation of articles via LLM
- Batch translation support
- Side-by-side source and translated content

### IOC Management
- Track Indicators of Compromise: IP, domain, MD5/SHA256 hash, URL, email
- Search, filter by type/severity, and link IOCs to articles
- Duplicate detection on creation

### Report Generation
- Executive, incident, and weekly report types
- TLP classification (WHITE / GREEN / AMBER / RED)
- PDF export with styled formatting
- Customizable report templates

### Analytics Dashboard
- Severity distribution and trend analysis
- Source performance metrics
- Translation coverage tracking
- Parallel count queries for fast loading

### Notifications & Webhooks
- Auto-notifications for critical/high severity articles
- Webhook dispatching to Slack, Discord, LINE, or custom endpoints
- Saved search alerts with severity filtering

### Security & Access Control
- Row Level Security (RLS) on all tables
- Role-based access: admin, analyst, viewer
- Zod validation on all API inputs
- XSS prevention, PostgREST injection protection

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Database | Supabase (PostgreSQL + Auth + Realtime) |
| Styling | Tailwind CSS 3.4 + Material Design 3 color system |
| Icons | lucide-react |
| State | Zustand |
| Validation | Zod |
| i18n | next-intl (EN / TH) |
| Fonts | Manrope (headings) + Inter (body) |
| LLM | Gemini API / OpenRouter |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project (local or cloud)

### Installation

```bash
git clone https://github.com/zildjiean/Sentinel-Lens.git
cd Sentinel-Lens
npm install
```

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Optional — can also be configured in Settings page
GEMINI_API_KEY=your_gemini_key
OPENROUTER_API_KEY=your_openrouter_key
```

### Database Setup

Run migrations in order on your Supabase SQL Editor:

```
supabase/migrations/001_init.sql
supabase/migrations/002_add_bookmarks_audit_notifications.sql
supabase/migrations/003_add_report_templates.sql
supabase/migrations/004_add_webhooks_saved_searches_ioc.sql
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login, OAuth callback
│   ├── (public)/         # Feed, article detail
│   ├── (protected)/      # Dashboard pages (requires auth)
│   │   ├── analytics/
│   │   ├── audit-log/
│   │   ├── bookmarks/
│   │   ├── iocs/
│   │   ├── report/
│   │   ├── report-archive/
│   │   ├── settings/
│   │   ├── system-health/
│   │   └── translation-lab/
│   └── api/              # 21 API routes
├── components/
│   ├── ui/               # Badge, Card, ErrorBoundary, Skeleton, etc.
│   ├── feed/             # ArticleCard, FilteredFeed, RelatedArticles
│   ├── layout/           # Sidebar, TopBar
│   ├── report/           # ReportViewer, ReportCard, RiskMatrix
│   ├── translation/      # SourcePane, TargetPane, Toolbar
│   ├── analytics/        # AnalyticsDashboard
│   ├── chat/             # ChatBubble (lazy-loaded)
│   └── settings/         # LLMConfig, RSSManager, UserManager
├── lib/
│   ├── supabase/         # Client, server, middleware helpers
│   ├── hooks/            # useRealtimeFeed
│   ├── store/            # Zustand language store
│   ├── audit.ts          # Audit logging utility
│   └── webhooks.ts       # Webhook dispatcher
└── messages/             # i18n translations (EN / TH)
```

---

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/articles` | List and create articles |
| GET/PUT/DELETE | `/api/articles/[id]` | Article CRUD |
| GET | `/api/articles/[id]/related` | Related articles by shared tags |
| POST | `/api/analyze-url` | AI-powered URL analysis |
| POST | `/api/chat` | AI chat with article search |
| POST | `/api/translate` | Translate single article |
| POST | `/api/batch-translate` | Bulk translation |
| POST | `/api/auto-tag` | AI auto-tagging |
| GET/POST/DELETE | `/api/iocs` | IOC management |
| POST | `/api/report-gen` | Generate reports |
| GET | `/api/article-pdf` | PDF export |
| POST/DELETE | `/api/bookmarks` | Bookmark management |
| POST | `/api/export` | Data export |
| GET/POST | `/api/webhooks` | Webhook configuration |
| GET/POST | `/api/saved-searches` | Saved search alerts |
| POST | `/api/rss-fetch` | Manual RSS fetch |
| POST | `/api/cron/rss-fetch` | Scheduled RSS fetch |
| GET | `/api/health` | Health check |
| POST | `/api/revalidate` | On-demand ISR revalidation |
| GET/POST | `/api/notifications` | Notification management |
| POST | `/api/audit-log` | Audit event logging |

---

## Database Schema

**Core tables:** profiles, articles, translations, rss_sources, reports, report_articles

**Feature tables:** bookmarks, iocs, webhook_configs, saved_searches, notifications, audit_logs, report_templates, app_settings

**Security:** RLS enabled on all tables with role-based policies (admin / analyst / viewer)

---

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```

---

## License

This project is private and not licensed for public distribution.
