# Manual News Analysis — Design Spec

**Date:** 2026-04-08
**Status:** Approved

## Overview

Allow Admin/Analyst users to manually add articles to the Intelligence Feed by pasting a URL. The system scrapes the page content, uses the configured LLM (Gemini/OpenRouter) to analyze severity, generate an excerpt summary, and suggest tags. The user reviews and edits all AI-generated fields before saving.

## User Flow

1. User clicks "New Analysis" button in Sidebar
2. Opens `/article/new` (protected: admin/analyst only)
3. **Step 1 — URL Input**: User pastes a URL and clicks "Analyze"
4. System scrapes page content + sends to LLM for analysis (loading state shown)
5. **Step 2 — Review & Edit**: Form fields are auto-populated with AI results
6. User reviews/edits any field (title, content, excerpt, severity, tags, author)
7. User clicks "Save to Feed"
8. Article is saved with `is_manual: true`, `created_by: user.id`, `source_id: null`
9. Redirect to the new article's detail page `/article/[id]`

## Files to Create

### 1. `src/app/api/analyze-url/route.ts` — URL Analysis API

**Method:** POST
**Auth:** Admin/Analyst only
**Input:** `{ url: string }`

**Process:**
1. Validate URL format
2. Fetch HTML from URL (reuse scraping patterns from `rss-fetch/route.ts`):
   - Extract `<title>` or `og:title`
   - Extract article body text (strip HTML tags)
   - Fallback to `meta description` / `og:description` for short content
   - Extract `og:image` for image_url
   - Extract author from `meta[name="author"]` if available
3. Read LLM settings from `app_settings` (provider, model, API key)
4. Send content to LLM with system prompt:
   - Classify severity: critical/high/medium/low/info with reasoning
   - Generate 2-3 sentence excerpt summary
   - Suggest up to 5 tags from known categories: Ransomware, Phishing, APT, Zero-Day, Malware, Vulnerability, Data Breach, DDoS, Cloud Security, IoT, Supply Chain, Cryptocurrency, Critical Infrastructure, Healthcare, Financial
5. Parse LLM JSON response

**Output:**
```json
{
  "title": "string",
  "content": "string (full scraped text)",
  "excerpt": "string (AI summary)",
  "severity": "critical|high|medium|low|info",
  "severity_reason": "string (AI explanation)",
  "tags": ["string"],
  "author": "string|null",
  "image_url": "string|null",
  "url": "string (original URL)"
}
```

**Error cases:**
- Invalid URL format → 400
- Failed to fetch/scrape → 422 with message
- LLM API error → 500 with fallback (return scraped content without AI analysis, let user fill manually)

### 2. `src/app/api/articles/route.ts` — Article Create API

**Method:** POST
**Auth:** Admin/Analyst only
**Input:** Article fields (title, content, excerpt, severity, tags, author, url, image_url)

**Process:**
1. Validate required fields (title, content, severity)
2. Insert into `articles` table:
   - `is_manual: true`
   - `created_by: user.id`
   - `source_id: null`
   - `status: "new"`
   - `published_at: new Date().toISOString()`
3. Log to audit_logs: action="create", entity_type="article"

**Output:** `{ success: true, article_id: "uuid" }`

### 3. `src/app/(protected)/article/new/page.tsx` — New Analysis Page

Client component with two-step form.

**Step 1 — URL Input:**
- Large text input with placeholder "Paste article URL here..."
- "Analyze" button with loading spinner during scrape+AI
- Error message display area
- Cancel link back to feed

**Step 2 — Review & Edit Form:**
After successful analysis, display editable form:

| Field | Component | Source |
|-------|-----------|--------|
| Title | `<input>` | AI extracted |
| Content | `<textarea>` tall (min 12 rows) | Scraped text |
| Excerpt | `<textarea>` short (3 rows) | AI generated |
| Severity | `<select>` dropdown + AI reasoning shown below | AI classified |
| Tags | Clickable pills — remove by click, add via input | AI suggested |
| Author | `<input>` | Extracted or empty |
| Reference URL | Read-only display with link icon | Original URL |
| Image | Preview thumbnail if og:image found | Extracted |

**Buttons:**
- "Save to Feed" (primary) — POST to `/api/articles`, redirect on success
- "Re-analyze" (secondary) — re-run AI analysis on same URL
- "Cancel" — navigate back to feed

**States:**
- Idle (Step 1 showing)
- Analyzing (loading spinner, disabled inputs)
- Ready (Step 2 form populated)
- Saving (submit disabled, spinner on save button)
- Error (error message with retry option)

### 4. `src/components/layout/Sidebar.tsx` — Update

Change the "New Analysis" `<Button>` to a `<Link href="/article/new">` wrapped in the same styling.

## LLM Prompt Design

```
You are a cybersecurity threat intelligence analyst. Analyze the following article content and provide a JSON response.

Article content:
{scraped_content}

Respond with valid JSON only:
{
  "severity": "critical|high|medium|low|info",
  "severity_reason": "Brief explanation of why this severity level",
  "excerpt": "2-3 sentence summary of the key threat/finding",
  "tags": ["up to 5 tags from: Ransomware, Phishing, APT, Zero-Day, Malware, Vulnerability, Data Breach, DDoS, Cloud Security, IoT, Supply Chain, Cryptocurrency, Critical Infrastructure, Healthcare, Financial"]
}
```

## Auth & Permissions

- Route `/article/new` requires authentication (handled by existing middleware)
- API endpoints check user role: admin or analyst only
- Viewer role gets 403 Forbidden
- The `is_manual` flag and `created_by` field provide attribution and auditability

## Edge Cases

- **URL unreachable:** Show error "Could not fetch content from this URL. Please check the URL and try again."
- **Very short content (<100 chars):** Show warning, allow user to paste content manually into the content field
- **LLM fails:** Still show scraped content in form, but severity/excerpt/tags left empty for user to fill
- **Duplicate URL:** Check if URL already exists in articles table. If so, show warning "This URL has already been analyzed" with link to existing article. User can still proceed if they want.
- **Non-English content:** LLM should still attempt analysis. User can manually adjust.

## Design Patterns

- Follow existing form patterns from `/report/new` page
- Use project CSS variables (var(--color-surface), etc.)
- Material Symbols icons consistent with rest of app
- Card component for form sections
- Responsive: works on mobile with stacked layout
