import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: Find related articles based on shared tags
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Get the source article's tags
  const { data: article } = await supabase
    .from("articles")
    .select("tags")
    .eq("id", id)
    .single();

  if (!article || !article.tags?.length) {
    return NextResponse.json({ related: [] });
  }

  // Find articles that share at least 1 tag, ordered by published_at
  const { data: candidates } = await supabase
    .from("articles")
    .select("id, title, severity, published_at, tags, excerpt")
    .neq("id", id)
    .overlaps("tags", article.tags)
    .order("published_at", { ascending: false })
    .limit(20);

  if (!candidates?.length) {
    return NextResponse.json({ related: [] });
  }

  // Score by number of shared tags
  const sourceTags = new Set(article.tags);
  const scored = candidates.map((c) => {
    const sharedTags = (c.tags || []).filter((t: string) => sourceTags.has(t));
    return { ...c, shared_tags: sharedTags, shared_count: sharedTags.length };
  });

  // Sort by shared count desc, then recency
  scored.sort((a, b) => b.shared_count - a.shared_count ||
    new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );

  return NextResponse.json({ related: scored.slice(0, 5) });
}
