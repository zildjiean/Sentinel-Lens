import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { TranslateButton } from "@/components/feed/TranslateButton";
import { DeleteArticleButton } from "@/components/feed/DeleteArticleButton";
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

  // Check if current user is admin (for delete button)
  let isAdmin = false;
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin";
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
        <div className="prose prose-invert prose-sm max-w-none text-on-surface/90 leading-relaxed whitespace-pre-line">
          {article.content}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <a
          href={`/api/article-pdf?id=${article.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-[#263046] text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
          Download PDF Report
        </a>
        {isAdmin && (
          <DeleteArticleButton articleId={article.id} articleTitle={article.title} />
        )}
      </div>

      {/* Reference URL */}
      {article.url && (
        <Card variant="low">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary text-lg mt-0.5">link</span>
            <div className="min-w-0">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-1">
                Reference Source
              </h3>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:text-secondary transition-colors break-all"
              >
                {article.url}
              </a>
            </div>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex-shrink-0 text-on-surface-variant hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-lg">open_in_new</span>
            </a>
          </div>
        </Card>
      )}

      {/* Translate button (show when no translation exists) */}
      {!translation && (
        <TranslateButton articleId={article.id} />
      )}

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
