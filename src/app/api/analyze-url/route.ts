import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ANALYSIS_PROMPT = `You are a cybersecurity threat intelligence analyst. Analyze the following article content and provide a structured JSON response.

Rules:
1. Classify the severity level based on threat impact and urgency
2. Write a concise 2-3 sentence excerpt summarizing the key threat or finding
3. Suggest relevant tags from ONLY these categories: Ransomware, Phishing, APT, Zero-Day, Malware, Vulnerability, Data Breach, DDoS, Cloud Security, IoT, Supply Chain, Cryptocurrency, Critical Infrastructure, Healthcare, Financial
4. Provide a brief reason for the severity classification

Return ONLY valid JSON, no markdown formatting:
{
  "severity": "critical|high|medium|low|info",
  "severity_reason": "Brief explanation",
  "excerpt": "2-3 sentence summary",
  "tags": ["up to 5 tags"]
}`;

// Strip HTML tags and clean up text
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

interface ScrapeResult {
  title: string;
  content: string;
  author: string | null;
  imageUrl: string | null;
}

async function scrapeUrl(url: string): Promise<ScrapeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; SentinelLens/1.0; +https://sentinel-lens.vercel.app)",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const html = await res.text();

  // Extract title
  const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1];
  const htmlTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  const title = stripHtml(ogTitle || htmlTitle || "");

  // Extract author
  const authorMeta = html.match(/<meta[^>]+name="author"[^>]+content="([^"]+)"/i)?.[1]
    || html.match(/<meta[^>]+content="([^"]+)"[^>]+name="author"/i)?.[1];

  // Extract image
  const imageUrl = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1]
    || html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i)?.[1]
    || null;

  // Extract content
  let articleContent = "";

  // Try <article> tag first
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) articleContent = articleMatch[1];

  // Try common content selectors
  if (!articleContent) {
    const patterns = [
      /<div[^>]*class="[^"]*article[_-]?(?:content|body|text)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*(?:post|entry)[_-]?(?:content|body|text)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*content[_-]?(?:area|main|body)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*id="[^"]*(?:article|content|post)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<main[^>]*>([\s\S]*?)<\/main>/i,
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m && m[1].length > 200) { articleContent = m[1]; break; }
    }
  }

  // Fallback: all <p> tags
  if (!articleContent || stripHtml(articleContent).length < 200) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      const paragraphs: string[] = [];
      const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      let pMatch;
      while ((pMatch = pRegex.exec(bodyMatch[1])) !== null) {
        const text = stripHtml(pMatch[1]);
        if (text.length > 40) paragraphs.push(text);
      }
      if (paragraphs.length > 0) {
        return { title, content: paragraphs.join("\n\n").substring(0, 8000), author: authorMeta || null, imageUrl };
      }
    }
  }

  // Last resort: meta description
  if (!articleContent || stripHtml(articleContent).length < 100) {
    const metaDesc = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1]
      || html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)?.[1]
      || html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:description"/i)?.[1]
      || html.match(/<meta[^>]+content="([^"]+)"[^>]+name="description"/i)?.[1];
    if (metaDesc) articleContent = metaDesc;
  }

  const cleaned = stripHtml(articleContent);
  return { title, content: cleaned.substring(0, 8000), author: authorMeta || null, imageUrl };
}

async function callGemini(apiKey: string, model: string, systemPrompt: string, userPrompt: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
      }),
    }
  );
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errText}`);
  }
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function callOpenRouter(apiKey: string, model: string, systemPrompt: string, userPrompt: string) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errText}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

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

  const { url } = await request.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  // Validate URL format
  try { new URL(url); } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  // Check for duplicate URL
  const { data: existing } = await supabase
    .from("articles")
    .select("id, title")
    .eq("url", url)
    .single();

  const duplicateWarning = existing
    ? { duplicate: true, existing_id: existing.id, existing_title: existing.title }
    : null;

  // Step 1: Scrape
  let scraped: ScrapeResult;
  try {
    scraped = await scrapeUrl(url);
  } catch (err) {
    return NextResponse.json({
      error: `Could not fetch content from this URL: ${err instanceof Error ? err.message : "Unknown error"}`,
    }, { status: 422 });
  }

  if (!scraped.content || scraped.content.length < 50) {
    return NextResponse.json({
      error: "Could not extract enough content from this URL. The page may require JavaScript or is behind a paywall.",
      scraped: { title: scraped.title, content: scraped.content, author: scraped.author, image_url: scraped.imageUrl, url },
    }, { status: 422 });
  }

  // Step 2: AI Analysis
  let aiResult = { severity: "medium", severity_reason: "", excerpt: "", tags: [] as string[] };

  try {
    // Get LLM settings
    const { data: settings } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["llm_provider", "llm_api_keys", "gemini_api_key", "openrouter_api_key", "gemini_model", "openrouter_model"]);

    const providerSetting = settings?.find((s) => s.key === "llm_provider");
    const keysSetting = settings?.find((s) => s.key === "llm_api_keys");
    const geminiKeySetting = settings?.find((s) => s.key === "gemini_api_key");
    const openrouterKeySetting = settings?.find((s) => s.key === "openrouter_api_key");
    const geminiModelSetting = settings?.find((s) => s.key === "gemini_model");
    const openrouterModelSetting = settings?.find((s) => s.key === "openrouter_model");

    const provider = ((providerSetting?.value as string) || "gemini").replace(/"/g, "");
    const keys = (keysSetting?.value as Record<string, string>) || {};
    const geminiKey = keys.gemini || ((geminiKeySetting?.value as string) || "").replace(/"/g, "") || process.env.GEMINI_API_KEY || "";
    const openrouterKey = keys.openrouter || ((openrouterKeySetting?.value as string) || "").replace(/"/g, "") || process.env.OPENROUTER_API_KEY || "";
    const geminiModel = ((geminiModelSetting?.value as string) || "gemini-2.0-flash").replace(/"/g, "");
    const openrouterModel = ((openrouterModelSetting?.value as string) || "google/gemini-2.0-flash-exp:free").replace(/"/g, "");

    const activeKey = provider === "gemini" ? geminiKey : openrouterKey;
    const activeModel = provider === "gemini" ? geminiModel : openrouterModel;

    if (activeKey) {
      const userPrompt = `Analyze this cybersecurity article:\n\nTitle: ${scraped.title}\n\nContent: ${scraped.content.substring(0, 4000)}`;

      const text = provider === "gemini"
        ? await callGemini(activeKey, activeModel, ANALYSIS_PROMPT, userPrompt)
        : await callOpenRouter(activeKey, activeModel, ANALYSIS_PROMPT, userPrompt);

      try {
        const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(jsonStr);
        aiResult = {
          severity: parsed.severity || "medium",
          severity_reason: parsed.severity_reason || "",
          excerpt: parsed.excerpt || "",
          tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
        };
      } catch {
        // LLM returned non-JSON — use text as excerpt
        aiResult.excerpt = text.substring(0, 300);
      }
    }
  } catch {
    // AI analysis failed — continue with scraped data only
  }

  return NextResponse.json({
    title: scraped.title,
    content: scraped.content,
    excerpt: aiResult.excerpt,
    severity: aiResult.severity,
    severity_reason: aiResult.severity_reason,
    tags: aiResult.tags,
    author: scraped.author,
    image_url: scraped.imageUrl,
    url,
    ...(duplicateWarning ? { duplicate_warning: duplicateWarning } : {}),
  });
}
