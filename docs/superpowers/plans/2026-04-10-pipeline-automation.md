# End-to-End Pipeline Automation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a fully automated hourly pipeline: RSS Fetch → Auto-Translate → Daily Highlights → Watchlist Scan → Alert Dispatch, triggered by Vercel Cron.

**Architecture:** Single pipeline orchestrator endpoint (`/api/cron/pipeline`) that calls shared functions directly (no HTTP for internal steps). Each step has independent try-catch. Existing route handlers become thin wrappers around shared functions.

**Tech Stack:** Next.js API routes, Supabase, Vercel Cron

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/lib/translation/auto-translate.ts` (new) | Shared `autoTranslateBatch()` function |
| `src/lib/watchlist/scanner.ts` (new) | Shared `scanWatchlists()` function |
| `src/app/api/cron/pipeline/route.ts` (new) | Pipeline orchestrator with 5 steps |
| `src/app/api/auto-translate/route.ts` (modify) | Thin wrapper around shared function |
| `src/app/api/watchlists/scan/route.ts` (modify) | Thin wrapper around shared function |
| `src/app/api/rss-fetch/route.ts` (modify) | Add `skipAutoTranslate` query param |
| `vercel.json` (modify) | Add cron schedule |

---

### Task 1: Extract Auto-Translate Shared Function

**Files:**
- Create: `src/lib/translation/auto-translate.ts`
- Modify: `src/app/api/auto-translate/route.ts`

- [ ] **Step 1: Create the shared auto-translate function**

```ts
// src/lib/translation/auto-translate.ts

import { createClient } from "@/lib/supabase/server";
import { translateArticle } from "@/lib/translation/translator";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface AutoTranslateResult {
  translated: number;
  failed: number;
  total: number;
}

export async function autoTranslateBatch(supabase: SupabaseClient): Promise<AutoTranslateResult> {
  // Query untranslated articles
  const { data: articles, error: queryError } = await supabase
    .from("articles")
    .select("id, title, content, excerpt, url")
    .eq("status", "new")
    .order("published_at", { ascending: false })
    .limit(20);

  if (queryError) {
    throw new Error(`Query failed: ${queryError.message}`);
  }

  if (!articles || articles.length === 0) {
    return { translated: 0, failed: 0, total: 0 };
  }

  // Filter out articles that already have translations
  const articleIds = articles.map((a) => a.id);
  const { data: existingTranslations } = await supabase
    .from("translations")
    .select("article_id")
    .in("article_id", articleIds);

  const translatedIds = new Set(existingTranslations?.map((t) => t.article_id) || []);
  const untranslated = articles.filter((a) => !translatedIds.has(a.id));

  if (untranslated.length === 0) {
    return { translated: 0, failed: 0, total: 0 };
  }

  let translated = 0;
  let failed = 0;

  for (const article of untranslated) {
    try {
      const result = await translateArticle(
        {
          title: article.title,
          content: article.content,
          excerpt: article.excerpt,
          url: article.url,
        },
        supabase
      );

      const { error: insertError } = await supabase.from("translations").insert({
        article_id: article.id,
        title_th: result.title_th,
        content_th: result.content_th,
        excerpt_th: result.excerpt_th,
        provider: result.provider,
        model: result.model,
        confidence: result.confidence,
        token_usage: result.token_usage,
      });

      if (insertError) {
        console.warn(`Auto-translate insert failed for article ${article.id}:`, insertError.message);
        failed++;
        continue;
      }

      await supabase
        .from("articles")
        .update({ status: "translated" })
        .eq("id", article.id);

      translated++;
    } catch (err) {
      console.warn(
        `Auto-translate failed for article ${article.id}:`,
        err instanceof Error ? err.message : String(err)
      );
      failed++;
    }
  }

  return { translated, failed, total: untranslated.length };
}
```

- [ ] **Step 2: Refactor auto-translate route to use shared function**

Replace the entire content of `src/app/api/auto-translate/route.ts` with:

```ts
// src/app/api/auto-translate/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { autoTranslateBatch } from "@/lib/translation/auto-translate";

export const maxDuration = 300;

export async function POST(request: Request) {
  // Verify internal secret if configured
  const body = await request.json().catch(() => ({}));
  const expectedSecret = process.env.AUTO_TRANSLATE_SECRET;
  if (expectedSecret && body.secret !== expectedSecret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const supabase = await createClient();
    const result = await autoTranslateBatch(supabase);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add src/lib/translation/auto-translate.ts src/app/api/auto-translate/route.ts
git commit -m "refactor: extract autoTranslateBatch shared function"
```

---

### Task 2: Extract Watchlist Scanner Shared Function

**Files:**
- Create: `src/lib/watchlist/scanner.ts`
- Modify: `src/app/api/watchlists/scan/route.ts`

- [ ] **Step 1: Create the shared scanner function**

```ts
// src/lib/watchlist/scanner.ts

import { createClient } from "@/lib/supabase/server";
import { matchArticleAgainstKeywords } from "@/lib/watchlist/matcher";
import { summarizeInThai } from "@/lib/watchlist/summarizer";
import { sendEmail } from "@/lib/email";
import { buildSingleMatchEmail } from "@/lib/watchlist/email-templates";
import type { WatchlistWithKeywords } from "@/lib/types/enterprise";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface ScanResult {
  articles_scanned: number;
  watchlists_scanned: number;
  total_matches: number;
  notifications_sent: number;
}

export async function scanWatchlists(supabase: SupabaseClient): Promise<ScanResult> {
  // 1. Fetch all active watchlists with keywords
  const { data: watchlists, error: wlError } = await supabase
    .from("watchlists")
    .select("*, watchlist_keywords(*)")
    .eq("is_active", true);

  if (wlError) {
    throw new Error(`Watchlist query failed: ${wlError.message}`);
  }

  const activeWatchlists = (watchlists ?? []) as WatchlistWithKeywords[];

  // 2. Fetch articles from last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: articles, error: artError } = await supabase
    .from("articles")
    .select("id, title, content, excerpt, tags, severity, source_url, published_at, url")
    .gte("published_at", since);

  if (artError) {
    throw new Error(`Article query failed: ${artError.message}`);
  }

  const recentArticles = articles ?? [];

  let totalMatches = 0;
  let notificationsSent = 0;

  // 3. For each article x each watchlist, run matching
  for (const watchlist of activeWatchlists) {
    const keywords = watchlist.watchlist_keywords ?? [];
    if (keywords.length === 0) continue;

    for (const article of recentArticles) {
      const matchResults = matchArticleAgainstKeywords(article, keywords);
      if (matchResults.length === 0) continue;

      // 4. Insert matches — ON CONFLICT DO NOTHING
      const matchRows = matchResults.map((m) => ({
        watchlist_id: watchlist.id,
        article_id: article.id,
        keyword_id: m.keyword_id,
        matched_keyword: m.matched_keyword,
        matched_in: m.matched_in,
      }));

      const { data: insertedMatches } = await supabase
        .from("watchlist_matches")
        .upsert(matchRows, {
          onConflict: "watchlist_id,article_id,keyword_id",
          ignoreDuplicates: true,
        })
        .select("id, keyword_id, matched_keyword, matched_in");

      totalMatches += matchResults.length;

      // 5. For realtime watchlists: summarize + send email + set notified_at
      if (
        watchlist.notify_mode === "realtime" &&
        watchlist.email_recipients?.length > 0 &&
        insertedMatches &&
        insertedMatches.length > 0
      ) {
        const firstMatch = insertedMatches[0];

        let summaryTh: string | null = null;
        try {
          summaryTh = await summarizeInThai({
            title: article.title,
            content: article.content ?? null,
            excerpt: article.excerpt ?? null,
            severity: article.severity,
            level: watchlist.summary_level ?? "short",
            supabase,
          });
        } catch (err) {
          console.error("[scan] summarizeInThai failed:", err);
        }

        const articleUrl =
          article.url || article.source_url
            ? String(article.url ?? article.source_url)
            : undefined;

        const { subject, html } = buildSingleMatchEmail({
          watchlistName: watchlist.name,
          article: {
            id: article.id,
            title: article.title,
            severity: article.severity,
            excerpt: article.excerpt ?? null,
            source_url: article.source_url ?? null,
            published_at: article.published_at ?? null,
          },
          matchedKeyword: firstMatch.matched_keyword,
          matchedIn: firstMatch.matched_in,
          summaryTh,
          articleUrl,
        });

        const emailResult = await sendEmail({
          to: watchlist.email_recipients,
          subject,
          html,
        });

        if (emailResult.success) {
          notificationsSent++;

          const notifiedAt = new Date().toISOString();
          await supabase
            .from("watchlist_matches")
            .update({ notified_at: notifiedAt, summary_th: summaryTh })
            .in(
              "id",
              insertedMatches.map((m: { id: string }) => m.id)
            );
        }
      }
    }
  }

  return {
    articles_scanned: recentArticles.length,
    watchlists_scanned: activeWatchlists.length,
    total_matches: totalMatches,
    notifications_sent: notificationsSent,
  };
}
```

- [ ] **Step 2: Refactor watchlist scan route to use shared function**

Replace the entire content of `src/app/api/watchlists/scan/route.ts` with:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scanWatchlists } from "@/lib/watchlist/scanner";

export async function POST() {
  const supabase = await createClient();

  // Auth check — analyst or admin required
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role === "viewer") {
    return NextResponse.json(
      { error: "Forbidden. Analyst or Admin role required." },
      { status: 403 }
    );
  }

  try {
    const result = await scanWatchlists(supabase);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add src/lib/watchlist/scanner.ts src/app/api/watchlists/scan/route.ts
git commit -m "refactor: extract scanWatchlists shared function"
```

---

### Task 3: Add skipAutoTranslate to RSS Fetch

**Files:**
- Modify: `src/app/api/rss-fetch/route.ts:255-264`

- [ ] **Step 1: Add skipAutoTranslate query param check**

In `src/app/api/rss-fetch/route.ts`, replace the fire-and-forget block (lines 255-264):

```ts
  // Fire-and-forget: trigger auto-translation for new articles
  if (totalNew > 0) {
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    fetch(`${protocol}://${host}/api/auto-translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: process.env.AUTO_TRANSLATE_SECRET || "" }),
    }).catch(() => {}); // fire-and-forget, errors are logged inside auto-translate
  }
```

With:

```ts
  // Fire-and-forget: trigger auto-translation for new articles
  // Skip when called from pipeline (pipeline handles translation itself)
  const url = new URL(request.url);
  const skipAutoTranslate = url.searchParams.get("skipAutoTranslate") === "true";

  if (totalNew > 0 && !skipAutoTranslate) {
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    fetch(`${protocol}://${host}/api/auto-translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: process.env.AUTO_TRANSLATE_SECRET || "" }),
    }).catch(() => {}); // fire-and-forget, errors are logged inside auto-translate
  }
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/rss-fetch/route.ts
git commit -m "feat: add skipAutoTranslate param to rss-fetch for pipeline use"
```

---

### Task 4: Pipeline Orchestrator

**Files:**
- Create: `src/app/api/cron/pipeline/route.ts`

- [ ] **Step 1: Create the pipeline orchestrator**

```ts
// src/app/api/cron/pipeline/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { autoTranslateBatch } from "@/lib/translation/auto-translate";
import { generateHighlights } from "@/lib/daily-highlights/generator";
import { scanWatchlists } from "@/lib/watchlist/scanner";

export const maxDuration = 300;

interface StepResult {
  step: string;
  status: "success" | "skipped" | "error";
  duration_ms: number;
  data: Record<string, unknown>;
  error?: string;
}

async function runStep(
  name: string,
  fn: () => Promise<Record<string, unknown>>
): Promise<StepResult> {
  const start = Date.now();
  try {
    const data = await fn();
    return {
      step: name,
      status: "success",
      duration_ms: Date.now() - start,
      data,
    };
  } catch (err) {
    return {
      step: name,
      status: "error",
      duration_ms: Date.now() - start,
      data: {},
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function GET(request: Request) {
  const pipelineStart = Date.now();

  // Verify CRON_SECRET
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const steps: StepResult[] = [];

  // --- Step 1: RSS Fetch ---
  const rssFetchResult = await runStep("rss_fetch", async () => {
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const fetchUrl = `${protocol}://${host}/api/rss-fetch?skipAutoTranslate=true`;

    const res = await fetch(fetchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: request.headers.get("cookie") || "",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`RSS fetch returned ${res.status}: ${text}`);
    }

    return await res.json();
  });
  steps.push(rssFetchResult);

  // --- Step 2: Auto-Translate ---
  const translateResult = await runStep("auto_translate", async () => {
    const result = await autoTranslateBatch(supabase);
    return result as unknown as Record<string, unknown>;
  });
  steps.push(translateResult);

  // --- Step 3: Daily Highlights ---
  const highlightsResult = await runStep("daily_highlights", async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recentArticles } = await supabase
      .from("articles")
      .select("id, title, severity, excerpt, tags, published_at, url")
      .gte("published_at", since)
      .order("published_at", { ascending: false })
      .limit(30);

    const articlesForAI = (recentArticles || []).map((a) => ({
      id: a.id,
      title: a.title,
      severity: a.severity || "low",
      tags: a.tags || [],
      excerpt: a.excerpt,
      published_at: a.published_at,
    }));

    const highlightsData = await generateHighlights(articlesForAI, supabase);

    // Save to DB (force fresh, bypass cache)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000);

    await supabase.from("daily_highlights").insert({
      highlights_data: highlightsData,
      article_count: articlesForAI.length,
      generated_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      created_by: null,
    });

    // Clean up expired rows
    await supabase
      .from("daily_highlights")
      .delete()
      .lt("expires_at", new Date().toISOString());

    return {
      has_highlights: highlightsData.has_highlights,
      highlights_count: highlightsData.highlights.length,
      articles_analyzed: articlesForAI.length,
    };
  });
  steps.push(highlightsResult);

  // --- Step 4: Watchlist Scan ---
  const scanResult = await runStep("watchlist_scan", async () => {
    const result = await scanWatchlists(supabase);
    return result as unknown as Record<string, unknown>;
  });
  steps.push(scanResult);

  // --- Step 5: Watchlist Digest ---
  const digestResult = await runStep("watchlist_digest", async () => {
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const digestUrl = `${protocol}://${host}/api/cron/watchlist-digest`;

    const res = await fetch(digestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: cronSecret ? `Bearer ${cronSecret}` : "",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Watchlist digest returned ${res.status}: ${text}`);
    }

    return await res.json();
  });
  steps.push(digestResult);

  // --- Audit Log ---
  const totalDuration = Date.now() - pipelineStart;

  const summary = {
    new_articles: (rssFetchResult.data?.new_articles as number) ?? 0,
    translated: (translateResult.data?.translated as number) ?? 0,
    highlights: (highlightsResult.data?.highlights_count as number) ?? 0,
    matches: (scanResult.data?.total_matches as number) ?? 0,
    steps_succeeded: steps.filter((s) => s.status === "success").length,
    steps_failed: steps.filter((s) => s.status === "error").length,
  };

  await supabase
    .from("audit_logs")
    .insert({
      user_id: null,
      action: "cron_pipeline",
      entity_type: "system",
      details: {
        trigger: "vercel_cron",
        duration_ms: totalDuration,
        steps,
        summary,
      },
    })
    .then(() => {});

  return NextResponse.json({
    success: summary.steps_failed === 0,
    duration_ms: totalDuration,
    summary,
    steps,
  });
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/pipeline/route.ts
git commit -m "feat: add pipeline orchestrator for automated hourly execution"
```

---

### Task 5: Vercel Cron Configuration

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Add cron schedule to vercel.json**

Replace the entire content of `vercel.json` with:

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

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "feat: configure Vercel Cron for hourly pipeline execution"
```

---

### Task 6: Build Verification & Tests

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run 2>&1 | tail -15`

Expected: All existing tests pass (112+).

- [ ] **Step 2: Run production build**

Run: `npm run build 2>&1 | tail -15`

Expected: Build succeeds. Verify `/api/cron/pipeline` appears in the route list.

- [ ] **Step 3: Manual smoke test**

Test the pipeline locally:

```bash
curl -X GET http://localhost:3000/api/cron/pipeline
```

Expected: JSON response with all 5 steps and their results.

- [ ] **Step 4: Commit any fixes if needed**

```bash
git add -A
git commit -m "fix: resolve any pipeline integration issues"
```
