import { createClient } from "@/lib/supabase/server";
import { HeroBriefing } from "@/components/feed/HeroBriefing";
import { DailyHighlights } from "@/components/feed/DailyHighlights";
import { FilteredFeed } from "@/components/feed/FilteredFeed";
import dynamic from "next/dynamic";

const ChatBubble = dynamic(() => import("@/components/chat/ChatBubble").then(m => ({ default: m.ChatBubble })), {
  ssr: false,
});
import type { ArticleWithTranslation } from "@/lib/types/database";

export const revalidate = 300;

export default async function IntelligenceFeedPage() {
  const supabase = await createClient();

  const { data: rawArticles } = await supabase
    .from("articles")
    .select("*, translations(*)")
    .order("published_at", { ascending: false })
    .limit(50);

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

  const highCount = articles.filter(
    (a) => a.severity === "high"
  ).length;

  const translatedCount = articles.filter(
    (a) => a.translations !== null
  ).length;

  return (
    <>
      {/* Hero section - full width */}
      <div className="mb-8">
        <HeroBriefing
          activeThreats={articles.length}
          criticalAlerts={criticalCount}
          highAlerts={highCount}
          translatedCount={translatedCount}
          latestArticles={articles.slice(0, 5)}
        />
      </div>

      {/* AI-curated daily highlights */}
      <div className="mb-8">
        <DailyHighlights />
      </div>

      {/* Filtered article feed */}
      <FilteredFeed articles={articles} />

      {/* AI Chat Assistant */}
      <ChatBubble />
    </>
  );
}
