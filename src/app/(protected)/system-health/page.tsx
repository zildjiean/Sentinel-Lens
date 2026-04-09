"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { type LucideIcon, CheckCircle, TriangleAlert, CircleAlert, CloudOff, HelpCircle, RefreshCw, Activity, Rss, FileText, Languages } from "lucide-react";
import { formatDateTimeTh } from "@/lib/utils/date";

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

const STATUS_ICONS: Record<string, LucideIcon> = {
  healthy: CheckCircle,
  configured: CheckCircle,
  degraded: TriangleAlert,
  error: CircleAlert,
  unreachable: CloudOff,
  not_configured: HelpCircle,
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
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
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
              {(() => {
                const StatusIcon = STATUS_ICONS[health.status] || HelpCircle;
                return <StatusIcon className={`w-8 h-8 ${STATUS_COLORS[health.status]}`} />;
              })()}
              <div>
                <h2 className="font-headline text-xl font-bold text-on-surface capitalize">
                  System {health.status}
                </h2>
                <p className="text-xs text-on-surface-variant">
                  Last checked: {lastChecked ? formatDateTimeTh(lastChecked) : "N/A"}
                </p>
              </div>
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {([
              { label: "Articles", value: health.stats.articles, icon: FileText },
              { label: "Translations", value: health.stats.translations, icon: Languages },
              { label: "Reports", value: health.stats.reports, icon: FileText },
            ] as { label: string; value: number; icon: LucideIcon }[]).map((s) => (
              <Card key={s.label} variant="low">
                <div className="flex items-center gap-3">
                  <s.icon className="w-5 h-5 text-primary" />
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
              <Activity className="w-5 h-5 text-primary" />
              Component Status
            </h3>
            <div className="divide-y divide-outline-variant/10">
              {Object.entries(health.checks).map(([name, check]) => (
                <div key={name} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const Icon = STATUS_ICONS[check.status] || HelpCircle;
                      return <Icon className={`w-5 h-5 ${STATUS_COLORS[check.status]}`} />;
                    })()}
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
              <Rss className="w-5 h-5 text-secondary" />
              RSS Source Connectivity
            </h3>
            <div className="divide-y divide-outline-variant/10">
              {health.sources.map((source) => (
                <div key={source.name} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const Icon = source.status === "healthy" ? CheckCircle : CircleAlert;
                      return <Icon className={`w-5 h-5 ${STATUS_COLORS[source.status] || "text-on-surface-variant"}`} />;
                    })()}
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
