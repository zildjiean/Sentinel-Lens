import { ArticleCard } from "@/components/feed/ArticleCard";
import type { ArticleWithTranslation } from "@/lib/types/database";

interface ArticleGridProps {
  articles: ArticleWithTranslation[];
}

export function ArticleGrid({ articles }: ArticleGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {articles.map((article, index) => (
        <ArticleCard
          key={article.id}
          article={article}
          featured={index === 3}
        />
      ))}
    </div>
  );
}
