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
