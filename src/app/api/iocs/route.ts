import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const iocSchema = z.object({
  type: z.enum(["ip", "domain", "hash_md5", "hash_sha256", "url", "email"]),
  value: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  severity: z.enum(["critical", "high", "medium", "low", "info"]).default("medium"),
  article_id: z.string().uuid().optional(),
  tags: z.array(z.string()).max(10).default([]),
});

// GET: List IOCs with optional filters
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const severity = searchParams.get("severity");
  const search = searchParams.get("search");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const offset = parseInt(searchParams.get("offset") || "0");

  let query = supabase
    .from("iocs")
    .select("*, articles(title)", { count: "exact" })
    .eq("is_active", true)
    .order("last_seen", { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) query = query.eq("type", type);
  if (severity) query = query.eq("severity", severity);
  if (search) query = query.or(`value.ilike.%${search}%,description.ilike.%${search}%`);

  const { data, count, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ iocs: data ?? [], total: count ?? 0 });
}

// POST: Create new IOC
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parseResult = iocSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid data", details: parseResult.error.flatten() }, { status: 400 });
  }

  const input = parseResult.data;

  // Check for duplicate
  const { data: existing } = await supabase
    .from("iocs")
    .select("id")
    .eq("type", input.type)
    .eq("value", input.value)
    .single();

  if (existing) {
    // Update last_seen
    await supabase
      .from("iocs")
      .update({ last_seen: new Date().toISOString(), is_active: true })
      .eq("id", existing.id);
    return NextResponse.json({ ioc_id: existing.id, updated: true });
  }

  const { data, error } = await supabase
    .from("iocs")
    .insert({
      ...input,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ioc_id: data.id });
}

// DELETE: Deactivate IOC
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "IOC ID is required" }, { status: 400 });

  await supabase
    .from("iocs")
    .update({ is_active: false })
    .eq("id", id);

  return NextResponse.json({ success: true });
}
