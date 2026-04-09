// src/lib/watchlist/summarizer.ts

import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

interface SummarizeOptions {
  title: string;
  content: string | null;
  excerpt: string | null;
  severity: string;
  level: "short" | "detailed";
  supabase: SupabaseClient;
}

// ---- LLM Helpers (mirrors enterprise-report/generate pattern) ----

async function getApiKeys(supabase: SupabaseClient) {
  const { data: settings } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", [
      "llm_provider",
      "llm_api_keys",
      "gemini_api_key",
      "openrouter_api_key",
      "gemini_model",
      "openrouter_model",
    ]);

  const providerSetting = settings?.find((s) => s.key === "llm_provider");
  const keysSetting = settings?.find((s) => s.key === "llm_api_keys");
  const geminiKeySetting = settings?.find((s) => s.key === "gemini_api_key");
  const openrouterKeySetting = settings?.find(
    (s) => s.key === "openrouter_api_key"
  );
  const geminiModelSetting = settings?.find((s) => s.key === "gemini_model");
  const openrouterModelSetting = settings?.find(
    (s) => s.key === "openrouter_model"
  );

  const provider = (
    (providerSetting?.value as string) || "gemini"
  ).replace(/"/g, "");
  const keys = (keysSetting?.value as Record<string, string>) || {};

  const geminiKey =
    keys.gemini ||
    ((geminiKeySetting?.value as string) || "").replace(/"/g, "") ||
    process.env.GEMINI_API_KEY ||
    "";
  const openrouterKey =
    keys.openrouter ||
    ((openrouterKeySetting?.value as string) || "").replace(/"/g, "") ||
    process.env.OPENROUTER_API_KEY ||
    "";

  const geminiModel = (
    (geminiModelSetting?.value as string) || "gemini-2.0-flash"
  ).replace(/"/g, "");
  const openrouterModel = (
    (openrouterModelSetting?.value as string) ||
    "google/gemini-2.0-flash-exp:free"
  ).replace(/"/g, "");
  const model = provider === "gemini" ? geminiModel : openrouterModel;

  return { provider, geminiKey, openrouterKey, model };
}

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
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

async function callOpenRouter(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
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
        max_tokens: 1024,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// ---- Main Export ----

export async function summarizeInThai({
  title,
  content,
  excerpt,
  severity,
  level,
  supabase,
}: SummarizeOptions): Promise<string> {
  const { provider, geminiKey, openrouterKey, model } =
    await getApiKeys(supabase);

  const activeKey = provider === "gemini" ? geminiKey : openrouterKey;
  if (!activeKey) {
    throw new Error(
      `No API key configured for ${provider}. Go to Settings to add one.`
    );
  }

  const articleText = content
    ? String(content).replace(/<[^>]+>/g, "").substring(0, 3000)
    : excerpt || title;

  const systemPrompt =
    "คุณเป็นนักวิเคราะห์ความปลอดภัยไซเบอร์ผู้เชี่ยวชาญ สรุปข่าวเป็นภาษาไทย กระชับ ชัดเจน และเหมาะสำหรับผู้บริหารหรือทีมรักษาความปลอดภัย";

  const userPrompt =
    level === "short"
      ? `สรุปข่าวต่อไปนี้ 2-3 บรรทัดเป็นภาษาไทย ระบุความรุนแรง (${severity}) และผลกระทบหลัก:\n\nหัวข้อ: ${title}\n\n${articleText}`
      : `สรุปข่าวต่อไปนี้อย่างละเอียด 1-2 ย่อหน้าเป็นภาษาไทย ระบุความรุนแรง (${severity}), เทคนิคที่ใช้, และผลกระทบ จากนั้นให้ "คำแนะนำที่ควรดำเนินการ" เป็น bullet points:\n\nหัวข้อ: ${title}\n\n${articleText}`;

  return provider === "gemini"
    ? callGemini(activeKey, model, systemPrompt, userPrompt)
    : callOpenRouter(activeKey, model, systemPrompt, userPrompt);
}
