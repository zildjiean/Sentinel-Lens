import { describe, it, expect } from "vitest";
import { matchArticleAgainstKeywords } from "@/lib/watchlist/matcher";
import type { WatchlistKeyword } from "@/lib/types/enterprise";

function makeKeyword(overrides: Partial<WatchlistKeyword> & { keyword: string; match_mode: WatchlistKeyword["match_mode"] }): WatchlistKeyword {
  return {
    id: overrides.id ?? "kw-1",
    watchlist_id: overrides.watchlist_id ?? "wl-1",
    keyword: overrides.keyword,
    match_mode: overrides.match_mode,
    created_at: overrides.created_at ?? "2026-01-01T00:00:00Z",
  };
}

const baseArticle = {
  title: "Critical vulnerability found in Apache Log4j",
  content: "A remote code execution flaw allows attackers to run arbitrary code on affected servers.",
  excerpt: "RCE flaw in Log4j",
  tags: ["security", "java", "log4j"],
};

describe("matchArticleAgainstKeywords", () => {
  describe("contains mode", () => {
    it("matches keyword in title (case-insensitive)", () => {
      const keywords = [makeKeyword({ keyword: "vulnerability", match_mode: "contains" })];
      const results = matchArticleAgainstKeywords(baseArticle, keywords);
      expect(results).toHaveLength(1);
      expect(results[0].matched_in).toBe("title");
      expect(results[0].matched_keyword).toBe("vulnerability");
    });

    it("matches keyword in content", () => {
      const keywords = [makeKeyword({ keyword: "arbitrary code", match_mode: "contains" })];
      const results = matchArticleAgainstKeywords(baseArticle, keywords);
      expect(results).toHaveLength(1);
      expect(results[0].matched_in).toBe("content");
    });

    it("matches keyword in excerpt", () => {
      const keywords = [makeKeyword({ keyword: "RCE flaw", match_mode: "contains" })];
      const results = matchArticleAgainstKeywords(baseArticle, keywords);
      expect(results).toHaveLength(1);
      expect(results[0].matched_in).toBe("excerpt");
    });

    it("matches keyword in tags", () => {
      const keywords = [makeKeyword({ keyword: "java", match_mode: "contains" })];
      const results = matchArticleAgainstKeywords(baseArticle, keywords);
      expect(results).toHaveLength(1);
      expect(results[0].matched_in).toBe("tags");
    });

    it("is case-insensitive", () => {
      const keywords = [makeKeyword({ keyword: "CRITICAL", match_mode: "contains" })];
      const results = matchArticleAgainstKeywords(baseArticle, keywords);
      expect(results).toHaveLength(1);
    });

    it("returns no match for absent keyword", () => {
      const keywords = [makeKeyword({ keyword: "phishing", match_mode: "contains" })];
      const results = matchArticleAgainstKeywords(baseArticle, keywords);
      expect(results).toHaveLength(0);
    });
  });

  describe("exact mode", () => {
    it("matches exact word boundary", () => {
      const keywords = [makeKeyword({ keyword: "Apache", match_mode: "exact" })];
      const results = matchArticleAgainstKeywords(baseArticle, keywords);
      expect(results).toHaveLength(1);
    });

    it("does NOT match partial word", () => {
      const keywords = [makeKeyword({ keyword: "Apach", match_mode: "exact" })];
      const results = matchArticleAgainstKeywords(baseArticle, keywords);
      expect(results).toHaveLength(0);
    });

    it("is case-insensitive", () => {
      const keywords = [makeKeyword({ keyword: "apache", match_mode: "exact" })];
      const results = matchArticleAgainstKeywords(baseArticle, keywords);
      expect(results).toHaveLength(1);
    });

    it("escapes special regex characters in keyword", () => {
      const article = { ...baseArticle, title: "CVE-2026-1234 (critical)" };
      const keywords = [makeKeyword({ keyword: "CVE-2026-1234", match_mode: "exact" })];
      const results = matchArticleAgainstKeywords(article, keywords);
      expect(results).toHaveLength(1);
    });
  });

  describe("regex mode", () => {
    it("matches regex pattern", () => {
      const keywords = [makeKeyword({ keyword: "CVE-\\d{4}-\\d+", match_mode: "regex" })];
      const article = { ...baseArticle, title: "CVE-2026-1234 is critical" };
      const results = matchArticleAgainstKeywords(article, keywords);
      expect(results).toHaveLength(1);
    });

    it("silently skips invalid regex", () => {
      const keywords = [makeKeyword({ keyword: "[invalid(", match_mode: "regex" })];
      const results = matchArticleAgainstKeywords(baseArticle, keywords);
      expect(results).toHaveLength(0);
    });
  });

  describe("deduplication", () => {
    it("returns only one match per keyword even if found in multiple fields", () => {
      const article = {
        title: "vulnerability in security",
        content: "This vulnerability is serious",
        excerpt: "vulnerability found",
        tags: null,
      };
      const keywords = [makeKeyword({ keyword: "vulnerability", match_mode: "contains" })];
      const results = matchArticleAgainstKeywords(article, keywords);
      expect(results).toHaveLength(1);
      expect(results[0].matched_in).toBe("title");
    });
  });

  describe("multiple keywords", () => {
    it("matches multiple different keywords", () => {
      const keywords = [
        makeKeyword({ id: "kw-1", keyword: "vulnerability", match_mode: "contains" }),
        makeKeyword({ id: "kw-2", keyword: "remote code execution", match_mode: "contains" }),
      ];
      const results = matchArticleAgainstKeywords(baseArticle, keywords);
      expect(results).toHaveLength(2);
    });
  });

  describe("null and empty handling", () => {
    it("handles null content, excerpt, and tags", () => {
      const article = { title: "Test vulnerability", content: null, excerpt: null, tags: null };
      const keywords = [makeKeyword({ keyword: "vulnerability", match_mode: "contains" })];
      const results = matchArticleAgainstKeywords(article, keywords);
      expect(results).toHaveLength(1);
      expect(results[0].matched_in).toBe("title");
    });

    it("returns empty array for empty keyword list", () => {
      const results = matchArticleAgainstKeywords(baseArticle, []);
      expect(results).toHaveLength(0);
    });
  });
});
