"use client";

import { useState } from "react";
import Link from "next/link";
import { Edit2, Pause, Play, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { WatchlistWithStats, WatchlistKeyword } from "@/lib/types/enterprise";

interface WatchlistCardProps {
  watchlist: WatchlistWithStats & { watchlist_keywords: WatchlistKeyword[] };
  onUpdate: () => void;
}

export function WatchlistCard({ watchlist, onUpdate }: WatchlistCardProps) {
  const [loading, setLoading] = useState(false);

  const visibleKeywords = watchlist.watchlist_keywords.slice(0, 3);
  const extraCount = watchlist.watchlist_keywords.length - 3;

  async function toggleActive() {
    setLoading(true);
    try {
      await fetch(`/api/watchlists/${watchlist.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !watchlist.is_active }),
      });
      onUpdate();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete watchlist "${watchlist.name}"?`)) return;
    setLoading(true);
    try {
      await fetch(`/api/watchlists/${watchlist.id}`, { method: "DELETE" });
      onUpdate();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  const borderColor = watchlist.is_active
    ? watchlist.today_match_count > 0
      ? "border-l-error"
      : "border-l-primary"
    : "border-l-outline-variant";

  return (
    <Card variant="low" className={`border-l-4 ${borderColor} relative`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${watchlist.is_active ? "bg-[#4ade80]" : "bg-outline-variant"}`}
            />
            <Link
              href={`/watchlist/${watchlist.id}`}
              className="font-headline text-base font-semibold text-on-surface hover:text-primary transition-colors truncate"
            >
              {watchlist.name}
            </Link>
          </div>

          {watchlist.description && (
            <p className="text-xs text-on-surface-variant font-body mb-3 line-clamp-2">
              {watchlist.description}
            </p>
          )}

          {/* Keywords */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {visibleKeywords.map((kw) => (
              <span
                key={kw.id}
                className="inline-flex items-center px-2 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-medium font-body"
              >
                {kw.keyword}
                <span className="ml-1 text-primary/50">{kw.match_mode[0]}</span>
              </span>
            ))}
            {extraCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-[10px] font-body">
                +{extraCount} more
              </span>
            )}
          </div>

          {/* Stats & Badge */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-on-surface-variant font-body">
              <span className="font-semibold text-on-surface">{watchlist.keyword_count}</span> keywords
            </span>
            <span className="text-xs text-on-surface-variant font-body">
              <span className="font-semibold text-on-surface">{watchlist.today_match_count}</span> today
            </span>
            <span className="text-xs text-on-surface-variant font-body">
              <span className="font-semibold text-on-surface">{watchlist.match_count}</span> total
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider font-body ${
                watchlist.notify_mode === "realtime"
                  ? "bg-primary/15 text-primary"
                  : "bg-secondary/15 text-secondary"
              }`}
            >
              {watchlist.notify_mode === "realtime"
                ? "Real-time"
                : `Batch ${watchlist.batch_interval_minutes}min`}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Link
            href={`/watchlist/${watchlist.id}/edit`}
            className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            title="Edit"
          >
            <Edit2 size={15} />
          </Link>
          <button
            onClick={toggleActive}
            disabled={loading}
            className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors disabled:opacity-50"
            title={watchlist.is_active ? "Pause" : "Resume"}
          >
            {watchlist.is_active ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="p-2 rounded-lg text-on-surface-variant hover:bg-error/15 hover:text-error transition-colors disabled:opacity-50"
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </Card>
  );
}
