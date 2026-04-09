"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Hourglass, Bookmark, BookmarkMinus } from "lucide-react";
import { formatDateThShort } from "@/lib/utils/date";

interface BookmarkItem {
  id: string;
  article_id: string;
  note: string | null;
  created_at: string;
  articles: {
    id: string;
    title: string;
    severity: string;
    excerpt: string;
    published_at: string;
    tags: string[];
  };
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/bookmarks");
        const data = await res.json();
        setBookmarks(data.bookmarks ?? []);
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  async function removeBookmark(articleId: string) {
    await fetch("/api/bookmarks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ article_id: articleId }),
    });
    setBookmarks((prev) => prev.filter((b) => b.article_id !== articleId));
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold text-on-surface tracking-tight mb-2">
          My Bookmarks
        </h1>
        <p className="text-sm text-on-surface-variant">
          Your saved articles and personal notes
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-on-surface-variant">
          <Hourglass className="w-5 h-5 animate-spin mr-2" />
          Loading...
        </div>
      ) : bookmarks.length === 0 ? (
        <Card variant="low">
          <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant">
            <Bookmark className="w-10 h-10 mb-3" />
            <p className="text-sm">No bookmarks yet. Bookmark articles to save them here.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {bookmarks.map((bm) => (
            <Card key={bm.id} variant="low" hoverable>
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge severity={bm.articles.severity as "critical" | "high" | "medium" | "low" | "info"} />
                    <span className="text-[10px] text-on-surface-variant">
                      {formatDateThShort(bm.articles.published_at)}
                    </span>
                  </div>
                  <Link href={`/article/${bm.articles.id}`} className="text-sm font-semibold text-on-surface hover:text-primary transition-colors line-clamp-1">
                    {bm.articles.title}
                  </Link>
                  <p className="text-xs text-on-surface-variant line-clamp-2 mt-1">{bm.articles.excerpt}</p>
                  {bm.note && (
                    <div className="mt-2 px-3 py-2 rounded-lg bg-surface-container-high/50 border-l-2 border-primary">
                      <p className="text-xs text-on-surface-variant italic">{bm.note}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeBookmark(bm.article_id)}
                  className="text-on-surface-variant hover:text-error transition-colors flex-shrink-0"
                  title="Remove bookmark"
                >
                  <BookmarkMinus className="w-5 h-5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
