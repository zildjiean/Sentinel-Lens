import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SEVERITY_KEYWORDS: Record<string, string[]> = {
  critical: ["breach", "zero-day", "zero day", "0-day", "ransomware", "rce", "remote code execution"],
  high: ["vulnerability", "exploit", "malware", "trojan", "backdoor", "apt", "cve-"],
  medium: ["patch", "update", "advisory", "security update", "disclosure"],
};

function classifySeverity(text: string): string {
  const lower = text.toLowerCase();
  for (const [severity, keywords] of Object.entries(SEVERITY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return severity;
    }
  }
  return "low";
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(regex);
  if (!match) return "";
  // Handle CDATA
  const cdata = match[1].match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return (cdata ? cdata[1] : match[1]).trim();
}

function extractMediaUrl(itemXml: string): string {
  // media:content url="..."
  const mediaMatch = itemXml.match(/<media:content[^>]+url="([^"]+)"/i);
  if (mediaMatch) return mediaMatch[1];
  // enclosure url="..."
  const enclosureMatch = itemXml.match(/<enclosure[^>]+url="([^"]+)"/i);
  if (enclosureMatch) return enclosureMatch[1];
  // og:image in content
  const imgMatch = itemXml.match(/<img[^>]+src="([^"]+)"/i);
  if (imgMatch) return imgMatch[1];
  return "";
}

interface FeedItem {
  title: string;
  content: string;
  link: string;
  author: string;
  pubDate: string;
  imageUrl: string;
}

function parseRSSItems(xml: string): FeedItem[] {
  const items: FeedItem[] = [];

  // Match <item> or <entry> blocks
  const itemRegex = /<(?:item|entry)[\s>]([\s\S]*?)<\/(?:item|entry)>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const title = extractTag(block, "title");
    const content =
      extractTag(block, "content:encoded") ||
      extractTag(block, "content") ||
      extractTag(block, "description") ||
      extractTag(block, "summary");

    // link can be <link>url</link> or <link href="url" />
    let link = extractTag(block, "link");
    if (!link) {
      const linkHref = block.match(/<link[^>]+href="([^"]+)"/i);
      if (linkHref) link = linkHref[1];
    }

    const author =
      extractTag(block, "author") ||
      extractTag(block, "dc:creator") ||
      "";

    const pubDate =
      extractTag(block, "pubDate") ||
      extractTag(block, "published") ||
      extractTag(block, "updated") ||
      "";

    const imageUrl = extractMediaUrl(block);

    if (title && link) {
      items.push({ title, content, link, author, pubDate, imageUrl });
    }
  }

  return items;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get active RSS sources
    const { data: sources, error: srcErr } = await supabase
      .from("rss_sources")
      .select("*")
      .eq("is_active", true);

    if (srcErr) throw srcErr;
    if (!sources || sources.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active RSS sources" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalNew = 0;
    let totalSkipped = 0;
    const errors: string[] = [];

    for (const source of sources) {
      try {
        // 2. Fetch RSS feed
        const feedRes = await fetch(source.url, {
          headers: { "User-Agent": "SentinelLens/1.0" },
        });
        if (!feedRes.ok) {
          errors.push(`${source.name}: HTTP ${feedRes.status}`);
          continue;
        }

        const xml = await feedRes.text();
        const items = parseRSSItems(xml);

        // 3. Get existing URLs for dedup
        const urls = items.map((i) => i.link).filter(Boolean);
        const { data: existing } = await supabase
          .from("articles")
          .select("url")
          .in("url", urls);

        const existingUrls = new Set((existing ?? []).map((a: { url: string }) => a.url));

        // 4. Insert new articles
        const newArticles = items
          .filter((item) => item.link && !existingUrls.has(item.link))
          .map((item) => {
            const combinedText = `${item.title} ${item.content}`;
            const severity = classifySeverity(combinedText);
            const excerpt = item.content
              .replace(/<[^>]+>/g, "")
              .substring(0, 500);

            return {
              source_id: source.id,
              title: item.title,
              content: item.content,
              excerpt,
              url: item.link,
              image_url: item.imageUrl || null,
              author: item.author || null,
              severity,
              status: "new",
              published_at: item.pubDate
                ? new Date(item.pubDate).toISOString()
                : new Date().toISOString(),
            };
          });

        if (newArticles.length > 0) {
          const { data: inserted, error: insErr } = await supabase
            .from("articles")
            .insert(newArticles)
            .select("id, severity");

          if (insErr) {
            errors.push(`${source.name}: Insert error - ${insErr.message}`);
          } else {
            totalNew += inserted.length;

            // 5. Trigger translation for critical/high severity
            const toTranslate = inserted.filter(
              (a: { severity: string }) =>
                a.severity === "critical" || a.severity === "high"
            );

            for (const article of toTranslate) {
              try {
                await fetch(`${supabaseUrl}/functions/v1/llm-translate`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${supabaseKey}`,
                  },
                  body: JSON.stringify({ article_id: article.id }),
                });
              } catch (translateErr) {
                console.error(
                  `Translation trigger failed for ${article.id}:`,
                  translateErr
                );
              }
            }
          }
        }

        totalSkipped += items.length - newArticles.length;

        // 6. Update last_fetched_at
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

    return new Response(
      JSON.stringify({
        success: true,
        new_articles: totalNew,
        skipped_duplicates: totalSkipped,
        sources_processed: sources.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("RSS Fetcher error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
