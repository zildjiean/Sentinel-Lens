"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Link as LinkIcon } from "lucide-react";

interface RelatedArticle {
  id: string;
  title: string;
  severity: string;
  published_at: string;
  shared_tags: string[];
  shared_count: number;
}

export function RelatedArticles({ articleId }: { articleId: string }) {
  const [related, setRelated] = useState<RelatedArticle[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/articles/${articleId}/related`);
        if (res.ok) {
          const data = await res.json();
          setRelated(data.related ?? []);
        }
      } catch { /* ignore */ }
    }
    load();
  }, [articleId]);

  if (related.length === 0) return null;

  return (
    <div className="rounded-2xl bg-surface-container-low p-5">
      <h3 className="text-sm font-semibold text-on-surface mb-3 flex items-center gap-2">
        <LinkIcon className="w-4 h-4 text-primary" />
        Related Articles
      </h3>
      <div className="space-y-2">
        {related.map((r) => (
          <Link
            key={r.id}
            href={`/article/${r.id}`}
            className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-surface-container-high/50 transition-colors"
          >
            <Badge severity={r.severity as "critical" | "high" | "medium" | "low" | "info"} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-on-surface line-clamp-1">{r.title}</p>
              <div className="flex gap-1 mt-1">
                {r.shared_tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
