// src/lib/daily-highlights/generator.ts

import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface HighlightItem {
  article_id: string;
  reason_th: string;
  impact_level: "critical" | "high" | "notable";
}

export interface HighlightsData {
  has_highlights: boolean;
  no_highlight_reason: string | null;
  highlights: HighlightItem[];
}

interface ArticleSummary {
  id: string;
  title: string;
  severity: string;
  tags: string[];
  excerpt: string | null;
  published_at: string;
}

const SYSTEM_PROMPT = `คุณเป็นผู้เชี่ยวชาญด้าน cybersecurity intelligence วิเคราะห์ข่าวต่อไปนี้และคัดเลือกข่าวที่สำคัญที่สุดของวันนี้

เกณฑ์การคัดเลือก:
- ช่องโหว่ร้ายแรง (zero-day, RCE, actively exploited)
- การโจมตีที่กระทบวงกว้างหรือเกี่ยวข้องกับประเทศไทย
- ภัยคุกคามใหม่ที่ไม่เคยพบมาก่อน (new malware, new APT campaign)
- เหตุการณ์ data breach ขนาดใหญ่

กฎ:
- เลือกได้ 0-5 ข่าว ตามความสำคัญจริง
- ถ้าไม่มีข่าวที่น่าสนใจจริงๆ ให้ตอบ has_highlights: false พร้อมเหตุผลสั้นๆ
- เขียน reason_th เป็นภาษาไทย อธิบายว่าทำไมข่าวนี้สำคัญ (1-2 ประโยค)
- impact_level: "critical" (ต้องดำเนินการทันที), "high" (ควรติดตาม), "notable" (น่าสนใจ)

ตอบเป็น JSON เท่านั้น ไม่ต้องมี markdown code block`;

export function buildArticleContext(articles: ArticleSummary[]): string {
  return articles
    .map(
      (a) =>
        `[ID:${a.id}] "${a.title}" (${a.severity}) tags:[${a.tags.join(",")}] — ${(a.excerpt || "").substring(0, 200)}`
    )
    .join("\n");
}

export function parseHighlightsResponse(raw: string): HighlightsData {
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse AI response as JSON: ${cleaned.substring(0, 200)}`);
  }

  const hasHighlights = Boolean(parsed.has_highlights);
  const noHighlightReason =
    typeof parsed.no_highlight_reason === "string"
      ? parsed.no_highlight_reason
      : null;

  const rawHighlights = Array.isArray(parsed.highlights)
    ? parsed.highlights
    : [];

  const highlights: HighlightItem[] = rawHighlights
    .filter(
      (h: Record<string, unknown>) =>
        typeof h.article_id === "string" &&
        typeof h.reason_th === "string" &&
        ["critical", "high", "notable"].includes(String(h.impact_level))
    )
    .slice(0, 5)
    .map((h: Record<string, unknown>) => ({
      article_id: String(h.article_id),
      reason_th: String(h.reason_th),
      impact_level: h.impact_level as "critical" | "high" | "notable",
    }));

  return { has_highlights: hasHighlights, no_highlight_reason: noHighlightReason, highlights };
}

export async function generateHighlights(
  articles: ArticleSummary[],
  supabase: SupabaseClient
): Promise<HighlightsData> {
  if (articles.length === 0) {
    return {
      has_highlights: false,
      no_highlight_reason: "ไม่มีข่าวในระบบ 24 ชั่วโมงที่ผ่านมา",
      highlights: [],
    };
  }

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

  const provider = ((providerSetting?.value as string) || "gemini").replace(/"/g, "");
  const keys = (keysSetting?.value as Record<string, string>) || {};

  const geminiKey = keys.gemini || ((geminiKeySetting?.value as string) || "").replace(/"/g, "") || process.env.GEMINI_API_KEY || "";
  const openrouterKey = keys.openrouter || ((openrouterKeySetting?.value as string) || "").replace(/"/g, "") || process.env.OPENROUTER_API_KEY || "";

  const geminiModel = ((geminiModelSetting?.value as string) || "gemini-2.0-flash").replace(/"/g, "");
  const openrouterModel = ((openrouterModelSetting?.value as string) || "google/gemini-2.0-flash-exp:free").replace(/"/g, "");

  const activeKey = provider === "gemini" ? geminiKey : openrouterKey;
  const model = provider === "gemini" ? geminiModel : openrouterModel;

  if (!activeKey) {
    throw new Error(`No API key configured for ${provider}. Go to Settings to add one.`);
  }

  const userPrompt = `วิเคราะห์ข่าว cybersecurity ต่อไปนี้ (${articles.length} ชิ้น จาก 24 ชม. ที่ผ่านมา) แล้วคัดเลือกข่าวสำคัญ:\n\n${buildArticleContext(articles)}`;

  let rawResponse: string;

  if (provider === "gemini") {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048, responseMimeType: "application/json" },
        }),
      }
    );
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${errText}`);
    }
    const data = await response.json();
    rawResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  } else {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${activeKey}`,
        "X-Title": "Sentinel Lens",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${errText}`);
    }
    const data = await response.json();
    rawResponse = data.choices?.[0]?.message?.content || "{}";
  }

  return parseHighlightsResponse(rawResponse);
}
