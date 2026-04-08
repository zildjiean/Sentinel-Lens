import { createClient } from "@/lib/supabase/server";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";

export const revalidate = 300; // Cache for 5 minutes

export default async function AnalyticsPage() {
  const supabase = await createClient();

  // Parallel queries — use count queries and limit data fetch to 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffDate = thirtyDaysAgo.toISOString();

  const [
    articlesResult,
    sourcesResult,
    translationResult,
    reportResult,
    // Severity counts via separate count queries (much faster than fetching 1000 rows)
    criticalResult,
    highResult,
    mediumResult,
    lowResult,
    infoResult,
  ] = await Promise.all([
    // Only fetch last 30 days for daily chart + source breakdown
    supabase
      .from("articles")
      .select("severity, published_at, source_id")
      .gte("published_at", cutoffDate)
      .order("published_at", { ascending: false })
      .limit(500),
    supabase.from("rss_sources").select("id, name"),
    supabase.from("translations").select("id", { count: "exact", head: true }),
    supabase.from("reports").select("id", { count: "exact", head: true }),
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("severity", "critical"),
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("severity", "high"),
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("severity", "medium"),
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("severity", "low"),
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("severity", "info"),
  ]);

  const articles = articlesResult.data ?? [];
  const sources = sourcesResult.data ?? [];
  const totalArticles = (criticalResult.count ?? 0) + (highResult.count ?? 0) + (mediumResult.count ?? 0) + (lowResult.count ?? 0) + (infoResult.count ?? 0);

  const severityCounts = {
    critical: criticalResult.count ?? 0,
    high: highResult.count ?? 0,
    medium: mediumResult.count ?? 0,
    low: lowResult.count ?? 0,
    info: infoResult.count ?? 0,
  };

  // Process 30-day data for charts
  const sourceCounts: Record<string, number> = {};
  const dailyCounts: Record<string, number> = {};
  const sourceMap = new Map(sources.map((s: { id: string; name: string }) => [s.id, s.name]));

  for (const a of articles) {
    const sourceName = sourceMap.get(a.source_id) || "Unknown";
    sourceCounts[sourceName] = (sourceCounts[sourceName] || 0) + 1;
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
        totalArticles={totalArticles}
        totalTranslations={translationResult.count ?? 0}
        totalReports={reportResult.count ?? 0}
        severityCounts={severityCounts}
        sourceData={sourceData}
        dailyData={dailyData}
      />
    </div>
  );
}
