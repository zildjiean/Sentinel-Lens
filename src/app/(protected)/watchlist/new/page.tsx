"use client";

import { WatchlistForm } from "@/components/watchlist/WatchlistForm";

export default function NewWatchlistPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold text-on-surface tracking-tight mb-1">
          New Watchlist
        </h1>
        <p className="text-sm text-on-surface-variant font-body">
          Set up keyword monitoring and email alerts
        </p>
      </div>
      <WatchlistForm />
    </div>
  );
}
