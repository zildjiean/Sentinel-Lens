import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const body = await request.json();
  const { title, content, excerpt, severity, tags, author, url, image_url } = body;

  // Validate required fields
  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }
  if (!["critical", "high", "medium", "low", "info"].includes(severity)) {
    return NextResponse.json({ error: "Invalid severity level" }, { status: 400 });
  }

  // Insert article
  const { data: article, error } = await supabase
    .from("articles")
    .insert({
      title: title.trim(),
      content: content.trim(),
      excerpt: (excerpt || "").trim() || content.trim().substring(0, 200),
      severity,
      status: "new",
      tags: Array.isArray(tags) ? tags : [],
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

  return NextResponse.json({ success: true, article_id: article.id });
}
