import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: List saved searches
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("saved_searches")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ searches: data ?? [] });
}

// POST: Create saved search
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, query, filters, alert_enabled, alert_severity } = await request.json();

  if (!name || !query) {
    return NextResponse.json({ error: "Name and query are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("saved_searches")
    .insert({
      user_id: user.id,
      name,
      query,
      filters: filters || {},
      alert_enabled: alert_enabled || false,
      alert_severity: alert_severity || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ search: data });
}

// DELETE: Remove saved search
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  await supabase.from("saved_searches").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ success: true });
}
