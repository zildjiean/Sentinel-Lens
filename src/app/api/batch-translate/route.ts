import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { article_ids } = await request.json();
  if (!article_ids?.length) {
    return NextResponse.json({ error: "article_ids required" }, { status: 400 });
  }

  // Limit batch size
  const ids = article_ids.slice(0, 10);
  const results: { id: string; status: string; error?: string }[] = [];

  for (const articleId of ids) {
    try {
      // Call the existing translate endpoint
      const res = await fetch(new URL("/api/translate", request.url).toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: request.headers.get("cookie") || "",
        },
        body: JSON.stringify({ article_id: articleId }),
      });

      if (res.ok) {
        results.push({ id: articleId, status: "success" });
      } else {
        const data = await res.json();
        results.push({ id: articleId, status: "error", error: data.error });
      }
    } catch (err) {
      results.push({ id: articleId, status: "error", error: err instanceof Error ? err.message : String(err) });
    }
  }

  const successCount = results.filter((r) => r.status === "success").length;
  return NextResponse.json({
    success: true,
    total: ids.length,
    translated: successCount,
    failed: ids.length - successCount,
    results,
  });
}
