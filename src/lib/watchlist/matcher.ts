// src/lib/watchlist/matcher.ts

import type { WatchlistKeyword } from "@/lib/types/enterprise";

interface ArticleFields {
  title: string;
  content: string | null;
  excerpt: string | null;
  tags: string[] | null;
}

export interface MatchResult {
  keyword_id: string;
  matched_keyword: string;
  matched_in: string;
}

export function matchArticleAgainstKeywords(
  article: ArticleFields,
  keywords: WatchlistKeyword[]
): MatchResult[] {
  const results: MatchResult[] = [];
  const fields = [
    { name: "title", value: article.title || "" },
    { name: "content", value: article.content || "" },
    { name: "excerpt", value: article.excerpt || "" },
    { name: "tags", value: (article.tags || []).join(" ") },
  ];

  for (const kw of keywords) {
    for (const field of fields) {
      if (!field.value) continue;
      let matched = false;
      switch (kw.match_mode) {
        case "contains":
          matched = field.value.toLowerCase().includes(kw.keyword.toLowerCase());
          break;
        case "exact": {
          const regex = new RegExp(
            `\\b${kw.keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
            "i"
          );
          matched = regex.test(field.value);
          break;
        }
        case "regex":
          try {
            matched = new RegExp(kw.keyword, "i").test(field.value);
          } catch {
            // invalid regex — skip
          }
          break;
      }
      if (matched && !results.some((r) => r.keyword_id === kw.id)) {
        results.push({
          keyword_id: kw.id,
          matched_keyword: kw.keyword,
          matched_in: field.name,
        });
      }
    }
  }

  return results;
}
