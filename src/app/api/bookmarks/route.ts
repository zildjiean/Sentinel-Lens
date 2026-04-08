import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("bookmarks")
    .select("*, articles(id, title, severity, excerpt, published_at, tags)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ bookmarks: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { article_id, note } = await request.json();
  if (!article_id) return NextResponse.json({ error: "article_id required" }, { status: 400 });

  // Check if already bookmarked
  const { data: existing } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", user.id)
    .eq("article_id", article_id)
    .single();

  if (existing) {
    // Update note
    const { error } = await supabase
      .from("bookmarks")
      .update({ note: note || null })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, action: "updated" });
  }

  const { error } = await supabase
    .from("bookmarks")
    .insert({ user_id: user.id, article_id, note: note || null });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, action: "created" });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { article_id } = await request.json();
  if (!article_id) return NextResponse.json({ error: "article_id required" }, { status: 400 });

  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("user_id", user.id)
    .eq("article_id", article_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
