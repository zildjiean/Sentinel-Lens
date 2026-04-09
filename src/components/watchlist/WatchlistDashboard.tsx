"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, Plus, Eye, Shield, Tag } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { WatchlistCard } from "./WatchlistCard";
import type { WatchlistWithStats, WatchlistKeyword } from "@/lib/types/enterprise";

type WatchlistItem = WatchlistWithStats & { watchlist_keywords: WatchlistKeyword[] };

interface ApiWatchlist {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  notify_mode: "realtime" | "batch";
  batch_interval_minutes: number;
  summary_level: "short" | "detailed";
  email_recipients: string[];
  is_active: boolean;
  last_checked_at: string | null;
  last_notified_at: string | null;
  created_at: string;
  updated_at: string;
  keyword_count: number;
  match_count: number;
  today_match_count: number;
}

export function WatchlistDashboard() {
  const [watchlists, setWatchlists] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWatchlists = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/watchlists");
      const data = await res.json();
      const items = (data.watchlists ?? []) as ApiWatchlist[];
      // Attach empty keyword arrays (dashboard list doesn't include keyword details)
      setWatchlists(
        items.map((w) => ({
          ...w,
          watchlist_keywords: [],
        }))
      );
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWatchlists();
  }, [fetchWatchlists]);

  const activeCount = watchlists.filter((w) => w.is_active).length;
  const todayMatches = watchlists.reduce((sum, w) => sum + (w.today_match_count ?? 0), 0);
  const totalKeywords = watchlists.reduce((sum, w) => sum + (w.keyword_count ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold text-on-surface tracking-tight mb-1">
            Watchlists
          </h1>
          <p className="text-sm text-on-surface-variant font-body">
            Monitor keywords and receive alerts for matching articles
          </p>
        </div>
        <Link
          href="/watchlist/new"
          className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-xl text-sm font-body font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} />
          New Watch List
        </Link>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <Card variant="default" className="text-center">
          <div className="flex flex-col items-center gap-1">
            <Eye size={20} className="text-primary mb-1" />
            <span className="font-headline text-2xl font-bold text-on-surface">{activeCount}</span>
            <span className="text-xs text-on-surface-variant font-body">Active Lists</span>
          </div>
        </Card>
        <Card variant="default" className="text-center">
          <div className="flex flex-col items-center gap-1">
            <Shield size={20} className="text-tertiary mb-1" />
            <span className="font-headline text-2xl font-bold text-on-surface">{todayMatches}</span>
            <span className="text-xs text-on-surface-variant font-body">Matches Today</span>
          </div>
        </Card>
        <Card variant="default" className="text-center">
          <div className="flex flex-col items-center gap-1">
            <Tag size={20} className="text-secondary mb-1" />
            <span className="font-headline text-2xl font-bold text-on-surface">{totalKeywords}</span>
            <span className="text-xs text-on-surface-variant font-body">Total Keywords</span>
          </div>
        </Card>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      ) : watchlists.length === 0 ? (
        <Card variant="low" className="text-center py-16">
          <Eye size={40} className="text-outline-variant mx-auto mb-4" />
          <h3 className="font-headline text-lg font-semibold text-on-surface mb-2">No Watchlists Yet</h3>
          <p className="text-sm text-on-surface-variant font-body mb-6">
            Create your first watchlist to start monitoring keywords
          </p>
          <Link
            href="/watchlist/new"
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-body font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={16} />
            Create Watchlist
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {watchlists.map((w) => (
            <WatchlistCard key={w.id} watchlist={w} onUpdate={fetchWatchlists} />
          ))}
        </div>
      )}
    </div>
  );
}
