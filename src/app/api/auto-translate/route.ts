// src/app/api/auto-translate/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { translateArticle } from "@/lib/translation/translator";

export const maxDuration = 300; // 5 minutes for Vercel serverless

export async function POST(request: Request) {
  // Verify internal secret if configured
  const body = await request.json().catch(() => ({}));
  const expectedSecret = process.env.AUTO_TRANSLATE_SECRET;
  if (expectedSecret && body.secret !== expectedSecret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();

  // Query untranslated articles (LEFT JOIN where translation is missing)
  const { data: articles, error: queryError } = await supabase
    .from("articles")
    .select("id, title, content, excerpt, url")
    .eq("status", "new")
    .order("published_at", { ascending: false })
    .limit(20);

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  if (!articles || articles.length === 0) {
    return NextResponse.json({ translated: 0, failed: 0, total: 0 });
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
    return NextResponse.json({ translated: 0, failed: 0, total: 0 });
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

  return NextResponse.json({
    translated,
    failed,
    total: untranslated.length,
  });
}
