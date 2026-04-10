// src/lib/translation/translator.ts

import { createClient } from "@/lib/supabase/server";
import { getTranslationPrompt } from "./prompt";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface TranslationResult {
  title_th: string;
  excerpt_th: string;
  content_th: string;
  provider: "gemini" | "openrouter";
  model: string;
  token_usage: number;
  confidence: number;
}

interface ArticleInput {
  title: string;
  content: string | null;
  excerpt: string | null;
  url: string;
}

interface LLMConfig {
  provider: "gemini" | "openrouter";
  apiKey: string;
  model: string;
}

async function loadLLMConfig(supabase: SupabaseClient): Promise<LLMConfig> {
  const { data: settings } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", [
      "llm_provider", "llm_api_keys", "gemini_api_key",
      "openrouter_api_key", "gemini_model", "openrouter_model",
    ]);

  const providerSetting = settings?.find((s) => s.key === "llm_provider");
  const keysSetting = settings?.find((s) => s.key === "llm_api_keys");
  const geminiKeySetting = settings?.find((s) => s.key === "gemini_api_key");
  const openrouterKeySetting = settings?.find((s) => s.key === "openrouter_api_key");
  const geminiModelSetting = settings?.find((s) => s.key === "gemini_model");
  const openrouterModelSetting = settings?.find((s) => s.key === "openrouter_model");

  const provider = (((providerSetting?.value as string) || "gemini").replace(/"/g, "")) as "gemini" | "openrouter";
  const keys = (keysSetting?.value as Record<string, string>) || {};

  const geminiKey = keys.gemini || ((geminiKeySetting?.value as string) || "").replace(/"/g, "") || process.env.GEMINI_API_KEY || "";
  const openrouterKey = keys.openrouter || ((openrouterKeySetting?.value as string) || "").replace(/"/g, "") || process.env.OPENROUTER_API_KEY || "";

  const geminiModel = ((geminiModelSetting?.value as string) || "gemini-2.0-flash").replace(/"/g, "");
  const openrouterModel = ((openrouterModelSetting?.value as string) || "google/gemini-2.0-flash-exp:free").replace(/"/g, "");

  const apiKey = provider === "gemini" ? geminiKey : openrouterKey;
  const model = provider === "gemini" ? geminiModel : openrouterModel;

  if (!apiKey) {
    throw new Error(`No API key configured for ${provider}. Go to Settings to add one.`);
  }

  return { provider, apiKey, model };
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
      signal: AbortSignal.timeout(30000),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const tokenUsage =
    (data.usageMetadata?.promptTokenCount || 0) +
    (data.usageMetadata?.candidatesTokenCount || 0);

  return { text, tokenUsage, model, provider: "gemini" as const };
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
    signal: AbortSignal.timeout(30000),
    cache: "no-store",
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  const tokenUsage = data.usage?.total_tokens || 0;

  return { text, tokenUsage, model, provider: "openrouter" as const };
}

function parseTranslationResponse(raw: string): { title_th: string; excerpt_th: string; content_th: string; confidence: number } {
  try {
    const jsonStr = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    const confidence = parsed.title_th && parsed.content_th ? 0.85 : 0.6;
    return {
      title_th: parsed.title_th || "",
      excerpt_th: parsed.excerpt_th || "",
      content_th: parsed.content_th || "",
      confidence,
    };
  } catch {
    return {
      title_th: raw.slice(0, 200),
      excerpt_th: raw.slice(0, 300),
      content_th: raw,
      confidence: 0.6,
    };
  }
}

export async function translateArticle(
  article: ArticleInput,
  supabase: SupabaseClient
): Promise<TranslationResult> {
  const config = await loadLLMConfig(supabase);
  const systemPrompt = await getTranslationPrompt(supabase);

  const contentTruncated = (article.content || "").substring(0, 6000);
  const userPrompt = `วิเคราะห์และสรุปข่าว cybersecurity ต่อไปนี้:

Title: ${article.title}

Content: ${contentTruncated}

Excerpt: ${article.excerpt || ""}

Source URL: ${article.url}`;

  const result = config.provider === "gemini"
    ? await callGemini(config.apiKey, config.model, systemPrompt, userPrompt)
    : await callOpenRouter(config.apiKey, config.model, systemPrompt, userPrompt);

  const parsed = parseTranslationResponse(result.text);

  return {
    title_th: parsed.title_th,
    excerpt_th: parsed.excerpt_th,
    content_th: parsed.content_th,
    provider: result.provider,
    model: result.model,
    token_usage: result.tokenUsage,
    confidence: parsed.confidence,
  };
}
