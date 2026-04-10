// src/app/api/translate/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { translateArticle } from "@/lib/translation/translator";

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

    // Insert translation
    const { error: insertError } = await supabase.from("translations").insert({
      article_id,
      title_th: result.title_th,
      content_th: result.content_th,
      excerpt_th: result.excerpt_th,
      provider: result.provider,
      model: result.model,
      confidence: result.confidence,
      token_usage: result.token_usage,
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
      token_usage: result.token_usage,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Translation failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
