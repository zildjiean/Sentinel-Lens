import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { callWithFallback } from "../_shared/llm-provider.ts";
import { ReportGenRequest } from "../_shared/types.ts";

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Parse request
    const { article_ids, title, report_type, classification } =
      (await req.json()) as ReportGenRequest;

    if (!article_ids?.length || !title) {
      return new Response(
        JSON.stringify({ error: "article_ids and title are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Fetch articles with translations
    const { data: articles, error: artErr } = await supabase
      .from("articles")
      .select("*, translations(*)")
      .in("id", article_ids);

    if (artErr || !articles?.length) {
      return new Response(
        JSON.stringify({ error: "No articles found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Build article summaries for the LLM
    const articleSummaries = articles
      .map(
        (a, i) =>
          `Article ${i + 1}: ${a.title}\nSeverity: ${a.severity}\nPublished: ${a.published_at}\nContent: ${a.content.replace(/<[^>]+>/g, "").substring(0, 2000)}`
      )
      .join("\n\n---\n\n");

    const userPrompt = `Generate a ${report_type} threat intelligence report titled "${title}" (Classification: ${classification}) based on these ${articles.length} articles:\n\n${articleSummaries}`;

    // 5. Generate English report
    const enResult = await callWithFallback(supabase, REPORT_SYSTEM_PROMPT, userPrompt);
    const contentEn = parseJSONResponse(enResult.text);

    // 6. Generate Thai translation
    const thUserPrompt = `Translate this cybersecurity report to Thai:\n\n${JSON.stringify(contentEn, null, 2)}`;
    const thResult = await callWithFallback(supabase, TRANSLATE_SYSTEM_PROMPT, thUserPrompt);
    const contentTh = parseJSONResponse(thResult.text);

    // 7. Determine overall severity
    const severityOrder = ["critical", "high", "medium", "low", "info"];
    const highestSeverity = articles.reduce((highest, a) => {
      const aIdx = severityOrder.indexOf(a.severity);
      const hIdx = severityOrder.indexOf(highest);
      return aIdx < hIdx ? a.severity : highest;
    }, "info");

    // 8. Insert report
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

    if (repErr) throw repErr;

    // 9. Insert report_articles junction
    const junctionRows = article_ids.map((article_id) => ({
      report_id: report.id,
      article_id,
    }));

    const { error: juncErr } = await supabase
      .from("report_articles")
      .insert(junctionRows);

    if (juncErr) {
      console.error("Junction insert error:", juncErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        report_id: report.id,
        provider: enResult.provider,
        model: enResult.model,
        token_usage: enResult.token_usage + thResult.token_usage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Report generation error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Report generation failed",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
