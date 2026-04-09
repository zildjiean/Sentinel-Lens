// src/app/api/watchlists/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const createWatchlistSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  notify_mode: z.enum(["realtime", "batch"]),
  batch_interval_minutes: z.number().optional().default(30),
  summary_level: z.enum(["short", "detailed"]),
  email_recipients: z.array(z.string().email()).min(1),
  keywords: z
    .array(
      z.object({
        keyword: z.string().min(1),
        match_mode: z.enum(["exact", "contains", "regex"]),
      })
    )
    .min(1),
});

// GET: List watchlists for current user with keyword_count and match_count
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: watchlists, error } = await supabase
    .from("watchlists")
    .select(
      `
      *,
      watchlist_keywords ( count ),
      watchlist_matches ( count )
    `
    )
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Reshape count sub-selects into flat numbers
  const result = (watchlists ?? []).map((w) => {
    const kwArr = w.watchlist_keywords as unknown as { count: number }[];
    const matchArr = w.watchlist_matches as unknown as { count: number }[];
    return {
      ...w,
      watchlist_keywords: undefined,
      watchlist_matches: undefined,
      keyword_count: kwArr?.[0]?.count ?? 0,
      match_count: matchArr?.[0]?.count ?? 0,
    };
  });

  return NextResponse.json({ watchlists: result });
}

// POST: Create watchlist + keywords
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Role check — analyst or admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "viewer") {
    return NextResponse.json(
      { error: "Forbidden. Analyst or Admin role required." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createWatchlistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const {
    name,
    description,
    notify_mode,
    batch_interval_minutes,
    summary_level,
    email_recipients,
    keywords,
  } = parsed.data;

  // Insert watchlist
  const { data: watchlist, error: watchlistErr } = await supabase
    .from("watchlists")
    .insert({
      name,
      description: description ?? null,
      notify_mode,
      batch_interval_minutes,
      summary_level,
      email_recipients,
      created_by: user.id,
      is_active: true,
    })
    .select()
    .single();

  if (watchlistErr || !watchlist) {
    return NextResponse.json(
      { error: watchlistErr?.message ?? "Failed to create watchlist" },
      { status: 500 }
    );
  }

  // Bulk insert keywords
  const keywordRows = keywords.map((kw) => ({
    watchlist_id: watchlist.id,
    keyword: kw.keyword,
    match_mode: kw.match_mode,
  }));

  const { data: insertedKeywords, error: kwErr } = await supabase
    .from("watchlist_keywords")
    .insert(keywordRows)
    .select();

  if (kwErr) {
    // Rollback watchlist if keywords fail
    await supabase.from("watchlists").delete().eq("id", watchlist.id);
    return NextResponse.json({ error: kwErr.message }, { status: 500 });
  }

  return NextResponse.json(
    { watchlist, keywords: insertedKeywords },
    { status: 201 }
  );
}
