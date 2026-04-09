import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { LayoutConfig, ReportContentEN } from "@/lib/types/enterprise";
import { mergeLayoutConfig } from "@/lib/enterprise-report/merge-layout";

// ---- Zod Schema ----

const generateSchema = z.object({
  article_ids: z.array(z.string().uuid()).min(1),
  title: z.string().min(1).max(255),
  report_type: z.string().min(1),
  classification: z.string().min(1),
  layout_id: z.string().uuid(),
  ai_design_prompt: z.string().max(1000).optional(),
});

// ---- LLM System Prompts ----

const REPORT_SYSTEM_PROMPT = `You are a senior cybersecurity analyst writing enterprise threat intelligence reports.

Generate a structured report in JSON format based on the provided articles. The report should be professional, actionable, and suitable for executive or technical audiences.

Return ONLY valid JSON with no additional text, in this exact format:
{
  "executive_summary": "2-3 paragraph executive summary",
  "subtitle": "brief subtitle for the report",
  "threat_landscape": "detailed analysis of the threat landscape based on the articles",
  "immediate_actions": ["action 1", "action 2"],
  "strategic_actions": ["action 1", "action 2"],
  "risk_level": "critical|high|medium|low",
  "confidence_level": "high|medium|low",
  "ioc_table": [{"type": "ip|domain|hash|url", "value": "...", "source": "article title or source"}]
}`;

const TRANSLATE_SYSTEM_PROMPT = `You are a professional cybersecurity translator specializing in English-to-Thai translation for threat intelligence reports.

Rules:
- Preserve all technical terms exactly as-is: CVE IDs, APT group names, malware names, IP addresses, URLs, MITRE ATT&CK references.
- Keep proper nouns in their original form.
- Use formal Thai suitable for government/enterprise security reports.
- Translate the full content faithfully.
- Return ONLY valid JSON with the same structure as the input.`;

const AI_DESIGN_SYSTEM_PROMPT = `You are a UI/UX designer specializing in enterprise security report design.
Given a layout configuration (JSON) and a design prompt, return a modified layout configuration as valid JSON.
Only modify fields that are relevant to the design prompt.
Return ONLY valid JSON matching the layout config schema — no extra text, no markdown fences.`;

// ---- LLM Helpers ----

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

  return { text, tokenUsage, model, provider: "gemini" as const };
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

  return { text, tokenUsage, model, provider: "openrouter" as const };
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

async function callLLM(
  provider: string,
  geminiKey: string,
  openrouterKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
) {
  const activeKey = provider === "gemini" ? geminiKey : openrouterKey;
  if (!activeKey) {
    throw new Error(
      `No API key configured for ${provider}. Go to Settings to add one.`
    );
  }

  return provider === "gemini"
    ? callGemini(activeKey, model, systemPrompt, userPrompt)
    : callOpenRouter(activeKey, model, systemPrompt, userPrompt);
}

// ---- Route Handler ----

export async function POST(request: Request) {
  const supabase = await createClient();

  // 1. Auth check
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

  // 2. Zod validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { article_ids, title, report_type, classification, layout_id, ai_design_prompt } =
    parsed.data;

  try {
    const { provider, geminiKey, openrouterKey, model } = await getApiKeys(supabase);

    // 3. Fetch layout config
    const { data: layoutRow, error: layoutErr } = await supabase
      .from("enterprise_report_layouts")
      .select("layout_config")
      .eq("id", layout_id)
      .single();

    if (layoutErr || !layoutRow) {
      return NextResponse.json({ error: "Layout not found" }, { status: 404 });
    }

    let baseLayoutConfig: LayoutConfig = layoutRow.layout_config as LayoutConfig;
    let layoutConfigOverride: Partial<LayoutConfig> | null = null;

    // 4. If ai_design_prompt → call LLM to adjust layout
    if (ai_design_prompt) {
      const designUserPrompt = `Current layout config:\n${JSON.stringify(baseLayoutConfig, null, 2)}\n\nDesign prompt: ${ai_design_prompt}\n\nReturn the modified layout config JSON.`;
      try {
        const designResult = await callLLM(
          provider,
          geminiKey,
          openrouterKey,
          model,
          AI_DESIGN_SYSTEM_PROMPT,
          designUserPrompt
        );
        const adjustedConfig = parseJSONResponse(designResult.text) as Partial<LayoutConfig>;
        layoutConfigOverride = adjustedConfig;
        baseLayoutConfig = mergeLayoutConfig(baseLayoutConfig, adjustedConfig);
      } catch {
        // If AI design fails, proceed with original layout
      }
    }

    // 5. Fetch articles
    const { data: articles, error: artErr } = await supabase
      .from("articles")
      .select("*, translations(*)")
      .in("id", article_ids);

    if (artErr || !articles?.length) {
      return NextResponse.json({ error: "No articles found" }, { status: 404 });
    }

    // 6. Insert report with status "generating"
    const { data: report, error: repErr } = await supabase
      .from("enterprise_reports")
      .insert({
        title,
        report_type,
        classification,
        layout_id,
        layout_config_override: layoutConfigOverride,
        ai_design_prompt: ai_design_prompt ?? null,
        status: "generating",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (repErr || !report) {
      return NextResponse.json({ error: repErr?.message ?? "Failed to create report" }, { status: 500 });
    }

    // 7. Insert junction rows
    const junctionRows = article_ids.map((article_id: string, idx: number) => ({
      report_id: report.id,
      article_id,
      display_order: idx,
    }));

    await supabase.from("enterprise_report_articles").insert(junctionRows);

    // 8. Build article summaries and call LLM to generate content EN
    const articleSummaries = (articles as Record<string, unknown>[])
      .map(
        (a, i) =>
          `Article ${i + 1}: ${a.title}\nSeverity: ${a.severity}\nPublished: ${a.published_at}\nContent: ${String(a.content || "").replace(/<[^>]+>/g, "").substring(0, 2000)}`
      )
      .join("\n\n---\n\n");

    const userPrompt = `Generate a ${report_type} threat intelligence report titled "${title}" (Classification: ${classification}) based on these ${articles.length} articles:\n\n${articleSummaries}`;

    const enResult = await callLLM(
      provider,
      geminiKey,
      openrouterKey,
      model,
      REPORT_SYSTEM_PROMPT,
      userPrompt
    );

    let contentEn: ReportContentEN;
    try {
      contentEn = parseJSONResponse(enResult.text) as unknown as ReportContentEN;
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

    // 9. Translate content to TH
    const thUserPrompt = `Translate this cybersecurity report to Thai:\n\n${JSON.stringify(contentEn, null, 2)}`;
    const thResult = await callLLM(
      provider,
      geminiKey,
      openrouterKey,
      model,
      TRANSLATE_SYSTEM_PROMPT,
      thUserPrompt
    );

    let contentTh: ReportContentEN;
    try {
      contentTh = parseJSONResponse(thResult.text) as unknown as ReportContentEN;
    } catch {
      contentTh = contentEn;
    }

    // Determine severity from articles
    const severityOrder = ["critical", "high", "medium", "low", "info"];
    const highestSeverity = (articles as Record<string, unknown>[]).reduce(
      (highest: string, a) => {
        const aIdx = severityOrder.indexOf(a.severity as string);
        const hIdx = severityOrder.indexOf(highest);
        return aIdx < hIdx ? (a.severity as string) : highest;
      },
      "info"
    );

    // 10. Update report with content + status "generated"
    const { data: updatedReport, error: updateErr } = await supabase
      .from("enterprise_reports")
      .update({
        subtitle: contentEn.subtitle ?? null,
        content_en: contentEn,
        content_th: contentTh,
        severity: highestSeverity,
        status: "generated",
        updated_at: new Date().toISOString(),
      })
      .eq("id", report.id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 11. Audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "enterprise_report_generated",
      entity_type: "enterprise_report",
      entity_id: report.id,
      details: {
        title,
        report_type,
        classification,
        article_count: article_ids.length,
        provider: enResult.provider,
        model: enResult.model,
        token_usage: enResult.tokenUsage + thResult.tokenUsage,
      },
    });

    // 12. Return report
    return NextResponse.json({
      success: true,
      report: updatedReport,
      provider: enResult.provider,
      model: enResult.model,
      token_usage: enResult.tokenUsage + thResult.tokenUsage,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: `Report generation failed: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 500 }
    );
  }
}
