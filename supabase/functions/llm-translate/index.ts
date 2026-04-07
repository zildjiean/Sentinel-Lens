import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { callWithFallback } from "../_shared/llm-provider.ts";
import { TranslateRequest } from "../_shared/types.ts";

const SYSTEM_PROMPT = `You are a professional cybersecurity translator specializing in English-to-Thai translation.

Rules:
- Preserve all technical terms exactly as-is: CVE IDs, APT group names, malware names, IP addresses, URLs, file hashes, MITRE ATT&CK references, protocol names, software/product names.
- Keep proper nouns (organization names, person names, country names) in their original form.
- Use formal Thai suitable for government/enterprise security reports.
- Translate the full content faithfully without summarizing or omitting details.
- Return ONLY valid JSON with no additional text.

Return JSON in this exact format:
{
  "title_th": "translated title",
  "content_th": "translated full content",
  "excerpt_th": "translated excerpt (max 500 chars)"
}`;

function parseJSONResponse(text: string): Record<string, string> {
  // Strip markdown code fences if present
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

    const { article_id } = (await req.json()) as TranslateRequest;

    if (!article_id) {
      return new Response(
        JSON.stringify({ error: "article_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 1. Fetch the article
    const { data: article, error: artErr } = await supabase
      .from("articles")
      .select("*")
      .eq("id", article_id)
      .single();

    if (artErr || !article) {
      return new Response(
        JSON.stringify({ error: "Article not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Check if already translated
    const { data: existingTranslation } = await supabase
      .from("translations")
      .select("id")
      .eq("article_id", article_id)
      .single();

    if (existingTranslation) {
      return new Response(
        JSON.stringify({
          message: "Article already translated",
          translation_id: existingTranslation.id,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Build user prompt
    const plainContent = article.content.replace(/<[^>]+>/g, "");
    const userPrompt = `Translate the following cybersecurity article to Thai:

Title: ${article.title}

Content:
${plainContent}

Excerpt:
${article.excerpt}`;

    // 4. Call LLM
    const llmResult = await callWithFallback(supabase, SYSTEM_PROMPT, userPrompt);

    // 5. Parse response
    const parsed = parseJSONResponse(llmResult.text);

    if (!parsed.title_th || !parsed.content_th) {
      throw new Error("LLM response missing required fields (title_th, content_th)");
    }

    // 6. Insert translation
    const { data: translation, error: transErr } = await supabase
      .from("translations")
      .insert({
        article_id,
        title_th: parsed.title_th,
        content_th: parsed.content_th,
        excerpt_th: parsed.excerpt_th || "",
        provider: llmResult.provider,
        model: llmResult.model,
        confidence: 0.85,
        token_usage: llmResult.token_usage,
      })
      .select("id")
      .single();

    if (transErr) throw transErr;

    // 7. Update article status
    await supabase
      .from("articles")
      .update({ status: "translated" })
      .eq("id", article_id);

    return new Response(
      JSON.stringify({
        success: true,
        translation_id: translation.id,
        provider: llmResult.provider,
        model: llmResult.model,
        token_usage: llmResult.token_usage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Translation error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Translation failed",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
