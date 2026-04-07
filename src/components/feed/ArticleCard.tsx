import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { ArticleWithTranslation } from "@/lib/types/database";

interface ArticleCardProps {
  article: ArticleWithTranslation;
  featured?: boolean;
}

export function ArticleCard({ article, featured = false }: ArticleCardProps) {
  const timeAgo = formatDistanceToNow(new Date(article.published_at), {
    addSuffix: true,
  });

  return (
    <Card
      variant="low"
      hoverable
      className={featured ? "md:col-span-2" : ""}
    >
      <div className="flex items-center justify-between mb-3">
        <Badge severity={article.severity} />
        <span className="text-[10px] text-on-surface-variant">{timeAgo}</span>
      </div>

      <Link href={`/article/${article.id}`}>
        <h3 className="font-headline text-lg font-bold text-on-surface line-clamp-2 hover:text-primary transition-colors duration-200 mb-2">
          {article.title}
        </h3>
      </Link>

      <p className="text-sm text-on-surface-variant line-clamp-3 mb-4">
        {article.excerpt}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {article.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant"
            >
              {tag}
            </span>
          ))}
        </div>

        {article.translations && (
          <button className="text-[10px] uppercase tracking-widest text-primary hover:text-secondary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">translate</span>
            TH
          </button>
        )}
      </div>
    </Card>
  );
}
