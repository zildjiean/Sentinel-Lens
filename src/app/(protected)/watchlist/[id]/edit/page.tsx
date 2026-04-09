"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { WatchlistForm } from "@/components/watchlist/WatchlistForm";
import type { WatchlistWithKeywords } from "@/lib/types/enterprise";

export default function EditWatchlistPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [watchlist, setWatchlist] = useState<WatchlistWithKeywords | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/watchlists/${id}`);
        if (!res.ok) throw new Error("Watchlist not found");
        const data = await res.json();
        setWatchlist(data.watchlist);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load watchlist");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error || !watchlist) {
    return (
      <div className="max-w-2xl">
        <div className="bg-error/10 border border-error/30 text-error text-sm rounded-xl px-4 py-3 font-body">
          {error ?? "Watchlist not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold text-on-surface tracking-tight mb-1">
          Edit Watchlist
        </h1>
        <p className="text-sm text-on-surface-variant font-body">
          Update &quot;{watchlist.name}&quot;
        </p>
      </div>
      <WatchlistForm initialData={watchlist} />
    </div>
  );
}
