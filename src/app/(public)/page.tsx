import { createClient } from "@/lib/supabase/server";
import { HeroBriefing } from "@/components/feed/HeroBriefing";
import { NetworkHealth } from "@/components/feed/NetworkHealth";
import { ArticleGrid } from "@/components/feed/ArticleGrid";
import type { ArticleWithTranslation } from "@/lib/types/database";

export const revalidate = 300;

export default async function IntelligenceFeedPage() {
  const supabase = await createClient();

  const { data: rawArticles } = await supabase
    .from("articles")
    .select("*, translations(*)")
    .order("published_at", { ascending: false })
    .limit(12);

  const articles: ArticleWithTranslation[] = (rawArticles ?? []).map(
    (a: Record<string, unknown>) => ({
      ...a,
      translations: Array.isArray(a.translations)
        ? (a.translations as unknown[])[0] || null
        : a.translations,
    })
  ) as ArticleWithTranslation[];

  const criticalCount = articles.filter(
    (a) => a.severity === "critical"
  ).length;

  return (
    <>
      {/* Hero section */}
      <div className="grid grid-cols-12 gap-6 mb-8">
        <HeroBriefing
          relevance={94}
          activeThreats={articles.length}
          criticalAlerts={criticalCount}
        />
        <NetworkHealth />
      </div>

      {/* Article grid */}
      <ArticleGrid articles={articles} />

      {/* FAB */}
      <button className="fixed bottom-8 right-8 bg-secondary text-[#263046] w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_24px_rgba(74,225,131,0.3)] hover:scale-105 transition-transform duration-200 z-50">
        <span className="material-symbols-outlined text-2xl">auto_awesome</span>
      </button>
    </>
  );
}
