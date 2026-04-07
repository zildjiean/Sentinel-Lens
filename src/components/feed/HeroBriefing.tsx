import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { ArticleWithTranslation } from "@/lib/types/database";

interface HeroBriefingProps {
  activeThreats: number;
  criticalAlerts: number;
  highAlerts: number;
  translatedCount: number;
  latestArticles: ArticleWithTranslation[];
}

export function HeroBriefing({
  activeThreats = 0,
  criticalAlerts = 0,
  highAlerts = 0,
  translatedCount = 0,
  latestArticles = [],
}: HeroBriefingProps) {
  return (
    <Card variant="low" className="relative overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <h2 className="font-headline text-sm font-semibold text-on-surface-variant uppercase tracking-widest mb-6">
          Daily Intelligence Briefing
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Metrics */}
          <div className="lg:col-span-5">
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <p className="font-headline text-4xl font-extrabold text-on-surface">
                  {activeThreats}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">
                  Active Threats
                </p>
              </div>
              <div>
                <p className="font-headline text-4xl font-extrabold text-error">
                  {criticalAlerts}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">
                  Critical Alerts
                </p>
              </div>
              <div>
                <p className="font-headline text-4xl font-extrabold text-tertiary">
                  {highAlerts}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">
                  High Severity
                </p>
              </div>
              <div>
                <p className="font-headline text-4xl font-extrabold text-secondary">
                  {translatedCount}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">
                  Translated
                </p>
              </div>
            </div>

            {/* Severity breakdown bar */}
            {activeThreats > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-2">
                  Severity Distribution
                </p>
                <div className="flex h-2 rounded-full overflow-hidden bg-surface-container-high">
                  {criticalAlerts > 0 && (
                    <div
                      className="bg-error"
                      style={{ width: `${(criticalAlerts / activeThreats) * 100}%` }}
                    />
                  )}
                  {highAlerts > 0 && (
                    <div
                      className="bg-tertiary"
                      style={{ width: `${(highAlerts / activeThreats) * 100}%` }}
                    />
                  )}
                  <div className="bg-primary/40 flex-1" />
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1 text-[10px] text-on-surface-variant">
                    <span className="w-2 h-2 rounded-full bg-error inline-block" /> Critical
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-on-surface-variant">
                    <span className="w-2 h-2 rounded-full bg-tertiary inline-block" /> High
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-on-surface-variant">
                    <span className="w-2 h-2 rounded-full bg-primary/40 inline-block" /> Other
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Latest threats list */}
          <div className="lg:col-span-7">
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-3">
              Latest Threats
            </p>
            <div className="space-y-2">
              {latestArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/article/${article.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-container-high/50 transition-colors group"
                >
                  <Badge severity={article.severity} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-on-surface truncate group-hover:text-primary transition-colors">
                      {article.title}
                    </p>
                    <p className="text-[10px] text-on-surface-variant truncate">
                      {article.excerpt}
                    </p>
                  </div>
                  {article.translations && (
                    <span className="material-symbols-outlined text-sm text-secondary flex-shrink-0">
                      translate
                    </span>
                  )}
                  <span className="material-symbols-outlined text-sm text-on-surface-variant group-hover:text-primary transition-colors flex-shrink-0">
                    arrow_forward
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
