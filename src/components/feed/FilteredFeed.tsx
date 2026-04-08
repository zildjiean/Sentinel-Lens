"use client";

import { useState, useMemo } from "react";
import { FeedFilter } from "@/components/feed/FeedFilter";
import { ArticleGrid } from "@/components/feed/ArticleGrid";
import { FetchRSSButton } from "@/components/feed/FetchRSSButton";
import type { ArticleWithTranslation } from "@/lib/types/database";

interface FilteredFeedProps {
  articles: ArticleWithTranslation[];
}

const PAGE_SIZE = 12;

export function FilteredFeed({ articles }: FilteredFeedProps) {
  const [severity, setSeverity] = useState("");
  const [days, setDays] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    setPage(1);
    return articles.filter((a) => {
      const matchSeverity = !severity || a.severity === severity;
      let matchDate = true;
      if (days !== null) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        matchDate = new Date(a.published_at) >= cutoff;
      }
      const matchSearch = !search ||
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.excerpt.toLowerCase().includes(search.toLowerCase()) ||
        a.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()));
      return matchSeverity && matchDate && matchSearch;
    });
  }, [articles, severity, days, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-headline text-lg font-bold text-on-surface">
          Threat Intelligence Feed
        </h2>
        <FetchRSSButton />
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
        <input
          type="text"
          placeholder="Search articles by title, content, or tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container text-on-surface text-sm placeholder:text-on-surface-variant/60 border border-outline-variant/20 focus:border-primary focus:outline-none transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6">
        <FeedFilter onSeverityChange={setSeverity} onDateChange={setDays} />
      </div>

      {/* Results count */}
      <p className="text-xs text-on-surface-variant mb-4">
        Showing {paged.length} of {filtered.length} articles
        {search && <span className="text-primary"> matching &ldquo;{search}&rdquo;</span>}
      </p>

      {/* Grid */}
      <ArticleGrid articles={paged} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-container-high text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">chevron_left</span>
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                p === page
                  ? "bg-primary text-[#263046]"
                  : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-container-high text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>
      )}
    </>
  );
}
