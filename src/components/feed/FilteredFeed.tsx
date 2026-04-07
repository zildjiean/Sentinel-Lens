"use client";

import { useState, useMemo } from "react";
import { FeedFilter } from "@/components/feed/FeedFilter";
import { ArticleGrid } from "@/components/feed/ArticleGrid";
import { FetchRSSButton } from "@/components/feed/FetchRSSButton";
import type { ArticleWithTranslation } from "@/lib/types/database";

interface FilteredFeedProps {
  articles: ArticleWithTranslation[];
}

export function FilteredFeed({ articles }: FilteredFeedProps) {
  const [severity, setSeverity] = useState("");
  const [days, setDays] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      const matchSeverity = !severity || a.severity === severity;
      let matchDate = true;
      if (days !== null) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        matchDate = new Date(a.published_at) >= cutoff;
      }
      return matchSeverity && matchDate;
    });
  }, [articles, severity, days]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-headline text-lg font-bold text-on-surface">
          Threat Intelligence Feed
        </h2>
        <FetchRSSButton />
      </div>

      {/* Filters */}
      <div className="mb-6">
        <FeedFilter onSeverityChange={setSeverity} onDateChange={setDays} />
      </div>

      {/* Results count */}
      <p className="text-xs text-on-surface-variant mb-4">
        Showing {filtered.length} of {articles.length} articles
      </p>

      {/* Grid */}
      <ArticleGrid articles={filtered} />
    </>
  );
}
