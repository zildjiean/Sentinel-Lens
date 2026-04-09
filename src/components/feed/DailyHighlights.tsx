"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { formatDateTimeTh } from "@/lib/utils/date";
import { Flame, Coffee, AlertTriangle, RefreshCw } from "lucide-react";

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

const IMPACT_STYLES: Record<string, { border: string; badge: string; badgeBg: string }> = {
  critical: { border: "border-l-red-500", badge: "CRITICAL", badgeBg: "bg-red-500" },
  high: { border: "border-l-orange-500", badge: "HIGH", badgeBg: "bg-orange-500" },
  notable: { border: "border-l-blue-500", badge: "NOTABLE", badgeBg: "bg-blue-500" },
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

  if (loading) {
    return (
      <section className="mb-8">
        <div className="bg-surface-container rounded-xl p-6 animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-6 bg-surface-container-high rounded" />
            <div className="h-5 w-40 bg-surface-container-high rounded" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-surface-container-high rounded-lg" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mb-8">
        <div className="bg-surface-container rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <span className="text-on-surface-variant text-sm">{error}</span>
            </div>
            <button
              onClick={fetchHighlights}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-primary hover:bg-surface-container-high rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              ลองใหม่
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!data) return null;

  if (!data.has_highlights) {
    return (
      <section className="mb-8">
        <div className="bg-surface-container rounded-xl p-6">
          <div className="text-center py-4">
            <div className="flex items-center justify-center gap-2.5 mb-3">
              <Coffee className="w-5 h-5 text-on-surface-variant" />
              <h2 className="text-base font-bold text-on-surface">ข่าวเด่นประจำวัน</h2>
            </div>
            <div className="bg-surface-container-high rounded-lg p-6 max-w-md mx-auto border border-outline-variant/20">
              <div className="text-2xl mb-2">✅</div>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                วันนี้ไม่มีข่าวที่น่าสนใจเป็นพิเศษ
              </p>
              {data.no_highlight_reason && (
                <p className="text-on-surface-variant/60 text-xs mt-1">
                  {data.no_highlight_reason}
                </p>
              )}
            </div>
            <p className="text-on-surface-variant/40 text-[11px] mt-3">
              อัปเดตล่าสุด {formatDateTimeTh(data.generated_at)} · ตรวจสอบอีกครั้งใน 4 ชม.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <div className="bg-surface-container rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-orange-400" />
            <div>
              <h2 className="text-base font-bold text-on-surface">ข่าวเด่นประจำวัน</h2>
              <p className="text-[11px] text-on-surface-variant/60">
                AI คัดเลือก · อัปเดตล่าสุด {formatDateTimeTh(data.generated_at)}
              </p>
            </div>
          </div>
          <span className="text-[11px] text-on-surface-variant bg-surface-container-high px-3 py-1 rounded-full border border-outline-variant/20">
            {data.highlights.length} รายการ
          </span>
        </div>

        <div className="space-y-3">
          {data.highlights.map((h) => {
            const style = IMPACT_STYLES[h.impact_level] || IMPACT_STYLES.notable;
            const article = h.article;
            if (!article) return null;

            return (
              <div
                key={h.article_id}
                className={`bg-surface-container-high rounded-lg border border-outline-variant/20 border-l-4 ${style.border} p-4`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`${style.badgeBg} text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide`}
                  >
                    {style.badge}
                  </span>
                  <span className="text-[11px] text-on-surface-variant/60">
                    {formatDistanceToNow(new Date(article.published_at), {
                      addSuffix: true,
                      locale: th,
                    })}
                  </span>
                </div>

                <Link
                  href={`/article/${article.id}`}
                  className="text-sm font-semibold text-on-surface hover:text-primary transition-colors leading-snug block mb-2"
                >
                  {article.title}
                </Link>

                <div className="text-xs text-on-surface-variant leading-relaxed mb-2.5 px-3 py-2 bg-surface-container rounded-md border-l-[3px] border-yellow-500/60">
                  <span className="text-yellow-500 font-semibold">AI: </span>
                  {h.reason_th}
                </div>

                {article.tags && article.tags.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {article.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] text-on-surface-variant/70 bg-surface-container px-2 py-0.5 rounded"
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
    </section>
  );
}
