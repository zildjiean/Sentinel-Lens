import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SYSTEM_PROMPT = `You are a professional cybersecurity news translator specializing in English to Thai translation.

Rules:
1. Preserve ALL technical terms in English: CVE IDs, APT group names, malware names, protocol names, IP addresses, domain names, tool names, vendor names
2. Translate only natural language portions to Thai
3. Maintain the same paragraph structure
4. Use formal Thai language appropriate for security professionals
5. Return JSON with keys: title_th, content_th, excerpt_th

Return ONLY valid JSON, no markdown formatting.`;

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
    return NextResponse.json({ error: "Forbidden. Analyst or Admin role required." }, { status: 403 });
  }

  const { article_id } = await request.json();

  // Fetch article
  const { data: article, error: articleError } = await supabase
    .from("articles")
    .select("*")
    .eq("id", article_id)
    .single();

  if (articleError || !article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  // Check if already translated
  const { data: existing } = await supabase
    .from("translations")
    .select("id")
    .eq("article_id", article_id)
    .single();

  if (existing) {
    return NextResponse.json({ message: "Already translated" });
  }

  // Get LLM settings (support both combined llm_api_keys and separate gemini_api_key/openrouter_api_key)
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

  // Check combined keys first, then separate key rows, then env vars
  const geminiKey = keys.gemini || ((geminiKeySetting?.value as string) || "").replace(/"/g, "") || process.env.GEMINI_API_KEY || "";
  const openrouterKey = keys.openrouter || ((openrouterKeySetting?.value as string) || "").replace(/"/g, "") || process.env.OPENROUTER_API_KEY || "";

  const geminiModel = ((geminiModelSetting?.value as string) || "gemini-2.0-flash").replace(/"/g, "");
  const openrouterModel = ((openrouterModelSetting?.value as string) || "google/gemini-2.0-flash-exp:free").replace(/"/g, "");

  const activeKey = provider === "gemini" ? geminiKey : openrouterKey;
  const activeModel = provider === "gemini" ? geminiModel : openrouterModel;
  if (!activeKey) {
    return NextResponse.json(
      { error: `No API key configured for ${provider}. Go to Settings to add one.` },
      { status: 400 }
    );
  }

  // Build prompt
  const userPrompt = `Translate this cybersecurity article:

Title: ${article.title}

Content: ${article.content}

Excerpt: ${article.excerpt}`;

  try {
    // Call LLM
    const result = provider === "gemini"
      ? await callGemini(activeKey, activeModel, SYSTEM_PROMPT, userPrompt)
      : await callOpenRouter(activeKey, activeModel, SYSTEM_PROMPT, userPrompt);

    // Parse JSON response
    let parsed;
    try {
      const jsonStr = result.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = {
        title_th: result.text.slice(0, 200),
        content_th: result.text,
        excerpt_th: result.text.slice(0, 300),
      };
    }

    const confidence = parsed.title_th && parsed.content_th ? 0.85 : 0.6;

    // Insert translation
    const { error: insertError } = await supabase.from("translations").insert({
      article_id,
      title_th: parsed.title_th || "",
      content_th: parsed.content_th || "",
      excerpt_th: parsed.excerpt_th || "",
      provider: result.provider,
      model: result.model,
      confidence,
      token_usage: result.tokenUsage,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Update article status
    await supabase
      .from("articles")
      .update({ status: "translated" })
      .eq("id", article_id);

    return NextResponse.json({
      message: "Translation complete",
      provider: result.provider,
      token_usage: result.tokenUsage,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Translation failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
