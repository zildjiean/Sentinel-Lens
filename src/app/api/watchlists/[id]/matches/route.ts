// src/app/api/watchlists/[id]/matches/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: Paginated match history for a watchlist
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify watchlist ownership
  const { data: watchlist, error: watchlistErr } = await supabase
    .from("watchlists")
    .select("id")
    .eq("id", id)
    .eq("created_by", user.id)
    .single();

  if (watchlistErr || !watchlist) {
    return NextResponse.json({ error: "Watchlist not found" }, { status: 404 });
  }

  // Parse pagination params
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10))
  );
  const offset = (page - 1) * limit;

  // Get total count
  const { count, error: countErr } = await supabase
    .from("watchlist_matches")
    .select("id", { count: "exact", head: true })
    .eq("watchlist_id", id);

  if (countErr) {
    return NextResponse.json({ error: countErr.message }, { status: 500 });
  }

  // Fetch paginated matches with article join
  const { data: matches, error: matchErr } = await supabase
    .from("watchlist_matches")
    .select(
      `
      *,
      articles (
        id,
        title,
        severity,
        excerpt,
        source_url,
        published_at
      )
    `
    )
    .eq("watchlist_id", id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (matchErr) {
    return NextResponse.json({ error: matchErr.message }, { status: 500 });
  }

  return NextResponse.json({
    matches: matches ?? [],
    total: count ?? 0,
    page,
    limit,
  });
}
