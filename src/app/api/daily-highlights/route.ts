// src/app/api/daily-highlights/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateHighlights } from "@/lib/daily-highlights/generator";
import type { HighlightsData, HighlightItem } from "@/lib/daily-highlights/generator";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const CACHE_HOURS = 4;

async function enrichHighlightsWithArticles(
  highlightsData: HighlightsData,
  supabase: SupabaseClient
) {
  const articleIds = highlightsData.highlights.map((h: HighlightItem) => h.article_id);
  const { data: articles } =
    articleIds.length > 0
      ? await supabase
          .from("articles")
          .select("id, title, severity, excerpt, tags, published_at, url")
          .in("id", articleIds)
      : { data: [] };

  const articleMap = new Map((articles || []).map((a) => [a.id, a]));

  return highlightsData.highlights.map((h: HighlightItem) => ({
    ...h,
    article: articleMap.get(h.article_id) || null,
  }));
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Check for fresh cache (maybeSingle returns null without error when 0 rows)
  const { data: cached } = await supabase
    .from("daily_highlights")
    .select("*")
    .gt("expires_at", new Date().toISOString())
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached) {
    const highlightsData = cached.highlights_data as HighlightsData;
    const enrichedHighlights = await enrichHighlightsWithArticles(highlightsData, supabase);

    return NextResponse.json({
      has_highlights: highlightsData.has_highlights,
      highlights: enrichedHighlights,
      no_highlight_reason: highlightsData.no_highlight_reason,
      generated_at: cached.generated_at,
      is_cached: true,
    });
  }

  // 2. Cache miss — fetch recent articles and generate
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

  let highlightsData: HighlightsData;

  try {
    highlightsData = await generateHighlights(articlesForAI, supabase);
  } catch (err) {
    return NextResponse.json(
      { error: `AI generation failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }

  // 3. Save to DB and clean up old rows
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_HOURS * 60 * 60 * 1000);

  const { error: insertError } = await supabase.from("daily_highlights").insert({
    highlights_data: highlightsData,
    article_count: articlesForAI.length,
    generated_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    created_by: user.id,
  });

  if (insertError) {
    console.warn("[daily-highlights] Failed to cache result:", insertError.message);
  }

  // Clean up expired rows (fire-and-forget)
  supabase
    .from("daily_highlights")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .then(({ error }) => {
      if (error) console.warn("[daily-highlights] Cleanup failed:", error.message);
    });

  // 4. Enrich with article details
  const enrichedHighlights = await enrichHighlightsWithArticles(highlightsData, supabase);

  return NextResponse.json({
    has_highlights: highlightsData.has_highlights,
    highlights: enrichedHighlights,
    no_highlight_reason: highlightsData.no_highlight_reason,
    generated_at: now.toISOString(),
    is_cached: false,
  });
}
