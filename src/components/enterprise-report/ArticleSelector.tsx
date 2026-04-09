"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { formatDateThShort } from "@/lib/utils/date";

interface Article {
  id: string;
  title: string;
  severity: string;
  excerpt: string | null;
  published_at: string | null;
  tags: string[];
}

interface ArticleSelectorProps {
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
}

const severityColors: Record<string, string> = {
  critical: "bg-red-500/20 text-red-500",
  high: "bg-orange-500/20 text-orange-500",
  medium: "bg-blue-500/20 text-blue-500",
  low: "bg-green-500/20 text-green-500",
  info: "bg-gray-500/20 text-gray-500",
};

const severityFilters = ["all", "critical", "high", "medium", "low"] as const;
type SeverityFilter = (typeof severityFilters)[number];

export function ArticleSelector({ selectedIds, onSelect }: ArticleSelectorProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("articles")
      .select("id, title, severity, excerpt, published_at, tags")
      .order("published_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setArticles((data as Article[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = articles.filter((a) => {
    const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = severityFilter === "all" || a.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onSelect(selectedIds.filter((s) => s !== id));
    } else {
      onSelect([...selectedIds, id]);
    }
  }

  return (
    <div className="space-y-4">
      <Input
        icon={<Search size={16} />}
        placeholder="Search articles..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Severity filter */}
      <div className="flex flex-wrap gap-2">
        {severityFilters.map((s) => (
          <button
            key={s}
            onClick={() => setSeverityFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide transition-colors ${
              severityFilter === s
                ? "bg-primary text-on-primary"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Selected count */}
      <p className="text-xs text-on-surface-variant font-body">
        {selectedIds.length} article{selectedIds.length !== 1 ? "s" : ""} selected
      </p>

      {/* Article list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-container-high/60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-on-surface-variant py-6 text-center">No articles found.</p>
      ) : (
        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
          {filtered.map((article) => {
            const isSelected = selectedIds.includes(article.id);
            return (
              <label
                key={article.id}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-outline-variant bg-surface-container hover:bg-surface-container-high"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(article.id)}
                  className="mt-0.5 accent-primary"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-widest ${
                        severityColors[article.severity] ?? "bg-gray-500/20 text-gray-500"
                      }`}
                    >
                      {article.severity}
                    </span>
                    {article.published_at && (
                      <span className="text-[10px] text-on-surface-variant">
                        {formatDateThShort(article.published_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-body text-on-surface mt-1 truncate">{article.title}</p>
                  {article.excerpt && (
                    <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-1">
                      {article.excerpt}
                    </p>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
