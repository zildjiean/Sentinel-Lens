import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { matchArticleAgainstKeywords } from "@/lib/watchlist/matcher";
import { summarizeInThai } from "@/lib/watchlist/summarizer";
import { sendEmail } from "@/lib/email";
import { buildSingleMatchEmail } from "@/lib/watchlist/email-templates";
import type { WatchlistWithKeywords } from "@/lib/types/enterprise";

async function matchWatchlistsForArticle(article: {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  severity: string;
  tags: string[];
  url?: string | null;
  source_url?: string | null;
  published_at?: string | null;
}) {
  const supabase = await createClient();

  // Fetch active realtime watchlists with their keywords
  const { data: watchlists } = await supabase
    .from("watchlists")
    .select("*, watchlist_keywords(*)")
    .eq("is_active", true)
    .eq("notify_mode", "realtime");

  const realtimeWatchlists = (watchlists ?? []) as WatchlistWithKeywords[];

  for (const watchlist of realtimeWatchlists) {
    const keywords = watchlist.watchlist_keywords ?? [];
    if (keywords.length === 0) continue;

    const matchResults = matchArticleAgainstKeywords(article, keywords);
    if (matchResults.length === 0) continue;

    // Insert matches — ON CONFLICT DO NOTHING
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
      .select("id, matched_keyword, matched_in");

    if (!insertedMatches || insertedMatches.length === 0) continue;
    if (!watchlist.email_recipients?.length) continue;

    // Generate Thai summary
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
      console.error("[article-hook] summarizeInThai failed:", err);
    }

    const firstMatch = insertedMatches[0];
    const articleUrl = article.url ?? article.source_url ?? undefined;

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

const articleSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(50000),
  excerpt: z.string().max(1000).optional().default(""),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  tags: z.array(z.string().max(50)).max(10).optional().default([]),
  author: z.string().max(200).nullable().optional(),
  url: z.string().url().max(2048).nullable().optional(),
  image_url: z.string().url().max(2048).nullable().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role === "viewer") {
    return NextResponse.json({ error: "Forbidden. Analyst or Admin role required." }, { status: 403 });
  }

  const parseResult = articleSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid request", details: parseResult.error.flatten() }, { status: 400 });
  }
  const { title, content, excerpt, severity, tags, author, url, image_url } = parseResult.data;

  // Insert article
  const { data: article, error } = await supabase
    .from("articles")
    .insert({
      title: title.trim(),
      content: content.trim(),
      excerpt: excerpt.trim() || content.trim().substring(0, 200),
      severity,
      status: "new",
      tags,
      author: author?.trim() || null,
      url: url?.trim() || null,
      image_url: image_url?.trim() || null,
      is_manual: true,
      created_by: user.id,
      source_id: null,
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log to audit
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "create",
    entity_type: "article",
    entity_id: article.id,
    details: { title: title.trim(), severity, is_manual: true },
  }).then(() => {});

  // Fire watchlist matching in background (don't block response)
  matchWatchlistsForArticle({
    id: article.id,
    title: title.trim(),
    content: content.trim(),
    excerpt: excerpt.trim() || content.trim().substring(0, 200),
    severity,
    tags: tags ?? [],
    url: url?.trim() || null,
    source_url: null,
    published_at: new Date().toISOString(),
  }).catch(console.error);

  // Trigger revalidation for feed page
  revalidatePath("/");

  return NextResponse.json({ success: true, article_id: article.id });
}
