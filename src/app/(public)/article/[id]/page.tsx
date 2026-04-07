import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: article } = await supabase
    .from("articles")
    .select("*, translations(*), rss_sources(name)")
    .eq("id", id)
    .single();

  if (!article) {
    notFound();
  }

  const translation = Array.isArray(article.translations)
    ? article.translations[0]
    : article.translations;

  const sourceName = Array.isArray(article.rss_sources)
    ? article.rss_sources[0]?.name
    : article.rss_sources?.name;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Back to Feed
      </Link>

      {/* Article header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge severity={article.severity} />
          <Badge status={article.status} />
          {sourceName && (
            <span className="text-xs text-on-surface-variant">{sourceName}</span>
          )}
        </div>

        <h1 className="font-headline text-3xl font-bold text-on-surface tracking-tight">
          {article.title}
        </h1>

        <div className="flex items-center gap-3 text-xs text-on-surface-variant">
          {article.author && <span>By {article.author}</span>}
          <span>{new Date(article.published_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}</span>
        </div>
      </div>

      {/* Content */}
      <Card variant="low">
        <div className="prose prose-invert prose-sm max-w-none text-on-surface/90 leading-relaxed">
          {article.content}
        </div>
      </Card>

      {/* Translation section */}
      {translation && (
        <Card variant="default">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary">translate</span>
            <h2 className="font-headline text-lg font-semibold text-on-surface">Thai Translation</h2>
            {translation.is_verified && (
              <Badge label="verified" className="bg-secondary/20 text-secondary" />
            )}
          </div>
          <div className="thai-text text-on-surface/90 leading-relaxed text-sm">
            {translation.content_th}
          </div>
        </Card>
      )}

      {/* Tags */}
      {article.tags && article.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {article.tags.map((tag: string) => (
            <span
              key={tag}
              className="px-3 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
