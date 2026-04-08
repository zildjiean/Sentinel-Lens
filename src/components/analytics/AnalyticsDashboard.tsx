"use client";

import { Card } from "@/components/ui/Card";

interface AnalyticsDashboardProps {
  totalArticles: number;
  totalTranslations: number;
  totalReports: number;
  severityCounts: Record<string, number>;
  sourceData: { name: string; count: number }[];
  dailyData: { date: string; count: number }[];
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#FFB4AB",
  high: "#FFB783",
  medium: "#BBC6E2",
  low: "#4AE183",
  info: "#8E9196",
};

export function AnalyticsDashboard({
  totalArticles,
  totalTranslations,
  totalReports,
  severityCounts,
  sourceData,
  dailyData,
}: AnalyticsDashboardProps) {
  const maxDaily = Math.max(...dailyData.map((d) => d.count), 1);
  const maxSource = Math.max(...sourceData.map((s) => s.count), 1);
  const totalSeverity = Object.values(severityCounts).reduce((a, b) => a + b, 0) || 1;

  // SVG line chart points for daily trend
  const chartWidth = 600;
  const chartHeight = 200;
  const padding = 40;
  const points = dailyData.map((d, i) => ({
    x: padding + (i / (dailyData.length - 1)) * (chartWidth - padding * 2),
    y: chartHeight - padding - (d.count / maxDaily) * (chartHeight - padding * 2),
    ...d,
  }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`;

  // Donut chart for severity
  const severityEntries = Object.entries(severityCounts).filter(([, v]) => v > 0);
  let cumulativeAngle = 0;
  const donutSegments = severityEntries.map(([key, value]) => {
    const angle = (value / totalSeverity) * 360;
    const startAngle = cumulativeAngle;
    cumulativeAngle += angle;
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((startAngle + angle - 90) * Math.PI) / 180;
    const largeArc = angle > 180 ? 1 : 0;
    const outerR = 80;
    const innerR = 50;
    const x1 = 100 + outerR * Math.cos(startRad);
    const y1 = 100 + outerR * Math.sin(startRad);
    const x2 = 100 + outerR * Math.cos(endRad);
    const y2 = 100 + outerR * Math.sin(endRad);
    const x3 = 100 + innerR * Math.cos(endRad);
    const y3 = 100 + innerR * Math.sin(endRad);
    const x4 = 100 + innerR * Math.cos(startRad);
    const y4 = 100 + innerR * Math.sin(startRad);
    const d = `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;
    return { key, value, d, color: SEVERITY_COLORS[key] || "#8E9196" };
  });

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Articles", value: totalArticles, icon: "article", color: "text-primary" },
          { label: "Translations", value: totalTranslations, icon: "translate", color: "text-secondary" },
          { label: "Reports", value: totalReports, icon: "description", color: "text-tertiary" },
          { label: "Critical Threats", value: severityCounts.critical || 0, icon: "warning", color: "text-error" },
        ].map((kpi) => (
          <Card key={kpi.label} variant="low">
            <div className="flex items-center gap-3">
              <span className={`material-symbols-outlined text-2xl ${kpi.color}`}>{kpi.icon}</span>
              <div>
                <p className="font-headline text-2xl font-bold text-on-surface">{kpi.value}</p>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">{kpi.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Trend Line Chart */}
        <Card variant="low" className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-primary">trending_up</span>
            Article Trend (30 Days)
          </h3>
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = chartHeight - padding - ratio * (chartHeight - padding * 2);
              return (
                <g key={ratio}>
                  <line x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="var(--color-outline-variant)" strokeWidth="0.5" strokeDasharray="4 4" />
                  <text x={padding - 8} y={y + 4} textAnchor="end" fill="var(--color-on-surface-variant)" fontSize="10">
                    {Math.round(maxDaily * ratio)}
                  </text>
                </g>
              );
            })}
            {/* Area fill */}
            <path d={areaPath} fill="var(--color-primary)" opacity="0.1" />
            {/* Line */}
            <path d={linePath} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {/* Data points */}
            {points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--color-primary)" />
            ))}
            {/* X-axis labels (every 7 days) */}
            {points.filter((_, i) => i % 7 === 0).map((p) => (
              <text key={p.date} x={p.x} y={chartHeight - 10} textAnchor="middle" fill="var(--color-on-surface-variant)" fontSize="9">
                {p.date.slice(5)}
              </text>
            ))}
          </svg>
        </Card>

        {/* Severity Donut Chart */}
        <Card variant="low">
          <h3 className="text-sm font-semibold text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-error">shield</span>
            Severity Distribution
          </h3>
          <div className="flex flex-col items-center">
            <svg viewBox="0 0 200 200" className="w-40 h-40">
              {donutSegments.map((seg) => (
                <path key={seg.key} d={seg.d} fill={seg.color} opacity="0.85" />
              ))}
              <text x="100" y="95" textAnchor="middle" fill="var(--color-on-surface)" fontSize="24" fontWeight="bold">
                {totalArticles}
              </text>
              <text x="100" y="115" textAnchor="middle" fill="var(--color-on-surface-variant)" fontSize="10">
                Total
              </text>
            </svg>
            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {severityEntries.map(([key, value]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[key] }} />
                  <span className="text-xs text-on-surface-variant capitalize">{key} ({value})</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Source Distribution Bar Chart */}
      <Card variant="low">
        <h3 className="text-sm font-semibold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-secondary">rss_feed</span>
          Articles by Source
        </h3>
        <div className="space-y-3">
          {sourceData.map((source) => (
            <div key={source.name} className="flex items-center gap-3">
              <span className="text-xs text-on-surface-variant w-32 truncate text-right">{source.name}</span>
              <div className="flex-1 h-6 bg-surface-container-high rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500"
                  style={{ width: `${(source.count / maxSource) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-on-surface w-8">{source.count}</span>
            </div>
          ))}
          {sourceData.length === 0 && (
            <p className="text-sm text-on-surface-variant text-center py-4">No source data available</p>
          )}
        </div>
      </Card>
    </div>
  );
}
