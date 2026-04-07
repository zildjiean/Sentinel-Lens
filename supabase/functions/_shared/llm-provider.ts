import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { LLMResponse } from "./types.ts";

const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
const DEFAULT_OPENROUTER_MODEL = "google/gemini-2.0-flash-exp:free";

interface LLMConfig {
  provider: "gemini" | "openrouter";
  geminiApiKey: string;
  openrouterApiKey: string;
  geminiModel: string;
  openrouterModel: string;
}

export async function getConfig(
  serviceClient: SupabaseClient
): Promise<LLMConfig> {
  const { data: settings } = await serviceClient
    .from("app_settings")
    .select("key, value")
    .in("key", ["llm_provider", "llm_api_keys"]);

  let provider: "gemini" | "openrouter" = "gemini";
  let geminiApiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
  let openrouterApiKey = Deno.env.get("OPENROUTER_API_KEY") ?? "";
  const geminiModel =
    Deno.env.get("GEMINI_MODEL") ?? DEFAULT_GEMINI_MODEL;
  const openrouterModel =
    Deno.env.get("OPENROUTER_MODEL") ?? DEFAULT_OPENROUTER_MODEL;

  if (settings) {
    for (const s of settings) {
      if (s.key === "llm_provider" && s.value) {
        const val =
          typeof s.value === "string" ? s.value : JSON.stringify(s.value);
        const clean = val.replace(/"/g, "");
        if (clean === "gemini" || clean === "openrouter") {
          provider = clean;
        }
      }
      if (s.key === "llm_api_keys" && s.value) {
        const keys =
          typeof s.value === "object" ? s.value : JSON.parse(s.value);
        if (keys.gemini) geminiApiKey = keys.gemini;
        if (keys.openrouter) openrouterApiKey = keys.openrouter;
      }
    }
  }

  return {
    provider,
    geminiApiKey,
    openrouterApiKey,
    geminiModel,
    openrouterModel,
  };
}

export async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<LLMResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const tokenUsage =
    (data.usageMetadata?.promptTokenCount ?? 0) +
    (data.usageMetadata?.candidatesTokenCount ?? 0);

  return { text, token_usage: tokenUsage, model };
}

export async function callOpenRouter(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<LLMResponse> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Title": "Sentinel Lens",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 8192,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  const tokenUsage = data.usage
    ? (data.usage.prompt_tokens ?? 0) + (data.usage.completion_tokens ?? 0)
    : 0;

  return { text, token_usage: tokenUsage, model };
}

export async function callWithFallback(
  serviceClient: SupabaseClient,
  systemPrompt: string,
  userPrompt: string
): Promise<LLMResponse & { provider: "gemini" | "openrouter" }> {
  const config = await getConfig(serviceClient);

  const primary =
    config.provider === "gemini"
      ? { fn: callGemini, key: config.geminiApiKey, model: config.geminiModel, name: "gemini" as const }
      : { fn: callOpenRouter, key: config.openrouterApiKey, model: config.openrouterModel, name: "openrouter" as const };

  const fallback =
    config.provider === "gemini"
      ? { fn: callOpenRouter, key: config.openrouterApiKey, model: config.openrouterModel, name: "openrouter" as const }
      : { fn: callGemini, key: config.geminiApiKey, model: config.geminiModel, name: "gemini" as const };

  try {
    if (!primary.key) throw new Error(`No API key for ${primary.name}`);
    const result = await primary.fn(primary.key, primary.model, systemPrompt, userPrompt);
    return { ...result, provider: primary.name };
  } catch (primaryErr) {
    console.error(`Primary provider (${primary.name}) failed:`, primaryErr);

    if (!fallback.key) {
      throw new Error(
        `Primary (${primary.name}) failed and no API key for fallback (${fallback.name})`
      );
    }

    const result = await fallback.fn(fallback.key, fallback.model, systemPrompt, userPrompt);
    return { ...result, provider: fallback.name };
  }
}
