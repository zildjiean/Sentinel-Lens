import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { LayoutConfig } from "@/lib/types/enterprise";
import { mergeLayoutConfig } from "@/lib/enterprise-report/merge-layout";

const aiDesignSchema = z.object({
  layout_id: z.string().uuid(),
  prompt: z.string().min(1).max(1000),
});

const AI_DESIGN_SYSTEM_PROMPT = `You are a UI/UX designer specializing in enterprise security report design.
Given a layout configuration (JSON) and a design prompt, return a modified layout configuration as valid JSON.
Only modify fields that are relevant to the design prompt.
Return ONLY valid JSON matching the layout config schema — no extra text, no markdown fences.`;

function parseJSONResponse(text: string): Record<string, unknown> {
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }
  return JSON.parse(cleaned);
}

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
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
) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
      temperature: 0.4,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function getApiKeys(supabase: Awaited<ReturnType<typeof createClient>>) {
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
  const openrouterKeySetting = settings?.find((s) => s.key === "openrouter_api_key");
  const geminiModelSetting = settings?.find((s) => s.key === "gemini_model");
  const openrouterModelSetting = settings?.find((s) => s.key === "openrouter_model");

  const provider = ((providerSetting?.value as string) || "gemini").replace(/"/g, "");
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

  const geminiModel = ((geminiModelSetting?.value as string) || "gemini-2.0-flash").replace(
    /"/g,
    ""
  );
  const openrouterModel = (
    (openrouterModelSetting?.value as string) || "google/gemini-2.0-flash-exp:free"
  ).replace(/"/g, "");
  const model = provider === "gemini" ? geminiModel : openrouterModel;

  return { provider, geminiKey, openrouterKey, model };
}

// POST: Preview AI layout adjustment (not saved)
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "viewer") {
    return NextResponse.json(
      { error: "Forbidden. Analyst or Admin role required." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = aiDesignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { layout_id, prompt } = parsed.data;

  // Fetch layout config
  const { data: layoutRow, error: layoutErr } = await supabase
    .from("enterprise_report_layouts")
    .select("layout_config")
    .eq("id", layout_id)
    .single();

  if (layoutErr || !layoutRow) {
    return NextResponse.json({ error: "Layout not found" }, { status: 404 });
  }

  const baseLayoutConfig: LayoutConfig = layoutRow.layout_config as LayoutConfig;

  try {
    const { provider, geminiKey, openrouterKey, model } = await getApiKeys(supabase);

    const activeKey = provider === "gemini" ? geminiKey : openrouterKey;
    if (!activeKey) {
      return NextResponse.json(
        { error: `No API key configured for ${provider}. Go to Settings to add one.` },
        { status: 400 }
      );
    }

    const userPrompt = `Current layout config:\n${JSON.stringify(baseLayoutConfig, null, 2)}\n\nDesign prompt: ${prompt}\n\nReturn the modified layout config JSON.`;

    const rawText =
      provider === "gemini"
        ? await callGemini(activeKey, model, AI_DESIGN_SYSTEM_PROMPT, userPrompt)
        : await callOpenRouter(activeKey, model, AI_DESIGN_SYSTEM_PROMPT, userPrompt);

    let adjustedConfig: Partial<LayoutConfig>;
    try {
      adjustedConfig = parseJSONResponse(rawText) as Partial<LayoutConfig>;
    } catch {
      return NextResponse.json(
        { error: "LLM returned invalid JSON for layout config" },
        { status: 502 }
      );
    }

    // Merge for preview (not saved to DB)
    const previewConfig = mergeLayoutConfig(baseLayoutConfig, adjustedConfig);

    return NextResponse.json({
      preview_config: previewConfig,
      changes: adjustedConfig,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: `AI design failed: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 500 }
    );
  }
}
