// src/app/api/watchlists/[id]/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateWatchlistSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  notify_mode: z.enum(["realtime", "batch"]).optional(),
  batch_interval_minutes: z.number().optional(),
  summary_level: z.enum(["short", "detailed"]).optional(),
  email_recipients: z.array(z.string().email()).min(1).optional(),
  is_active: z.boolean().optional(),
  keywords: z
    .array(
      z.object({
        keyword: z.string().min(1),
        match_mode: z.enum(["exact", "contains", "regex"]),
      })
    )
    .optional(),
});

// GET: Watchlist with keywords + recent 20 matches (joined with article)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: watchlist, error: watchlistErr } = await supabase
    .from("watchlists")
    .select("*, watchlist_keywords(*)")
    .eq("id", id)
    .eq("created_by", user.id)
    .single();

  if (watchlistErr || !watchlist) {
    return NextResponse.json({ error: "Watchlist not found" }, { status: 404 });
  }

  // Fetch recent 20 matches with article data
  const { data: matches } = await supabase
    .from("watchlist_matches")
    .select(
      `
      *,
      articles ( id, title, severity )
    `
    )
    .eq("watchlist_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({
    watchlist,
    matches: matches ?? [],
  });
}

// PUT: Update watchlist fields + replace keywords
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const { data: existing, error: fetchErr } = await supabase
    .from("watchlists")
    .select("id, created_by")
    .eq("id", id)
    .eq("created_by", user.id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Watchlist not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateWatchlistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { keywords, ...watchlistFields } = parsed.data;

  // Update watchlist fields
  const updates: Record<string, unknown> = { ...watchlistFields };

  if (Object.keys(updates).length > 0) {
    updates.updated_at = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from("watchlists")
      .update(updates)
      .eq("id", id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
  }

  // Replace keywords if provided
  if (keywords !== undefined) {
    // Delete old keywords
    await supabase.from("watchlist_keywords").delete().eq("watchlist_id", id);

    if (keywords.length > 0) {
      const keywordRows = keywords.map((kw) => ({
        watchlist_id: id,
        keyword: kw.keyword,
        match_mode: kw.match_mode,
      }));

      const { error: kwErr } = await supabase
        .from("watchlist_keywords")
        .insert(keywordRows);

      if (kwErr) {
        return NextResponse.json({ error: kwErr.message }, { status: 500 });
      }
    }
  }

  // Return updated watchlist with keywords
  const { data: updated } = await supabase
    .from("watchlists")
    .select("*, watchlist_keywords(*)")
    .eq("id", id)
    .single();

  return NextResponse.json({ watchlist: updated });
}

// DELETE: Soft delete (set is_active = false)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing, error: fetchErr } = await supabase
    .from("watchlists")
    .select("id, created_by")
    .eq("id", id)
    .eq("created_by", user.id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Watchlist not found" }, { status: 404 });
  }

  const { error: updateErr } = await supabase
    .from("watchlists")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
