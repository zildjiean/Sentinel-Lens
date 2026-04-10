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
