import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const REPORT_SYSTEM_PROMPT = `You are a senior cybersecurity analyst writing threat intelligence reports.

Generate a structured report in JSON format based on the provided articles. The report should be professional, actionable, and suitable for executive or technical audiences.

Return ONLY valid JSON with no additional text, in this exact format:
{
  "executive_summary": "2-3 paragraph executive summary",
  "subtitle": "brief subtitle for the report",
  "threat_landscape": "detailed analysis of the threat landscape based on the articles",
  "immediate_actions": ["action 1", "action 2", ...],
  "strategic_actions": ["action 1", "action 2", ...],
  "risk_level": "critical|high|medium|low",
  "confidence_level": "high|medium|low"
}`;

const TRANSLATE_SYSTEM_PROMPT = `You are a professional cybersecurity translator specializing in English-to-Thai translation for threat intelligence reports.

Rules:
- Preserve all technical terms exactly as-is: CVE IDs, APT group names, malware names, IP addresses, URLs, MITRE ATT&CK references.
- Keep proper nouns in their original form.
- Use formal Thai suitable for government/enterprise security reports.
- Translate the full content faithfully.
- Return ONLY valid JSON with the same structure as the input.`;

function parseJSONResponse(text: string): Record<string, unknown> {
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }
  return JSON.parse(cleaned);
}

async function callGemini(apiKey: string, systemPrompt: string, userPrompt: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
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

  return { text, tokenUsage, model: "gemini-2.0-flash", provider: "gemini" as const };
}

async function callOpenRouter(apiKey: string, systemPrompt: string, userPrompt: string) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Title": "Sentinel Lens",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-exp:free",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  const tokenUsage = data.usage?.total_tokens || 0;

  return { text, tokenUsage, model: "google/gemini-2.0-flash-exp:free", provider: "openrouter" as const };
}

async function getApiKeys(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: settings } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", ["llm_provider", "llm_api_keys", "gemini_api_key", "openrouter_api_key"]);

  const providerSetting = settings?.find((s) => s.key === "llm_provider");
  const keysSetting = settings?.find((s) => s.key === "llm_api_keys");
  const geminiKeySetting = settings?.find((s) => s.key === "gemini_api_key");
  const openrouterKeySetting = settings?.find((s) => s.key === "openrouter_api_key");

  const provider = ((providerSetting?.value as string) || "gemini").replace(/"/g, "");
  const keys = (keysSetting?.value as Record<string, string>) || {};

  const geminiKey = keys.gemini || ((geminiKeySetting?.value as string) || "").replace(/"/g, "") || process.env.GEMINI_API_KEY || "";
  const openrouterKey = keys.openrouter || ((openrouterKeySetting?.value as string) || "").replace(/"/g, "") || process.env.OPENROUTER_API_KEY || "";

  return { provider, geminiKey, openrouterKey };
}

async function callLLM(provider: string, geminiKey: string, openrouterKey: string, systemPrompt: string, userPrompt: string) {
  const activeKey = provider === "gemini" ? geminiKey : openrouterKey;
  if (!activeKey) {
    throw new Error(`No API key configured for ${provider}. Go to Settings to add one.`);
  }

  return provider === "gemini"
    ? await callGemini(activeKey, systemPrompt, userPrompt)
    : await callOpenRouter(activeKey, systemPrompt, userPrompt);
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

  const { article_ids, title, report_type, classification } = await request.json();

  if (!article_ids?.length || !title) {
    return NextResponse.json({ error: "article_ids and title are required" }, { status: 400 });
  }

  // Fetch articles
  const { data: articles, error: artErr } = await supabase
    .from("articles")
    .select("*, translations(*)")
    .in("id", article_ids);

  if (artErr || !articles?.length) {
    return NextResponse.json({ error: "No articles found" }, { status: 404 });
  }

  try {
    const { provider, geminiKey, openrouterKey } = await getApiKeys(supabase);

    // Build article summaries for the LLM
    const articleSummaries = articles
      .map(
        (a: Record<string, unknown>, i: number) =>
          `Article ${i + 1}: ${a.title}\nSeverity: ${a.severity}\nPublished: ${a.published_at}\nContent: ${String(a.content || "").replace(/<[^>]+>/g, "").substring(0, 2000)}`
      )
      .join("\n\n---\n\n");

    const userPrompt = `Generate a ${report_type} threat intelligence report titled "${title}" (Classification: ${classification}) based on these ${articles.length} articles:\n\n${articleSummaries}`;

    // Generate English report
    const enResult = await callLLM(provider, geminiKey, openrouterKey, REPORT_SYSTEM_PROMPT, userPrompt);
    let contentEn: Record<string, unknown>;
    try {
      contentEn = parseJSONResponse(enResult.text);
    } catch {
      contentEn = {
        executive_summary: enResult.text,
        subtitle: title,
        threat_landscape: "",
        immediate_actions: [],
        strategic_actions: [],
        risk_level: "medium",
        confidence_level: "medium",
      };
    }

    // Generate Thai translation
    const thUserPrompt = `Translate this cybersecurity report to Thai:\n\n${JSON.stringify(contentEn, null, 2)}`;
    const thResult = await callLLM(provider, geminiKey, openrouterKey, TRANSLATE_SYSTEM_PROMPT, thUserPrompt);
    let contentTh: Record<string, unknown>;
    try {
      contentTh = parseJSONResponse(thResult.text);
    } catch {
      contentTh = contentEn; // Fallback to English if translation parsing fails
    }

    // Determine overall severity
    const severityOrder = ["critical", "high", "medium", "low", "info"];
    const highestSeverity = articles.reduce((highest: string, a: Record<string, unknown>) => {
      const aIdx = severityOrder.indexOf(a.severity as string);
      const hIdx = severityOrder.indexOf(highest);
      return aIdx < hIdx ? (a.severity as string) : highest;
    }, "info");

    // Insert report
    const { data: report, error: repErr } = await supabase
      .from("reports")
      .insert({
        title,
        report_type,
        content_en: contentEn,
        content_th: contentTh,
        severity: highestSeverity,
        classification,
        provider: enResult.provider,
        model: enResult.model,
        status: "generated",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (repErr) {
      return NextResponse.json({ error: repErr.message }, { status: 500 });
    }

    // Insert report_articles junction
    const junctionRows = article_ids.map((article_id: string) => ({
      report_id: report.id,
      article_id,
    }));

    await supabase.from("report_articles").insert(junctionRows);

    return NextResponse.json({
      success: true,
      report_id: report.id,
      provider: enResult.provider,
      model: enResult.model,
      token_usage: enResult.tokenUsage + thResult.tokenUsage,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Report generation failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
