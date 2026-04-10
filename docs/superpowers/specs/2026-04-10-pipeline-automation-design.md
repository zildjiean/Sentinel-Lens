# End-to-End Pipeline Automation — Design Spec

## Goal

Create a fully automated pipeline that runs every hour via Vercel Cron:
**RSS Fetch → Auto-Translate → Daily Highlights → Watchlist Scan → Alert Dispatch**

All steps execute sequentially in a single orchestrator endpoint. Each step logs results and is fault-tolerant (one step failing doesn't block the next).

## Architecture

```
Vercel Cron (every hour, 0 * * * *)
  │
  ▼
GET /api/cron/pipeline (CRON_SECRET protected)
  │
  ├── Step 1: RSS Fetch
  │   Call rss-fetch internally with ?skipAutoTranslate=true
  │   Returns: { new_articles, skipped_duplicates, ads_filtered }
  │
  ├── Step 2: Auto-Translate
  │   Call autoTranslateBatch() shared function directly (no HTTP)
  │   Returns: { translated, failed, total }
  │
  ├── Step 3: Daily Highlights
  │   Call generateHighlights() directly, skip cache, insert fresh row
  │   Returns: { has_highlights, highlights_count }
  │
  ├── Step 4: Watchlist Scan
  │   Call scanWatchlists() shared function directly (no auth check)
  │   Returns: { articles_scanned, total_matches, notifications_sent }
  │
  ├── Step 5: Watchlist Digest
  │   Call digest logic for batch-mode watchlists
  │   Returns: { digests_sent }
  │
  └── Audit Log: Insert pipeline execution summary
```

## File Changes

### New Files

| File | Purpose |
|------|---------|
| `src/app/api/cron/pipeline/route.ts` | Pipeline orchestrator — GET handler with CRON_SECRET |
| `src/lib/translation/auto-translate.ts` | Shared `autoTranslateBatch(supabase)` function |
| `src/lib/watchlist/scanner.ts` | Shared `scanWatchlists(supabase)` function |

### Modified Files

| File | Change |
|------|--------|
| `src/app/api/rss-fetch/route.ts` | Read `skipAutoTranslate` query param, skip fire-and-forget when true |
| `src/app/api/auto-translate/route.ts` | Import and delegate to shared `autoTranslateBatch()` |
| `src/app/api/watchlists/scan/route.ts` | Import and delegate to shared `scanWatchlists()` |
| `vercel.json` | Add cron schedule |

## Detailed Design

### 1. Pipeline Orchestrator (`/api/cron/pipeline/route.ts`)

- **Method:** GET (Vercel Cron only sends GET)
- **Auth:** `CRON_SECRET` via `Authorization: Bearer <secret>` header
- **Max Duration:** 300s (Vercel Pro)
- **Flow:**
  1. Verify CRON_SECRET
  2. Execute each step with individual try-catch
  3. Collect results from all steps into a summary object
  4. Insert audit log with full pipeline summary
  5. Return JSON summary

```ts
interface PipelineResult {
  step: string;
  status: "success" | "skipped" | "error";
  duration_ms: number;
  data: Record<string, unknown>;
  error?: string;
}
```

Each step returns a `PipelineResult`. If a step throws, catch it, record error, continue to next step.

### 2. Shared Auto-Translate Function (`src/lib/translation/auto-translate.ts`)

Extract the core logic from `src/app/api/auto-translate/route.ts` into:

```ts
export async function autoTranslateBatch(supabase: SupabaseClient): Promise<{
  translated: number;
  failed: number;
  total: number;
}>
```

The HTTP route handler (`auto-translate/route.ts`) becomes a thin wrapper:
- Verify secret
- Create supabase client
- Call `autoTranslateBatch(supabase)`
- Return JSON response

### 3. Shared Watchlist Scanner (`src/lib/watchlist/scanner.ts`)

Extract core logic from `src/app/api/watchlists/scan/route.ts` into:

```ts
export async function scanWatchlists(supabase: SupabaseClient): Promise<{
  articles_scanned: number;
  watchlists_scanned: number;
  total_matches: number;
  notifications_sent: number;
}>
```

The HTTP route handler becomes a thin wrapper:
- Auth check (user must be analyst/admin)
- Call `scanWatchlists(supabase)`
- Return JSON response

### 4. RSS Fetch — skipAutoTranslate param

In `src/app/api/rss-fetch/route.ts`:

```ts
export async function POST(request: Request) {
  const url = new URL(request.url);
  const skipAutoTranslate = url.searchParams.get("skipAutoTranslate") === "true";
  
  // ... existing fetch logic ...
  
  // Only fire-and-forget auto-translate if NOT called from pipeline
  if (totalNew > 0 && !skipAutoTranslate) {
    fetch(...).catch(() => {});
  }
  
  return NextResponse.json({ ... });
}
```

Pipeline calls: `fetch("/api/rss-fetch?skipAutoTranslate=true", ...)`
Manual button: `fetch("/api/rss-fetch", ...)` — still auto-translates as before

### 5. Daily Highlights in Pipeline

The pipeline calls `generateHighlights()` from `src/lib/daily-highlights/generator.ts` directly (already exported). Then inserts the result into `daily_highlights` table, replacing any existing row for today. This bypasses the 4-hour cache used by the GET endpoint.

### 6. Watchlist Digest in Pipeline

After watchlist scan, the pipeline checks for batch-mode watchlists with unnotified matches and dispatches digest emails. This reuses the existing logic from `src/app/api/cron/watchlist-digest/route.ts` — extract into a shared function or call the essential parts inline.

Actually, to keep it simple: the pipeline can call the watchlist-digest endpoint via internal HTTP (same pattern as cron/rss-fetch calls rss-fetch). This avoids duplicating the complex digest email logic.

### 7. Vercel Cron Configuration

```json
{
  "framework": "nextjs",
  "crons": [
    {
      "path": "/api/cron/pipeline",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Note:** Vercel Hobby plan supports only daily crons. Vercel Pro supports hourly. If on Hobby, the schedule will be automatically adjusted to `0 0 * * *` (once per day).

### 8. Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `CRON_SECRET` | Vercel Cron authentication | Yes (for production) |
| `AUTO_TRANSLATE_SECRET` | Already exists | No change |

Vercel automatically sets `CRON_SECRET` and sends it in the Authorization header for cron requests.

## Error Handling

- Each pipeline step runs in its own try-catch
- If Step 1 (RSS fetch) fails, Steps 2-5 still run (they'll process any previously unfetched articles)
- If Step 2 (translate) fails, Steps 3-5 still run (highlights use whatever translations exist)
- All errors are logged in the pipeline result and audit log
- The pipeline always returns 200 with the summary — individual step errors are in the response body

## Audit Log Entry

```ts
{
  user_id: null, // system action
  action: "cron_pipeline",
  entity_type: "system",
  details: {
    trigger: "vercel_cron",
    duration_ms: totalDuration,
    steps: PipelineResult[],
    summary: {
      new_articles: number,
      translated: number,
      highlights: number,
      matches: number,
      alerts: number,
    }
  }
}
```

## Existing Cron Routes

The existing `/api/cron/rss-fetch` and `/api/cron/watchlist-digest` routes remain functional for backward compatibility and manual testing. The new pipeline replaces their scheduled execution — only the pipeline route is registered in `vercel.json`.

## Testing Strategy

- Unit tests for `autoTranslateBatch()` and `scanWatchlists()` shared functions
- Integration: manually call `GET /api/cron/pipeline` with CRON_SECRET header
- Verify audit log entry after pipeline run
- Verify each step's result in the response JSON
