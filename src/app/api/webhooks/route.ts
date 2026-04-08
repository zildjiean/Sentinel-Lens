import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: List webhook configs
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("webhook_configs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ webhooks: data ?? [] });
}

// POST: Create/update webhook config
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, url, type, events, is_active } = await request.json();

  if (!name || !url || !type) {
    return NextResponse.json({ error: "Name, URL, and type are required" }, { status: 400 });
  }

  // Validate URL
  try { new URL(url); } catch {
    return NextResponse.json({ error: "Invalid webhook URL" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("webhook_configs")
    .insert({
      user_id: user.id,
      name,
      url,
      type, // "slack" | "discord" | "line" | "custom"
      events: events || ["critical_article"],
      is_active: is_active !== false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ webhook: data });
}

// DELETE: Remove webhook
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  await supabase.from("webhook_configs").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ success: true });
}
