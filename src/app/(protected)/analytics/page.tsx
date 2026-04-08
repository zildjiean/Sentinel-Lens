import { createClient } from "@/lib/supabase/server";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";

export const revalidate = 300; // Cache for 5 minutes

export default async function AnalyticsPage() {
  const supabase = await createClient();

  // Limit to last 1000 articles for performance
  const { data: articles } = await supabase
    .from("articles")
    .select("id, severity, status, published_at, source_id")
    .order("published_at", { ascending: false })
    .limit(1000);

  // Get sources for mapping
  const { data: sources } = await supabase
    .from("rss_sources")
    .select("id, name");

  // Get translation count
  const { count: translationCount } = await supabase
    .from("translations")
    .select("id", { count: "exact", head: true });

  // Get report count
  const { count: reportCount } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true });

  // Process data for charts
  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  const sourceCounts: Record<string, number> = {};
  const dailyCounts: Record<string, number> = {};
  const sourceMap = new Map((sources ?? []).map((s: { id: string; name: string }) => [s.id, s.name]));

  for (const a of articles ?? []) {
    // Severity
    severityCounts[a.severity as keyof typeof severityCounts] =
      (severityCounts[a.severity as keyof typeof severityCounts] || 0) + 1;

    // Source
    const sourceName = sourceMap.get(a.source_id) || "Unknown";
    sourceCounts[sourceName] = (sourceCounts[sourceName] || 0) + 1;

    // Daily (last 30 days)
    const date = new Date(a.published_at).toISOString().split("T")[0];
    dailyCounts[date] = (dailyCounts[date] || 0) + 1;
  }

  // Fill in missing days for last 30 days
  const dailyData = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    dailyData.push({ date: key, count: dailyCounts[key] || 0 });
  }

  const sourceData = Object.entries(sourceCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold text-on-surface tracking-tight mb-2">
          Analytics Dashboard
        </h1>
        <p className="text-sm text-on-surface-variant">
          Threat intelligence metrics and trends
        </p>
      </div>
      <AnalyticsDashboard
        totalArticles={articles?.length ?? 0}
        totalTranslations={translationCount ?? 0}
        totalReports={reportCount ?? 0}
        severityCounts={severityCounts}
        sourceData={sourceData}
        dailyData={dailyData}
      />
    </div>
  );
}
