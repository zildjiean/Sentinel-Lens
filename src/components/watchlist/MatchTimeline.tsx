"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Inbox } from "lucide-react";
import { MatchCard } from "./MatchCard";
import type { WatchlistMatchWithArticle } from "@/lib/types/enterprise";

interface MatchTimelineProps {
  watchlistId: string;
}

const severityColors: Record<string, string> = {
  critical: "bg-error",
  high: "bg-tertiary",
  medium: "bg-primary",
  low: "bg-secondary",
  info: "bg-outline-variant",
};

export function MatchTimeline({ watchlistId }: MatchTimelineProps) {
  const [matches, setMatches] = useState<WatchlistMatchWithArticle[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchMatches = useCallback(
    async (pageNum: number, append = false) => {
      try {
        const res = await fetch(
          `/api/watchlists/${watchlistId}/matches?page=${pageNum}&limit=20`
        );
        const data = await res.json();
        if (append) {
          setMatches((prev) => [...prev, ...(data.matches ?? [])]);
        } else {
          setMatches(data.matches ?? []);
        }
        setTotal(data.total ?? 0);
      } catch {
        // ignore
      }
    },
    [watchlistId]
  );

  useEffect(() => {
    setLoading(true);
    fetchMatches(1, false).finally(() => setLoading(false));
  }, [fetchMatches]);

  async function loadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    await fetchMatches(nextPage, true);
    setPage(nextPage);
    setLoadingMore(false);
  }

  const hasMore = matches.length < total;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 gap-3">
        <Inbox size={36} className="text-outline-variant" />
        <p className="text-sm text-on-surface-variant font-body">No matches yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Vertical timeline */}
      <div className="relative">
        {/* Line */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-outline-variant/30" />

        <div className="space-y-4">
          {matches.map((match) => (
            <div key={match.id} className="relative">
              {/* Dot */}
              <div
                className={`absolute left-[-4px] top-5 w-2.5 h-2.5 rounded-full z-10 ${
                  severityColors[match.article.severity] ?? "bg-outline-variant"
                }`}
              />
              <MatchCard match={match} />
            </div>
          ))}
        </div>
      </div>

      {hasMore && (
        <div className="flex justify-center pt-6">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-container-high text-on-surface-variant text-sm font-body hover:bg-surface-container-highest transition-colors disabled:opacity-50"
          >
            {loadingMore && <Loader2 size={14} className="animate-spin" />}
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
