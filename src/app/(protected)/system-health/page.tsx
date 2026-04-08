"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

interface HealthData {
  status: string;
  timestamp: string;
  checks: Record<string, { status: string; detail: string; latency?: number }>;
  sources: { name: string; status: string; lastFetched: string | null }[];
  stats: { articles: number; translations: number; reports: number };
}

const STATUS_COLORS: Record<string, string> = {
  healthy: "text-secondary",
  configured: "text-secondary",
  degraded: "text-tertiary",
  error: "text-error",
  unreachable: "text-error",
  not_configured: "text-tertiary",
};

const STATUS_ICONS: Record<string, string> = {
  healthy: "check_circle",
  configured: "check_circle",
  degraded: "warning",
  error: "error",
  unreachable: "cloud_off",
  not_configured: "help",
};

export default function SystemHealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  async function loadHealth() {
    setLoading(true);
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
        setLastChecked(new Date());
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => { loadHealth(); }, []);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold text-on-surface tracking-tight mb-2">
            System Health
          </h1>
          <p className="text-sm text-on-surface-variant">
            Monitor platform components and RSS source connectivity
          </p>
        </div>
        <button
          onClick={loadHealth}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container-high text-on-surface-variant hover:text-on-surface text-sm font-medium transition-colors disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-lg ${loading ? "animate-spin" : ""}`}>
            refresh
          </span>
          {loading ? "Checking..." : "Refresh"}
        </button>
      </div>

      {health && (
        <>
          {/* Overall Status */}
          <Card variant="low" className={`border-l-4 ${
            health.status === "healthy" ? "border-secondary" : "border-tertiary"
          }`}>
            <div className="flex items-center gap-4">
              <span className={`material-symbols-outlined text-3xl ${STATUS_COLORS[health.status]}`}>
                {STATUS_ICONS[health.status]}
              </span>
              <div>
                <h2 className="font-headline text-xl font-bold text-on-surface capitalize">
                  System {health.status}
                </h2>
                <p className="text-xs text-on-surface-variant">
                  Last checked: {lastChecked?.toLocaleString() || "N/A"}
                </p>
              </div>
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Articles", value: health.stats.articles, icon: "article" },
              { label: "Translations", value: health.stats.translations, icon: "translate" },
              { label: "Reports", value: health.stats.reports, icon: "description" },
            ].map((s) => (
              <Card key={s.label} variant="low">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-xl text-primary">{s.icon}</span>
                  <div>
                    <p className="font-headline text-2xl font-bold text-on-surface">{s.value}</p>
                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">{s.label}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Component Checks */}
          <Card variant="low">
            <h3 className="text-sm font-semibold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-primary">monitoring</span>
              Component Status
            </h3>
            <div className="divide-y divide-outline-variant/10">
              {Object.entries(health.checks).map(([name, check]) => (
                <div key={name} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-lg ${STATUS_COLORS[check.status]}`}>
                      {STATUS_ICONS[check.status] || "info"}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-on-surface capitalize">
                        {name.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-on-surface-variant">{check.detail}</p>
                    </div>
                  </div>
                  {check.latency !== undefined && (
                    <span className="text-xs text-on-surface-variant">{check.latency}ms</span>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* RSS Source Status */}
          <Card variant="low">
            <h3 className="text-sm font-semibold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-secondary">rss_feed</span>
              RSS Source Connectivity
            </h3>
            <div className="divide-y divide-outline-variant/10">
              {health.sources.map((source) => (
                <div key={source.name} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-lg ${STATUS_COLORS[source.status] || "text-on-surface-variant"}`}>
                      {source.status === "healthy" ? "check_circle" : "error"}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-on-surface">{source.name}</p>
                      <p className="text-xs text-on-surface-variant">
                        {source.lastFetched
                          ? `Last fetched: ${new Date(source.lastFetched).toLocaleString()}`
                          : "Never fetched"}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    source.status === "healthy"
                      ? "bg-secondary/10 text-secondary"
                      : "bg-error/10 text-error"
                  }`}>
                    {source.status}
                  </span>
                </div>
              ))}
              {health.sources.length === 0 && (
                <p className="text-sm text-on-surface-variant text-center py-4">No active RSS sources</p>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
