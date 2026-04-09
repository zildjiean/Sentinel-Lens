"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { FeedFilter } from "@/components/feed/FeedFilter";
import { ArticleGrid } from "@/components/feed/ArticleGrid";
import { FetchRSSButton } from "@/components/feed/FetchRSSButton";
import type { ArticleWithTranslation } from "@/lib/types/database";

interface FilteredFeedProps {
  articles: ArticleWithTranslation[];
}

const PAGE_SIZE = 12;

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

export function FilteredFeed({ articles }: FilteredFeedProps) {
  const [severity, setSeverity] = useState("");
  const [days, setDays] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Reset page when filters change (NOT inside useMemo to avoid render loop)
  const prevFilters = useRef({ severity, days, search });
  useEffect(() => {
    const prev = prevFilters.current;
    if (prev.severity !== severity || prev.days !== days || prev.search !== search) {
      setPage(1);
      prevFilters.current = { severity, days, search };
    }
  }, [severity, days, search]);

  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase();
    return articles.filter((a) => {
      if (severity && a.severity !== severity) return false;
      if (days !== null) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        if (new Date(a.published_at) < cutoff) return false;
      }
      if (searchLower &&
        !a.title.toLowerCase().includes(searchLower) &&
        !a.excerpt.toLowerCase().includes(searchLower) &&
        !a.tags?.some(t => t.toLowerCase().includes(searchLower))
      ) return false;
      return true;
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
        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
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
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer"
          >
            <X className="w-5 h-5" />
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
        <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            aria-label="Previous page"
            className="w-10 h-10 flex items-center justify-center rounded-lg text-xs font-medium bg-surface-container-high text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {getPageNumbers(page, totalPages).map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className="w-10 h-10 flex items-center justify-center text-xs text-on-surface-variant">
                ...
              </span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p as number)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? "page" : undefined}
                className={`w-10 h-10 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  p === page
                    ? "bg-primary text-[#263046]"
                    : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            aria-label="Next page"
            className="w-10 h-10 flex items-center justify-center rounded-lg text-xs font-medium bg-surface-container-high text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </nav>
      )}
    </>
  );
}
