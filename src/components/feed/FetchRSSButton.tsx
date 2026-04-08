"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function FetchRSSButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleFetch() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/rss-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Fetch failed");
        return;
      }

      setResult(
        `Fetched ${data.new_articles} new articles from ${data.sources_processed} sources. ${data.skipped_duplicates} duplicates skipped.${data.ads_filtered ? ` ${data.ads_filtered} ads filtered.` : ""}${data.errors ? ` Errors: ${data.errors.length}` : ""}`
      );
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        variant="secondary"
        size="md"
        onClick={handleFetch}
        disabled={loading}
        className="gap-2"
      >
        <span className="material-symbols-outlined text-lg">
          {loading ? "hourglass_empty" : "rss_feed"}
        </span>
        {loading ? "Fetching RSS Feeds..." : "Fetch Latest News"}
      </Button>
      {result && (
        <p className="text-secondary text-xs flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          {result}
        </p>
      )}
      {error && (
        <p className="text-error text-xs">{error}</p>
      )}
    </div>
  );
}
