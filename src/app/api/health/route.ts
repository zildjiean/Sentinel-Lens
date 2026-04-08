import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const checks: Record<string, { status: string; detail: string; latency?: number }> = {};

  // 1. Database connection check
  const dbStart = Date.now();
  try {
    const { error } = await supabase.from("articles").select("id", { count: "exact", head: true });
    checks.database = {
      status: error ? "error" : "healthy",
      detail: error ? error.message : "Connected",
      latency: Date.now() - dbStart,
    };
  } catch (e) {
    checks.database = { status: "error", detail: String(e), latency: Date.now() - dbStart };
  }

  // 2. RSS Sources health
  const { data: sources } = await supabase
    .from("rss_sources")
    .select("id, name, url, is_active, last_fetched_at")
    .eq("is_active", true);

  const sourceChecks: { name: string; status: string; lastFetched: string | null }[] = [];
  for (const source of sources ?? []) {
    try {
      const res = await fetch(source.url, {
        method: "HEAD",
        headers: { "User-Agent": "SentinelLens/1.0" },
        signal: AbortSignal.timeout(5000),
      });
      sourceChecks.push({
        name: source.name,
        status: res.ok ? "healthy" : `HTTP ${res.status}`,
        lastFetched: source.last_fetched_at,
      });
    } catch {
      sourceChecks.push({
        name: source.name,
        status: "unreachable",
        lastFetched: source.last_fetched_at,
      });
    }
  }

  checks.rss_sources = {
    status: sourceChecks.every((s) => s.status === "healthy") ? "healthy" :
            sourceChecks.some((s) => s.status === "healthy") ? "degraded" : "error",
    detail: `${sourceChecks.filter((s) => s.status === "healthy").length}/${sourceChecks.length} sources healthy`,
  };

  // 3. LLM API check
  const { data: settings } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", ["llm_provider", "gemini_api_key", "openrouter_api_key", "llm_api_keys"]);

  const providerSetting = settings?.find((s) => s.key === "llm_provider");
  const provider = String(providerSetting?.value || "gemini").replace(/"/g, "");
  const keysSetting = settings?.find((s) => s.key === "llm_api_keys");
  const keys = (keysSetting?.value as Record<string, string>) || {};
  const geminiKeySetting = settings?.find((s) => s.key === "gemini_api_key");
  const openrouterKeySetting = settings?.find((s) => s.key === "openrouter_api_key");

  const geminiKey = keys.gemini || String(geminiKeySetting?.value || "").replace(/"/g, "") || process.env.GEMINI_API_KEY || "";
  const openrouterKey = keys.openrouter || String(openrouterKeySetting?.value || "").replace(/"/g, "") || process.env.OPENROUTER_API_KEY || "";
  const activeKey = provider === "gemini" ? geminiKey : openrouterKey;

  checks.llm_api = {
    status: activeKey ? "configured" : "not_configured",
    detail: activeKey ? `${provider} API key configured` : `No API key for ${provider}`,
  };

  // 4. Storage stats
  const { count: articleCount } = await supabase
    .from("articles")
    .select("id", { count: "exact", head: true });

  const { count: translationCount } = await supabase
    .from("translations")
    .select("id", { count: "exact", head: true });

  const { count: reportCount } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true });

  const overallStatus = Object.values(checks).every((c) =>
    c.status === "healthy" || c.status === "configured"
  ) ? "healthy" : Object.values(checks).some((c) => c.status === "error" || c.status === "not_configured") ? "degraded" : "healthy";

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
    sources: sourceChecks,
    stats: {
      articles: articleCount ?? 0,
      translations: translationCount ?? 0,
      reports: reportCount ?? 0,
    },
  });
}
