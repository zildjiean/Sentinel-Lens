import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { summarizeInThai } from "@/lib/watchlist/summarizer";
import { sendEmail } from "@/lib/email";
import { buildDigestEmail } from "@/lib/watchlist/email-templates";
import type { WatchlistMatchWithArticle } from "@/lib/types/enterprise";

export async function POST(request: Request) {
  // 1. Verify CRON_SECRET
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const now = new Date();

  // 2. Fetch batch watchlists
  const { data: watchlists, error: wlError } = await supabase
    .from("watchlists")
    .select("*")
    .eq("notify_mode", "batch")
    .eq("is_active", true);

  if (wlError) {
    return NextResponse.json({ error: wlError.message }, { status: 500 });
  }

  const batchWatchlists = watchlists ?? [];
  const results: Array<{
    watchlist_id: string;
    watchlist_name: string;
    matches_sent: number;
    skipped: boolean;
    reason?: string;
  }> = [];

  for (const watchlist of batchWatchlists) {
    // 3. Check if interval has passed
    const intervalMs = (watchlist.batch_interval_minutes ?? 60) * 60 * 1000;
    const lastNotified = watchlist.last_notified_at
      ? new Date(watchlist.last_notified_at)
      : null;

    if (lastNotified && now.getTime() - lastNotified.getTime() < intervalMs) {
      results.push({
        watchlist_id: watchlist.id,
        watchlist_name: watchlist.name,
        matches_sent: 0,
        skipped: true,
        reason: "interval not reached",
      });
      continue;
    }

    if (!watchlist.email_recipients?.length) {
      results.push({
        watchlist_id: watchlist.id,
        watchlist_name: watchlist.name,
        matches_sent: 0,
        skipped: true,
        reason: "no email recipients",
      });
      continue;
    }

    // 4. Collect unnotified matches joined with article data
    const { data: matches, error: matchError } = await supabase
      .from("watchlist_matches")
      .select(
        "*, article:articles(id, title, severity, excerpt, source_url, published_at)"
      )
      .eq("watchlist_id", watchlist.id)
      .is("notified_at", null);

    if (matchError) {
      results.push({
        watchlist_id: watchlist.id,
        watchlist_name: watchlist.name,
        matches_sent: 0,
        skipped: true,
        reason: matchError.message,
      });
      continue;
    }

    const unnotifiedMatches = (matches ?? []) as WatchlistMatchWithArticle[];

    if (unnotifiedMatches.length === 0) {
      // Still update last_notified_at to reset the interval clock
      await supabase
        .from("watchlists")
        .update({ last_notified_at: now.toISOString() })
        .eq("id", watchlist.id);

      results.push({
        watchlist_id: watchlist.id,
        watchlist_name: watchlist.name,
        matches_sent: 0,
        skipped: true,
        reason: "no unnotified matches",
      });
      continue;
    }

    // 5. Generate Thai summaries for matches missing one
    const digestItems = await Promise.all(
      unnotifiedMatches.map(async (match) => {
        let summaryTh = match.summary_th;

        if (!summaryTh && match.article) {
          try {
            summaryTh = await summarizeInThai({
              title: match.article.title,
              content: null,
              excerpt: match.article.excerpt ?? null,
              severity: match.article.severity,
              level: watchlist.summary_level ?? "short",
              supabase,
            });

            // Persist the generated summary
            await supabase
              .from("watchlist_matches")
              .update({ summary_th: summaryTh })
              .eq("id", match.id);
          } catch (err) {
            console.error("[digest] summarizeInThai failed:", err);
          }
        }

        const articleUrl = match.article?.source_url ?? undefined;

        return {
          article: match.article,
          matchedKeyword: match.matched_keyword,
          matchedIn: match.matched_in,
          summaryTh: summaryTh ?? null,
          articleUrl,
        };
      })
    );

    // Build period label
    const intervalMinutes = watchlist.batch_interval_minutes ?? 60;
    const periodLabel =
      intervalMinutes >= 60
        ? `ช่วง ${intervalMinutes / 60} ชั่วโมงที่ผ่านมา`
        : `ช่วง ${intervalMinutes} นาทีที่ผ่านมา`;

    // 6. Build and send digest email
    const { subject, html } = buildDigestEmail({
      watchlistName: watchlist.name,
      periodLabel,
      matches: digestItems,
    });

    const emailResult = await sendEmail({
      to: watchlist.email_recipients,
      subject,
      html,
    });

    if (emailResult.success) {
      const notifiedAt = now.toISOString();

      // Update notified_at on all matches
      await supabase
        .from("watchlist_matches")
        .update({ notified_at: notifiedAt })
        .in(
          "id",
          unnotifiedMatches.map((m) => m.id)
        );

      // Update last_notified_at on watchlist
      await supabase
        .from("watchlists")
        .update({ last_notified_at: notifiedAt })
        .eq("id", watchlist.id);
    }

    results.push({
      watchlist_id: watchlist.id,
      watchlist_name: watchlist.name,
      matches_sent: emailResult.success ? unnotifiedMatches.length : 0,
      skipped: !emailResult.success,
      reason: emailResult.error,
    });
  }

  return NextResponse.json({ success: true, results });
}
