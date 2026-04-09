"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { formatDateTimeTh } from "@/lib/utils/date";
import { Flame, ShieldCheck, AlertTriangle, RefreshCw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { ArticleSeverity } from "@/lib/types/database";

interface HighlightArticle {
  id: string;
  title: string;
  severity: string;
  excerpt: string | null;
  tags: string[] | null;
  published_at: string;
  url: string | null;
}

interface Highlight {
  article_id: string;
  reason_th: string;
  impact_level: "critical" | "high" | "notable";
  article: HighlightArticle | null;
}

interface DailyHighlightsResponse {
  has_highlights: boolean;
  highlights: Highlight[];
  no_highlight_reason: string | null;
  generated_at: string;
  is_cached: boolean;
  error?: string;
}

const IMPACT_CONFIG: Record<string, { border: string; severity: ArticleSeverity; accent: string }> = {
  critical: { border: "border-l-error", severity: "critical", accent: "bg-error" },
  high: { border: "border-l-tertiary", severity: "high", accent: "bg-tertiary" },
  notable: { border: "border-l-primary", severity: "medium", accent: "bg-primary" },
};

export function DailyHighlights() {
  const [data, setData] = useState<DailyHighlightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchHighlights() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/daily-highlights");
      if (!res.ok) {
        let message = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          message = body.error || message;
        } catch { /* non-JSON error response */ }
        throw new Error(message);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHighlights();
  }, []);

  // Loading skeleton — inline within HeroBriefing
  if (loading) {
    return (
      <div className="mb-8 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-5 h-5 bg-surface-container-high rounded" />
          <div className="h-4 w-40 bg-surface-container-high rounded" />
        </div>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-surface-container-high rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="mb-8 flex items-center justify-between py-3 px-4 rounded-lg bg-surface-container-high/50 border border-outline-variant/20">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-tertiary" />
          <span className="text-on-surface-variant text-xs">{error}</span>
        </div>
        <button
          onClick={fetchHighlights}
          className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-medium text-primary hover:bg-surface-container-high rounded-lg transition-colors duration-200"
        >
          <RefreshCw className="w-3 h-3" />
          ลองใหม่
        </button>
      </div>
    );
  }

  if (!data) return null;

  // No highlights — compact inline message
  if (!data.has_highlights) {
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-3">
          <Flame className="w-4 h-4 text-tertiary" />
          <h3 className="font-headline text-sm font-semibold text-on-surface-variant uppercase tracking-widest">
            Daily Highlights
          </h3>
        </div>
        <div className="flex items-center gap-3 py-4 px-5 rounded-lg bg-surface-container-high/50 border border-outline-variant/20">
          <ShieldCheck className="w-5 h-5 text-secondary flex-shrink-0" />
          <div className="flex-1">
            <p className="text-on-surface-variant text-sm">
              วันนี้ไม่มีข่าวที่น่าสนใจเป็นพิเศษ
            </p>
            {data.no_highlight_reason && (
              <p className="text-on-surface-variant/50 text-xs mt-0.5">
                {data.no_highlight_reason}
              </p>
            )}
          </div>
          <p className="text-[10px] text-on-surface-variant/40 flex-shrink-0">
            {formatDateTimeTh(data.generated_at)}
          </p>
        </div>
      </div>
    );
  }

  // Has highlights — inline cards
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Flame className="w-4 h-4 text-tertiary" />
          <div>
            <h3 className="font-headline text-sm font-semibold text-on-surface-variant uppercase tracking-widest">
              Daily Highlights
            </h3>
            <p className="text-[10px] text-on-surface-variant/50 mt-0.5">
              AI คัดเลือก · {formatDateTimeTh(data.generated_at)}
            </p>
          </div>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-widest text-on-surface-variant bg-surface-container-high px-3 py-1 rounded-full border border-outline-variant/20">
          {data.highlights.length} รายการ
        </span>
      </div>

      <div className="space-y-2.5">
        {data.highlights.map((h) => {
          const config = IMPACT_CONFIG[h.impact_level] || IMPACT_CONFIG.notable;
          const article = h.article;
          if (!article) return null;

          return (
            <div
              key={h.article_id}
              className={`bg-surface-container-high rounded-lg border border-outline-variant/20 border-l-4 ${config.border} p-4 hover:bg-surface-container-highest/50 transition-colors duration-200`}
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <Badge severity={config.severity} />
                <span className="text-[10px] text-on-surface-variant/60">
                  {formatDistanceToNow(new Date(article.published_at), {
                    addSuffix: true,
                    locale: th,
                  })}
                </span>
              </div>

              <Link
                href={`/article/${article.id}`}
                className={`font-headline text-sm font-bold leading-snug block mb-2 hover:text-primary transition-colors duration-200 ${
                  article.severity === "critical" ? "text-error" : "text-on-surface"
                }`}
              >
                {article.title}
              </Link>

              <div className="text-xs text-on-surface-variant leading-relaxed px-3 py-2 bg-surface-container-low rounded-md border-l-[3px] border-primary/40">
                <span className="text-primary font-semibold flex items-center gap-1 mb-0.5">
                  <Sparkles className="w-3 h-3" />
                  AI Analysis
                </span>
                <span className="leading-relaxed">{h.reason_th}</span>
              </div>

              {article.tags && article.tags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mt-2.5">
                  {article.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
