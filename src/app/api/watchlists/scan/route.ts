import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { matchArticleAgainstKeywords } from "@/lib/watchlist/matcher";
import { summarizeInThai } from "@/lib/watchlist/summarizer";
import { sendEmail } from "@/lib/email";
import { buildSingleMatchEmail } from "@/lib/watchlist/email-templates";
import type { WatchlistWithKeywords } from "@/lib/types/enterprise";

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

  // 1. Fetch all active watchlists with keywords
  const { data: watchlists, error: wlError } = await supabase
    .from("watchlists")
    .select("*, watchlist_keywords(*)")
    .eq("is_active", true);

  if (wlError) {
    return NextResponse.json({ error: wlError.message }, { status: 500 });
  }

  const activeWatchlists = (watchlists ?? []) as WatchlistWithKeywords[];

  // 2. Fetch articles from last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: articles, error: artError } = await supabase
    .from("articles")
    .select("id, title, content, excerpt, tags, severity, source_url, published_at, url")
    .gte("published_at", since);

  if (artError) {
    return NextResponse.json({ error: artError.message }, { status: 500 });
  }

  const recentArticles = articles ?? [];

  let totalMatches = 0;
  let notificationsSent = 0;

  // 3. For each article × each watchlist, run matching
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
          console.error("[scan] summarizeInThai failed:", err);
        }

        // Build and send email
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

          // Update notified_at for all inserted matches
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

  return NextResponse.json({
    success: true,
    articles_scanned: recentArticles.length,
    watchlists_scanned: activeWatchlists.length,
    total_matches: totalMatches,
    notifications_sent: notificationsSent,
  });
}
