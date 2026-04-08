import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  // Verify cron secret (Vercel sends this header for cron jobs)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  // Check schedule setting
  const { data: scheduleSetting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "rss_schedule")
    .single();

  const schedule = String(scheduleSetting?.value || "manual").replace(/"/g, "");
  if (schedule === "manual") {
    return NextResponse.json({ message: "RSS schedule is set to manual. Skipping." });
  }

  // Get active RSS sources
  const { data: sources, error: srcErr } = await supabase
    .from("rss_sources")
    .select("*")
    .eq("is_active", true);

  if (srcErr || !sources?.length) {
    return NextResponse.json({ message: "No active RSS sources" });
  }

  // Call the main RSS fetch endpoint internally
  try {
    const fetchUrl = new URL("/api/rss-fetch", request.url);
    const res = await fetch(fetchUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: request.headers.get("cookie") || "",
      },
      body: JSON.stringify({}),
    });

    const data = await res.json();

    // Log the cron execution
    await supabase.from("audit_logs").insert({
      user_id: null,
      action: "cron_rss_fetch",
      entity_type: "system",
      details: {
        schedule,
        result: data,
        sources_count: sources.length,
      },
    }).then(() => {});

    return NextResponse.json({
      success: true,
      schedule,
      ...data,
    });
  } catch (err) {
    return NextResponse.json({
      error: `Cron RSS fetch failed: ${err instanceof Error ? err.message : String(err)}`,
    }, { status: 500 });
  }
}
