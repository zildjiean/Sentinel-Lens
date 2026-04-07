"use client";

import { useEffect, useState } from "react";
import { Toolbar } from "@/components/translation/Toolbar";
import { SourcePane } from "@/components/translation/SourcePane";
import { TargetPane } from "@/components/translation/TargetPane";
import { AnalysisCards } from "@/components/translation/AnalysisCards";
import type { ArticleWithTranslation } from "@/lib/types/database";

export default function TranslationLabPage() {
  const [articles, setArticles] = useState<ArticleWithTranslation[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    async function fetchArticles() {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase
        .from("articles")
        .select("*, translations(*)")
        .eq("status", "translated")
        .order("published_at", { ascending: false })
        .limit(20);

      const mapped: ArticleWithTranslation[] = (data ?? []).map(
        (a: Record<string, unknown>) => ({
          ...a,
          translations: Array.isArray(a.translations)
            ? (a.translations as unknown[])[0] || null
            : a.translations,
        })
      ) as ArticleWithTranslation[];

      setArticles(mapped);
    }
    fetchArticles();
  }, []);

  const current = articles[selectedIndex];
  const translation = current?.translations;

  return (
    <div>
      <h1 className="font-headline text-2xl font-bold text-on-surface mb-1">
        Translation Lab
      </h1>
      <p className="text-sm text-on-surface-variant mb-6">
        Review and verify AI-generated translations
      </p>

      {/* Article selector */}
      {articles.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {articles.map((article, i) => (
            <button
              key={article.id}
              onClick={() => setSelectedIndex(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                i === selectedIndex
                  ? "bg-primary text-[#263046]"
                  : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {article.title.slice(0, 40)}...
            </button>
          ))}
        </div>
      )}

      <Toolbar />

      {current ? (
        <>
          {/* Dual pane */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-outline-variant/10 rounded-xl overflow-hidden">
            <SourcePane
              title={current.title}
              content={current.content}
              confidence={translation?.confidence ?? 0}
            />
            <TargetPane
              title={translation?.title_th ?? "No translation available"}
              content={translation?.content_th ?? ""}
              isVerified={translation?.is_verified ?? false}
            />
          </div>

          {/* Analysis cards */}
          <AnalysisCards riskLevel={42} termAccuracy={translation?.confidence ?? 0} />

          {/* Footer stats bar */}
          <div className="mt-6 bg-surface-container-lowest rounded-xl px-6 py-3 flex items-center justify-between text-xs text-on-surface-variant">
            <span>
              Provider: {translation?.provider ?? "N/A"} / Model:{" "}
              {translation?.model ?? "N/A"}
            </span>
            <span>
              Tokens used: {translation?.token_usage?.toLocaleString() ?? "0"}
            </span>
            <span>
              Translated:{" "}
              {translation?.translated_at
                ? new Date(translation.translated_at).toLocaleString()
                : "N/A"}
            </span>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-[400px] text-on-surface-variant">
          <p>No translated articles found. Translate an article to get started.</p>
        </div>
      )}
    </div>
  );
}
