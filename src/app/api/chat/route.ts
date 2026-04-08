import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).max(10).optional().default([]),
});

const SYSTEM_PROMPT = `You are Sentinel Lens AI — a cybersecurity intelligence assistant embedded in a threat intelligence platform.

Your capabilities:
1. **Search platform articles**: When the user asks about threats, vulnerabilities, or news, search the platform's article database first. If relevant articles are found, summarize them and provide article IDs for linking.
2. **Cybersecurity expertise**: If no platform articles match, act as a knowledgeable cybersecurity assistant. Provide accurate, actionable information about threats, vulnerabilities, best practices, and incident response.
3. **Bilingual**: You can respond in both English and Thai. Match the language the user writes in.

Response format rules:
- When referencing platform articles, include them as: [ARTICLE:id:title] — the frontend will convert these to clickable links.
- Keep responses concise but informative (max 300 words).
- Use bullet points for lists.
- For technical terms, keep them in English even when responding in Thai.
- If you're unsure, say so rather than making things up.`;

// Sanitize keywords to prevent PostgREST filter injection
function sanitizeKeyword(keyword: string): string {
  // Remove PostgREST special characters that could alter filter logic
  return keyword.replace(/[.,()%\\]/g, "").trim();
}

async function searchArticles(supabase: SupabaseClient, query: string) {
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .map(sanitizeKeyword)
    .filter((w) => w.length > 2)
    .slice(0, 5);

  if (keywords.length === 0) return [];

  // Use Supabase full-text search if available, fallback to ilike
  // Try textSearch first (requires tsvector column)
  const tsQuery = keywords.join(" & ");
  const { data: ftsArticles, error: ftsError } = await supabase
    .from("articles")
    .select("id, title, severity, excerpt, published_at, tags")
    .textSearch("title", tsQuery, { type: "websearch" })
    .order("published_at", { ascending: false })
    .limit(5);

  if (!ftsError && ftsArticles && ftsArticles.length > 0) {
    return ftsArticles;
  }

  // Fallback: search title and excerpt only (skip content for performance)
  const orFilter = keywords
    .map((kw: string) => `title.ilike.%${kw}%,excerpt.ilike.%${kw}%`)
    .join(",");

  const { data: articles } = await supabase
    .from("articles")
    .select("id, title, severity, excerpt, published_at, tags")
    .or(orFilter)
    .order("published_at", { ascending: false })
    .limit(5);

  return articles ?? [];
}

async function callLLM(
  provider: string,
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[]
) {
  if (provider === "gemini") {
    // Convert messages to Gemini format
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const systemInstruction = messages.find((m) => m.role === "system");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(systemInstruction
            ? { system_instruction: { parts: [{ text: systemInstruction.content }] } }
            : {}),
          contents,
        }),
      }
    );

    if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  // OpenRouter
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parseResult = chatSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid request", details: parseResult.error.flatten() }, { status: 400 });
  }
  const { message, history: validatedHistory } = parseResult.data;

  // Step 1: Search platform articles
  const articles = await searchArticles(supabase, message);

  // Step 2: Build context with found articles
  let articleContext = "";
  if (articles.length > 0) {
    articleContext = "\n\n--- Platform Articles Found ---\n" +
      articles
        .map(
          (a: { id: string; title: string; severity: string; excerpt: string; published_at: string; tags: string[] }) =>
            `[ID:${a.id}] "${a.title}" (${a.severity}) - ${a.excerpt?.substring(0, 150)}... [Published: ${new Date(a.published_at).toLocaleDateString()}] [Tags: ${(a.tags || []).join(", ")}]`
        )
        .join("\n");
  }

  // Step 3: Get LLM settings
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

  if (!activeKey) {
    return NextResponse.json({
      error: "No LLM API key configured. Go to Settings to add one.",
    }, { status: 400 });
  }

  // Step 4: Build conversation
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    // Include validated history (max 10 messages)
    ...validatedHistory,
    {
      role: "user",
      content: articleContext
        ? `User question: ${message}\n\nI found these relevant articles in our platform database:${articleContext}\n\nPlease answer the user's question. Reference the found articles using [ARTICLE:id:title] format when relevant. If the articles don't fully answer the question, supplement with your cybersecurity knowledge.`
        : `User question: ${message}\n\nNo matching articles were found in our platform database. Please answer using your cybersecurity expertise. If the topic is something we should track, suggest that the user add it via "New Analysis".`,
    },
  ];

  try {
    const reply = await callLLM(provider, activeKey, activeModel, messages);

    return NextResponse.json({
      reply,
      articles_found: articles.length,
      articles: articles.map((a: { id: string; title: string; severity: string }) => ({
        id: a.id,
        title: a.title,
        severity: a.severity,
      })),
    });
  } catch (err) {
    return NextResponse.json({
      error: `AI response failed: ${err instanceof Error ? err.message : String(err)}`,
    }, { status: 500 });
  }
}
