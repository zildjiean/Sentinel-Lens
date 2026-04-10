// src/lib/translation/auto-translate.ts

import { createClient } from "@/lib/supabase/server";
import { translateArticle } from "@/lib/translation/translator";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface AutoTranslateResult {
  translated: number;
  failed: number;
  total: number;
}

export async function autoTranslateBatch(supabase: SupabaseClient): Promise<AutoTranslateResult> {
  // Query untranslated articles
  const { data: articles, error: queryError } = await supabase
    .from("articles")
    .select("id, title, content, excerpt, url")
    .eq("status", "new")
    .order("published_at", { ascending: false })
    .limit(20);

  if (queryError) {
    throw new Error(`Query failed: ${queryError.message}`);
  }

  if (!articles || articles.length === 0) {
    return { translated: 0, failed: 0, total: 0 };
  }

  // Filter out articles that already have translations
  const articleIds = articles.map((a) => a.id);
  const { data: existingTranslations } = await supabase
    .from("translations")
    .select("article_id")
    .in("article_id", articleIds);

  const translatedIds = new Set(existingTranslations?.map((t) => t.article_id) || []);
  const untranslated = articles.filter((a) => !translatedIds.has(a.id));

  if (untranslated.length === 0) {
    return { translated: 0, failed: 0, total: 0 };
  }

  let translated = 0;
  let failed = 0;

  for (const article of untranslated) {
    try {
      const result = await translateArticle(
        {
          title: article.title,
          content: article.content,
          excerpt: article.excerpt,
          url: article.url,
        },
        supabase
      );

      const { error: insertError } = await supabase.from("translations").insert({
        article_id: article.id,
        title_th: result.title_th,
        content_th: result.content_th,
        excerpt_th: result.excerpt_th,
        provider: result.provider,
        model: result.model,
        confidence: result.confidence,
        token_usage: result.token_usage,
      });

      if (insertError) {
        console.warn(`Auto-translate insert failed for article ${article.id}:`, insertError.message);
        failed++;
        continue;
      }

      await supabase
        .from("articles")
        .update({ status: "translated" })
        .eq("id", article.id);

      translated++;
    } catch (err) {
      console.warn(
        `Auto-translate failed for article ${article.id}:`,
        err instanceof Error ? err.message : String(err)
      );
      failed++;
    }
  }

  return { translated, failed, total: untranslated.length };
}
