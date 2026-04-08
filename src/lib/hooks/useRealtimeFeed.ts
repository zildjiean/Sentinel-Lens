"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ArticleWithTranslation } from "@/lib/types/database";

export function useRealtimeFeed(initialArticles: ArticleWithTranslation[]) {
  const [articles, setArticles] = useState(initialArticles);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    setArticles(initialArticles);
  }, [initialArticles]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("articles-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "articles" },
        (payload) => {
          const newArticle = {
            ...payload.new,
            translations: null,
          } as ArticleWithTranslation;
          setArticles((prev) => [newArticle, ...prev]);
          setNewCount((prev) => prev + 1);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "articles" },
        (payload) => {
          setArticles((prev) => prev.filter((a) => a.id !== payload.old.id));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "articles" },
        (payload) => {
          setArticles((prev) =>
            prev.map((a) =>
              a.id === payload.new.id
                ? { ...a, ...payload.new }
                : a
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function clearNewCount() {
    setNewCount(0);
  }

  return { articles, newCount, clearNewCount };
}
