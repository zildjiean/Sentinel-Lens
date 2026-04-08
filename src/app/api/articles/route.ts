import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const articleSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(50000),
  excerpt: z.string().max(1000).optional().default(""),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  tags: z.array(z.string().max(50)).max(10).optional().default([]),
  author: z.string().max(200).nullable().optional(),
  url: z.string().url().max(2048).nullable().optional(),
  image_url: z.string().url().max(2048).nullable().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role === "viewer") {
    return NextResponse.json({ error: "Forbidden. Analyst or Admin role required." }, { status: 403 });
  }

  const parseResult = articleSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid request", details: parseResult.error.flatten() }, { status: 400 });
  }
  const { title, content, excerpt, severity, tags, author, url, image_url } = parseResult.data;

  // Insert article
  const { data: article, error } = await supabase
    .from("articles")
    .insert({
      title: title.trim(),
      content: content.trim(),
      excerpt: excerpt.trim() || content.trim().substring(0, 200),
      severity,
      status: "new",
      tags,
      author: author?.trim() || null,
      url: url?.trim() || null,
      image_url: image_url?.trim() || null,
      is_manual: true,
      created_by: user.id,
      source_id: null,
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log to audit
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "create",
    entity_type: "article",
    entity_id: article.id,
    details: { title: title.trim(), severity, is_manual: true },
  }).then(() => {});

  // Trigger revalidation for feed page
  revalidatePath("/");

  return NextResponse.json({ success: true, article_id: article.id });
}
