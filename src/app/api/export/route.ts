import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "csv";
  const severity = url.searchParams.get("severity");
  const days = url.searchParams.get("days");

  let query = supabase
    .from("articles")
    .select("id, title, severity, status, author, url, published_at, tags, excerpt, content")
    .order("published_at", { ascending: false });

  if (severity) query = query.eq("severity", severity);
  if (days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(days));
    query = query.gte("published_at", cutoff.toISOString());
  }

  const { data: articles, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!articles?.length) return NextResponse.json({ error: "No articles found" }, { status: 404 });

  if (format === "csv") {
    const headers = ["ID", "Title", "Severity", "Status", "Author", "URL", "Published", "Tags"];
    const rows = articles.map((a) => [
      a.id,
      `"${(a.title || "").replace(/"/g, '""')}"`,
      a.severity,
      a.status,
      `"${(a.author || "").replace(/"/g, '""')}"`,
      a.url || "",
      a.published_at,
      `"${(a.tags || []).join(", ")}"`,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="sentinel-lens-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  if (format === "stix") {
    // STIX 2.1 Bundle format
    const stixObjects = articles.map((a) => ({
      type: "indicator",
      spec_version: "2.1",
      id: `indicator--${a.id}`,
      created: a.published_at,
      modified: a.published_at,
      name: a.title,
      description: a.excerpt || "",
      indicator_types: mapSeverityToIndicatorType(a.severity),
      pattern: `[url:value = '${a.url || "unknown"}']`,
      pattern_type: "stix",
      valid_from: a.published_at,
      labels: a.tags || [],
      confidence: mapSeverityToConfidence(a.severity),
      external_references: a.url
        ? [{ source_name: "Sentinel Lens", url: a.url }]
        : [],
    }));

    const bundle = {
      type: "bundle",
      id: `bundle--${crypto.randomUUID()}`,
      objects: stixObjects,
    };

    return new Response(JSON.stringify(bundle, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="sentinel-lens-stix-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  }

  // JSON format
  return new Response(JSON.stringify(articles, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="sentinel-lens-export-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}

function mapSeverityToIndicatorType(severity: string): string[] {
  switch (severity) {
    case "critical": return ["malicious-activity"];
    case "high": return ["malicious-activity", "anomalous-activity"];
    case "medium": return ["anomalous-activity"];
    default: return ["benign"];
  }
}

function mapSeverityToConfidence(severity: string): number {
  switch (severity) {
    case "critical": return 95;
    case "high": return 80;
    case "medium": return 60;
    case "low": return 40;
    default: return 20;
  }
}
