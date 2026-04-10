import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isAdContent,
  normalizeTitle,
  classifySeverity,
  parseRSSItems,
  stripHtml,
} from "@/lib/rss/utils";

// Fetch and extract article content from URL
async function scrapeArticleContent(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SentinelLens/1.0; +https://sentinel-lens.vercel.app)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return "";

    const html = await res.text();

    // Try to extract article content using common patterns
    let articleContent = "";

    // Try <article> tag first
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    if (articleMatch) {
      articleContent = articleMatch[1];
    }

    // Try common content selectors
    if (!articleContent) {
      const contentPatterns = [
        /<div[^>]*class="[^"]*article[_-]?(?:content|body|text)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*class="[^"]*(?:post|entry)[_-]?(?:content|body|text)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*class="[^"]*content[_-]?(?:area|main|body)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*id="[^"]*(?:article|content|post)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<main[^>]*>([\s\S]*?)<\/main>/i,
      ];

      for (const pattern of contentPatterns) {
        const contentMatch = html.match(pattern);
        if (contentMatch && contentMatch[1].length > 200) {
          articleContent = contentMatch[1];
          break;
        }
      }
    }

    // Try extracting all <p> tags from body as fallback
    if (!articleContent || stripHtml(articleContent).length < 200) {
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        const paragraphs: string[] = [];
        const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
        let pMatch;
        while ((pMatch = pRegex.exec(bodyMatch[1])) !== null) {
          const text = stripHtml(pMatch[1]);
          if (text.length > 40) {
            paragraphs.push(text);
          }
        }
        if (paragraphs.length > 0) {
          articleContent = paragraphs.join("\n\n");
          return articleContent.substring(0, 8000);
        }
      }
    }

    // Last resort: extract from meta description/og tags
    if (!articleContent || stripHtml(articleContent).length < 100) {
      const metaPatterns = [
        /<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i,
        /<meta[^>]+name="description"[^>]+content="([^"]+)"/i,
        /<meta[^>]+content="([^"]+)"[^>]+property="og:description"/i,
        /<meta[^>]+content="([^"]+)"[^>]+name="description"/i,
      ];
      for (const mp of metaPatterns) {
        const metaMatch = html.match(mp);
        if (metaMatch && metaMatch[1].length > 50) {
          articleContent = metaMatch[1];
          break;
        }
      }
    }

    const cleaned = stripHtml(articleContent);
    return cleaned.substring(0, 8000);
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Optional: specific source_id, otherwise fetch all active
  const body = await request.json().catch(() => ({}));
  const sourceId = body.source_id;

  // Get active RSS sources
  let query = supabase.from("rss_sources").select("*").eq("is_active", true);
  if (sourceId) {
    query = query.eq("id", sourceId);
  }

  const { data: sources, error: srcErr } = await query;

  if (srcErr) {
    return NextResponse.json({ error: srcErr.message }, { status: 500 });
  }

  if (!sources || sources.length === 0) {
    return NextResponse.json({ message: "No active RSS sources" });
  }

  let totalNew = 0;
  let totalSkipped = 0;
  let totalAdsFiltered = 0;
  const errors: string[] = [];

  for (const source of sources) {
    try {
      // Fetch RSS feed
      const feedRes = await fetch(source.url, {
        headers: { "User-Agent": "SentinelLens/1.0" },
      });

      if (!feedRes.ok) {
        errors.push(`${source.name}: HTTP ${feedRes.status}`);
        continue;
      }

      const xml = await feedRes.text();
      const items = parseRSSItems(xml);

      // Get existing URLs for dedup
      const urls = items.map((i) => i.link).filter(Boolean);
      const { data: existing } = await supabase
        .from("articles")
        .select("url, title")
        .in("url", urls);

      const existingUrls = new Set((existing ?? []).map((a: { url: string }) => a.url));

      // Also fetch recent article titles for title-based dedup
      const { data: recentArticles } = await supabase
        .from("articles")
        .select("title")
        .order("published_at", { ascending: false })
        .limit(200);

      const existingTitles = new Set(
        (recentArticles ?? []).map((a: { title: string }) => normalizeTitle(a.title))
      );

      // Filter new articles (dedup + ad filtering)
      let adFiltered = 0;
      const newItems = items.filter((item) => {
        if (!item.link || existingUrls.has(item.link) || existingTitles.has(normalizeTitle(item.title))) {
          return false;
        }
        // Filter out ads/promotions
        if (isAdContent(item.title, item.content)) {
          adFiltered++;
          return false;
        }
        return true;
      });

      // Process each new article (scrape full content)
      for (const item of newItems.slice(0, 10)) {
        try {
          // Get RSS content first
          let rssContent = stripHtml(item.content);

          // If RSS content is short (< 500 chars), try scraping full content from URL
          if (rssContent.length < 500 && item.link) {
            const scraped = await scrapeArticleContent(item.link);
            if (scraped.length > rssContent.length) {
              rssContent = scraped;
            }
          }

          const combinedText = `${item.title} ${rssContent}`;
          const severity = classifySeverity(combinedText);
          const excerpt = rssContent.substring(0, 500);

          const { error: insErr } = await supabase.from("articles").insert({
            source_id: source.id,
            title: item.title,
            content: rssContent,
            excerpt,
            url: item.link,
            image_url: item.imageUrl || null,
            author: item.author || null,
            severity,
            status: "new",
            published_at: item.pubDate
              ? new Date(item.pubDate).toISOString()
              : new Date().toISOString(),
          });

          if (insErr) {
            errors.push(`${source.name}: Insert error - ${insErr.message}`);
          } else {
            totalNew++;
          }
        } catch (itemErr) {
          errors.push(
            `${source.name}/${item.title}: ${itemErr instanceof Error ? itemErr.message : String(itemErr)}`
          );
        }
      }

      totalSkipped += items.length - newItems.length - adFiltered;
      totalAdsFiltered += adFiltered;

      // Update last_fetched_at
      await supabase
        .from("rss_sources")
        .update({ last_fetched_at: new Date().toISOString() })
        .eq("id", source.id);
    } catch (sourceErr) {
      errors.push(
        `${source.name}: ${sourceErr instanceof Error ? sourceErr.message : String(sourceErr)}`
      );
    }
  }

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

  return NextResponse.json({
    success: true,
    new_articles: totalNew,
    ads_filtered: totalAdsFiltered,
    skipped_duplicates: totalSkipped,
    sources_processed: sources.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
