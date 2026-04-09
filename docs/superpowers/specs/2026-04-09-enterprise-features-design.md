# Enterprise Features Design Spec

**Date:** 2026-04-09
**Approach:** Modular Separation — new tables, routes, and pages separate from existing system
**Status:** Approved

---

## Feature 1: Enterprise News Report

Enterprise-grade report generation with customizable templates, AI-designed layouts, and PDF/DOCX export for executive and cybersecurity team presentations.

### Database Schema

#### enterprise_report_layouts

Stores preset and user-created visual layout configurations.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| name | TEXT NOT NULL | e.g. "Executive Dark", "SOC Technical" |
| description | TEXT | |
| is_preset | BOOLEAN DEFAULT false | true = built-in, false = user-created |
| layout_config | JSONB NOT NULL | Theme, colors, fonts, cover style, sections, logo |
| thumbnail_url | TEXT | Preview image URL |
| created_by | UUID FK → profiles | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**layout_config structure:**

```json
{
  "theme": "dark | light",
  "primary_color": "#1E3A5F",
  "accent_color": "#FF6B35",
  "font_heading": "Manrope",
  "font_body": "Inter",
  "cover_style": "minimal | branded | full-image",
  "logo_url": "https://...",
  "sections": [
    "cover", "executive_summary", "threat_landscape",
    "risk_matrix", "immediate_actions", "strategic_actions",
    "ioc_table", "references"
  ],
  "show_page_numbers": true,
  "show_header_footer": true,
  "classification_watermark": true
}
```

#### enterprise_reports

Main report table with dual-language content and layout reference.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| title | TEXT NOT NULL | |
| subtitle | TEXT | |
| report_type | TEXT NOT NULL | "executive", "incident", "weekly", or custom |
| classification | TEXT NOT NULL | TLP level |
| severity | TEXT | article_severity enum |
| layout_id | UUID FK → enterprise_report_layouts | Selected base layout |
| layout_config_override | JSONB | AI-modified overrides merged on top of layout |
| ai_design_prompt | TEXT | User's prompt for AI layout adjustment |
| content_en | JSONB | Structured report content (English) |
| content_th | JSONB | Structured report content (Thai) |
| content_prompt_template | TEXT | Prompt used to generate content |
| status | TEXT NOT NULL DEFAULT 'draft' | draft, generating, generated, reviewed, published |
| export_history | JSONB[] | Array of { format, exported_at, file_size } |
| created_by | UUID FK → profiles | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### enterprise_report_articles

Junction table linking reports to source articles with ordering.

| Column | Type | Description |
|--------|------|-------------|
| report_id | UUID FK → enterprise_reports | |
| article_id | UUID FK → articles | |
| display_order | INT NOT NULL DEFAULT 0 | Article order within report |
| PK | (report_id, article_id) | |

### API Routes

#### POST /api/enterprise-report/generate

Create and generate a new enterprise report.

**Request:**
```json
{
  "article_ids": ["uuid1", "uuid2"],
  "title": "Weekly Threat Intelligence Report",
  "report_type": "executive",
  "classification": "TLP:AMBER",
  "layout_id": "uuid",
  "ai_design_prompt": "ใช้โทนสีน้ำเงินเข้ม เน้น executive summary"  // optional
}
```

**Flow:**
1. Fetch layout_config from layout_id
2. If ai_design_prompt provided → LLM adjusts layout → store as layout_config_override
3. LLM generates content (EN) from articles + content prompt template
4. LLM translates content → content (TH)
5. Save enterprise_reports + junction table
6. Return report object

**Auth:** analyst or admin role required

#### GET /api/enterprise-report/[id]

Fetch report with articles and merged layout config (base + override).

#### PUT /api/enterprise-report/[id]

Update report title, content, layout override, reorder articles.

#### DELETE /api/enterprise-report/[id]

Soft delete (set status to 'archived' or hard delete).

#### POST /api/enterprise-report/[id]/export

Export report to PDF or DOCX.

**Request:**
```json
{ "format": "pdf" }
```

**PDF flow (server-side):**
- Render HTML template using merged layout_config (colors, fonts, sections, cover)
- Puppeteer generates PDF via `page.pdf()` with header/footer, page numbers
- Supports Thai font (Sarabun) + English font (Inter/Manrope)
- Return PDF buffer as download

**DOCX flow (client-side with API data):**
- Client calls `GET /api/enterprise-report/[id]` to get content JSON + merged layout_config
- Client uses `docx` library to build Word document locally (no server rendering)
- Heading styles, severity color coding, table of contents
- `file-saver` triggers browser download
- Client calls `PUT /api/enterprise-report/[id]` to append to export_history after successful generation

**Note:** The `POST /api/enterprise-report/[id]/export` endpoint is only used for PDF (server-side). DOCX is generated entirely client-side using data from the GET endpoint.

#### GET /api/enterprise-report/layouts

List all layouts (presets + user-created for current user).

#### POST /api/enterprise-report/layouts

Create custom layout.

**Request:**
```json
{
  "name": "Company Branded",
  "description": "With company logo and colors",
  "layout_config": { ... }
}
```

#### PUT /api/enterprise-report/layouts/[id]

Edit layout (only user-created, not presets).

#### POST /api/enterprise-report/ai-design

Preview AI layout adjustments without saving.

**Request:**
```json
{
  "layout_id": "uuid",
  "prompt": "เปลี่ยนเป็นสีแดงเข้ม เพิ่ม IOC table section"
}
```

**Returns:** Modified layout_config for preview before applying.

### UI Pages

#### /enterprise-report/new — Create Report (Wizard)

4-step wizard:
1. **Select Articles** — checkbox list with search/filter, severity badges, select count
2. **Choose Layout** — visual grid of layout presets/custom, thumbnail preview
3. **AI Design** (optional) — prompt input + live layout preview, skip button
4. **Preview & Generate** — final preview, confirm button, generation progress

**Components:**
- `ReportWizard.tsx` — 4-step wizard orchestrator with step indicators
- `ArticleSelector.tsx` — article checkbox list with search and severity filter
- `LayoutPicker.tsx` — visual grid of layout cards with selection
- `AIDesignPanel.tsx` — prompt input with layout preview panel

#### /enterprise-report/[id] — Report Viewer

Full styled report display with:
- Report rendered using merged layout_config (colors, fonts, cover, sections)
- Dual-language toggle (EN/TH)
- Export buttons: PDF, DOCX
- Edit button → inline editing of content
- Export history display

**Components:**
- `EnterpriseReportViewer.tsx` — styled report renderer
- `ReportExporter.tsx` — PDF/DOCX export buttons with progress
- `ReportPDFTemplate.tsx` — HTML template used by Puppeteer

#### Layout Manager (in Settings + Report Wizard)

- Browse all layouts with thumbnail previews
- Create new custom layout with visual config editor
- Edit colors, fonts, sections order, cover style, logo upload
- Accessible from Settings "Report Layouts" tab and during report creation step 2

**Components:**
- `LayoutEditor.tsx` — visual editor for layout_config properties

---

## Feature 2: Enterprise NEWS Watch List

Keyword monitoring system that watches incoming articles for specified keywords, auto-summarizes matches in Thai, and sends email alerts to designated recipients.

### Database Schema

#### watchlists

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| name | TEXT NOT NULL | e.g. "APT Thailand", "Ransomware Alert" |
| description | TEXT | |
| created_by | UUID FK → profiles | |
| notify_mode | TEXT NOT NULL DEFAULT 'realtime' | "realtime" or "batch" |
| batch_interval_minutes | INT DEFAULT 30 | Used when notify_mode = "batch" |
| summary_level | TEXT NOT NULL DEFAULT 'short' | "short" or "detailed" |
| email_recipients | TEXT[] NOT NULL | Array of email addresses |
| is_active | BOOLEAN DEFAULT true | |
| last_checked_at | TIMESTAMPTZ | Last scan timestamp |
| last_notified_at | TIMESTAMPTZ | Last email sent timestamp |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### watchlist_keywords

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| watchlist_id | UUID FK → watchlists ON DELETE CASCADE | |
| keyword | TEXT NOT NULL | e.g. "APT41", "ransomware" |
| match_mode | TEXT NOT NULL DEFAULT 'contains' | "exact", "contains", or "regex" |
| created_at | TIMESTAMPTZ | |
| UNIQUE | (watchlist_id, keyword) | |

#### watchlist_matches

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| watchlist_id | UUID FK → watchlists | |
| article_id | UUID FK → articles | |
| keyword_id | UUID FK → watchlist_keywords | |
| matched_keyword | TEXT NOT NULL | The keyword that matched |
| matched_in | TEXT NOT NULL | "title", "content", "tags", or "excerpt" |
| summary_th | TEXT | AI-generated Thai summary (cached) |
| notified_at | TIMESTAMPTZ | null = not yet emailed |
| created_at | TIMESTAMPTZ | |
| UNIQUE | (watchlist_id, article_id, keyword_id) | |

### Email Configuration

Stored in existing `app_settings` table with key `email_config`:

```json
{
  "provider": "resend",
  "api_key": "re_xxx...",
  "from_address": "alerts@sentinel-lens.com",
  "from_name": "Sentinel Lens Alerts",
  "smtp_config": {
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "user": "user@gmail.com",
    "pass": "app-password"
  }
}
```

### API Routes

#### GET /api/watchlists

List all watchlists for current user with keyword count and match count.

#### POST /api/watchlists

Create watchlist with keywords in one request.

**Request:**
```json
{
  "name": "APT Thailand",
  "description": "Monitor APT groups targeting Thailand",
  "notify_mode": "realtime",
  "summary_level": "detailed",
  "email_recipients": ["soc@company.com"],
  "keywords": [
    { "keyword": "APT41", "match_mode": "contains" },
    { "keyword": "APT32", "match_mode": "contains" },
    { "keyword": "Lazarus", "match_mode": "contains" }
  ]
}
```

#### GET /api/watchlists/[id]

Watchlist details with keywords and recent matches.

#### PUT /api/watchlists/[id]

Update watchlist settings, add/remove keywords.

#### DELETE /api/watchlists/[id]

Soft delete (is_active = false).

#### GET /api/watchlists/[id]/matches

Paginated match history with Thai summaries.

#### POST /api/watchlists/scan

Manual trigger: scan recent articles against all active watchlists. For testing or force scan.

### Matching & Notification Flow

#### Real-time (notify_mode = "realtime")

Triggered when a new article enters the system (RSS fetch or manual create):

1. Hook in POST /api/articles calls `matchWatchlists(article)`
2. Fetch all active watchlists with keywords
3. Check keyword match against article title, content, tags, excerpt:
   - `contains`: case-insensitive substring match
   - `exact`: exact word boundary match
   - `regex`: regex pattern match
4. For each match → insert into watchlist_matches
5. LLM generates Thai summary based on summary_level (short: 2-3 lines, detailed: 1-2 paragraphs + recommended actions)
6. Send email immediately via configured provider
7. Set notified_at timestamp

#### Batch (notify_mode = "batch")

Triggered by cron job POST /api/cron/watchlist-digest:

1. Runs every 5 minutes (via Vercel Cron or external scheduler)
2. Authenticated with CRON_SECRET env var
3. Finds batch watchlists where last_notified_at + batch_interval_minutes <= now
4. Collects unnotified matches (notified_at = null)
5. LLM generates combined Thai digest summary
6. Sends single digest email with all matches
7. Updates notified_at on all matches + last_notified_at on watchlist

### Email Templates

#### Short Summary Email

```
Subject: [Sentinel Lens] 🔴 พบข่าว Critical ตรง Watchlist "APT Thailand"

หัวข้อ: APT41 targets Thai banking sector
ระดับ: Critical
สรุป: พบกลุ่ม APT41 โจมตีระบบธนาคารไทย ใช้ช่องโหว่ใหม่...
อ่านต่อ: https://sentinel-lens.com/article/xxx
```

#### Detailed Summary Email

```
Subject: [Sentinel Lens] 🔴 รายงานเฝ้าระวัง "APT Thailand" — 2 ข่าวใหม่

── ข่าวที่ 1 ──
หัวข้อ: APT41 targets Thai banking sector
ระดับ: Critical | Keyword ที่ตรง: "APT41" (พบใน title)
สรุป: [AI สรุปภาษาไทย 1-2 paragraphs พร้อม recommended actions]
อ่านต่อ: https://sentinel-lens.com/article/xxx

── ข่าวที่ 2 ──
...

── แนวทางดำเนินการ ──
[AI สรุป recommended actions รวม]
```

### UI Pages

#### /watchlist — Watch List Dashboard

Overview of all watchlists:
- Stats cards: active lists, matches today, total keywords
- Watchlist cards with keyword tags, match count, notify mode indicator, active/paused status
- Quick actions: edit, pause/resume, delete
- "New Watch List" button

**Components:**
- `WatchlistDashboard.tsx` — main page with stats and list
- `WatchlistCard.tsx` — individual watchlist card

#### /watchlist/new and /watchlist/[id]/edit — Create / Edit

Form with:
- Name and description inputs
- Tag-style keyword input (type + Enter to add, click × to remove)
- Match mode selector per keyword (contains/exact/regex)
- Notification mode toggle (real-time / batch with interval selector)
- Summary level toggle (short / detailed)
- Email recipients input (tag-style, multiple addresses)
- Save button

**Components:**
- `WatchlistForm.tsx` — create/edit form
- `KeywordInput.tsx` — tag-style input with match mode dropdown
- `NotifyModeToggle.tsx` — real-time vs batch selector with interval

#### /watchlist/[id] — Match History

Timeline view of matched articles:
- Each match shows: article title, severity badge, matched keyword, matched location, time ago
- Thai summary (short or detailed depending on watchlist setting)
- Email delivery status (sent / pending)
- Link to full article
- "Resend Digest" button for manual re-notification

**Components:**
- `MatchTimeline.tsx` — timeline layout
- `MatchCard.tsx` — individual match entry

---

## Shared Infrastructure

### Email Utility (lib/email.ts)

- Primary: Resend SDK (`npm install resend`)
- Fallback: Nodemailer for SMTP (`npm install nodemailer`)
- Functions:
  - `sendEmail({ to, subject, html })` — single email
  - `sendDigestEmail({ to, subject, matches[] })` — batch digest
- HTML email templates with inline CSS (compatible with all email clients)
- Rate limiting: max 10 emails/minute to prevent spam

### Cron Job (/api/cron/watchlist-digest)

- Called by Vercel Cron or external scheduler every 5 minutes
- Checks batch watchlists that have reached their interval threshold
- Collects unnotified matches → generates digest → sends email
- Authenticated via CRON_SECRET environment variable

### Settings Page Additions

**New "Email" tab:**
- Provider selector: Resend / SendGrid / SMTP
- API key input (for Resend/SendGrid)
- SMTP config: host, port, secure toggle, user, password
- From address + from name
- "Send Test Email" button

**New "Report Layouts" tab:**
- Layout grid with preset and custom layouts
- Create, edit, delete custom layouts
- Visual config editor for colors, fonts, sections, cover style

### Sidebar Navigation Additions

```
📊 Enterprise Report    → /enterprise-report
👁️ Watch List           → /watchlist
```

Added to sidebar nav items after existing entries.

### New Dependencies

| Package | Purpose |
|---------|---------|
| resend | Email API (primary provider) |
| nodemailer | SMTP fallback email |
| puppeteer-core | Server-side PDF generation |
| @chromium/puppeteer-core | Chromium binary for Puppeteer |
| docx | Client-side DOCX generation |
| file-saver | Client-side file download |

### Database Migration (005_add_enterprise_features.sql)

- CREATE TABLE enterprise_report_layouts (with RLS)
- CREATE TABLE enterprise_reports (with RLS)
- CREATE TABLE enterprise_report_articles (with RLS)
- CREATE TABLE watchlists (with RLS)
- CREATE TABLE watchlist_keywords (with RLS)
- CREATE TABLE watchlist_matches (with RLS)
- INSERT 3 preset layouts: Executive Dark, SOC Technical, Minimal Light
- CREATE INDEX on watchlist_keywords(keyword)
- CREATE INDEX on watchlist_matches(watchlist_id, notified_at)
- RLS policies: user-scoped for watchlists, role-based for enterprise reports (analyst+admin)

### Environment Variables

| Variable | Description |
|----------|-------------|
| CRON_SECRET | Auth key for cron endpoints |
| RESEND_API_KEY | Resend API key (alternative to app_settings) |

### Theme Compliance

All new pages and components use the existing MD3 CSS variable system:
- `var(--primary)`, `var(--surface)`, `var(--on-surface)`, etc.
- Dark/light mode via `html.dark` / `html.light` class
- Font families: Manrope (headings), Inter (body)
- Consistent with existing Tailwind config and component patterns
