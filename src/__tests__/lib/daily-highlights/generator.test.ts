import { describe, it, expect } from "vitest";
import { buildArticleContext, parseHighlightsResponse } from "@/lib/daily-highlights/generator";

describe("buildArticleContext", () => {
  it("formats articles into context string", () => {
    const articles = [
      { id: "abc-123", title: "Zero-day in Apache", severity: "critical", tags: ["CVE", "apache"], excerpt: "A critical zero-day was found", published_at: "2026-04-09T10:00:00Z" },
    ];
    const result = buildArticleContext(articles);
    expect(result).toContain("[ID:abc-123]");
    expect(result).toContain('"Zero-day in Apache"');
    expect(result).toContain("(critical)");
    expect(result).toContain("tags:[CVE,apache]");
    expect(result).toContain("A critical zero-day was found");
  });

  it("handles empty articles array", () => {
    expect(buildArticleContext([])).toBe("");
  });

  it("truncates long excerpts to 200 chars", () => {
    const articles = [
      { id: "x", title: "Test", severity: "low", tags: [], excerpt: "A".repeat(300), published_at: "2026-04-09T10:00:00Z" },
    ];
    const result = buildArticleContext(articles);
    const excerptPart = result.split("— ")[1];
    expect(excerptPart.length).toBeLessThanOrEqual(200);
  });

  it("handles null excerpt", () => {
    const articles = [
      { id: "x", title: "Test", severity: "low", tags: [], excerpt: null, published_at: "2026-04-09T10:00:00Z" },
    ];
    const result = buildArticleContext(articles);
    expect(result).toContain("— ");
  });
});

describe("parseHighlightsResponse", () => {
  it("parses valid JSON with highlights", () => {
    const json = JSON.stringify({
      has_highlights: true,
      no_highlight_reason: null,
      highlights: [
        { article_id: "abc-123", reason_th: "ข่าวสำคัญมาก", impact_level: "critical" },
        { article_id: "def-456", reason_th: "ควรติดตาม", impact_level: "high" },
      ],
    });
    const result = parseHighlightsResponse(json);
    expect(result.has_highlights).toBe(true);
    expect(result.no_highlight_reason).toBeNull();
    expect(result.highlights).toHaveLength(2);
    expect(result.highlights[0].article_id).toBe("abc-123");
    expect(result.highlights[0].impact_level).toBe("critical");
  });

  it("parses no-highlights response", () => {
    const json = JSON.stringify({
      has_highlights: false,
      no_highlight_reason: "ข่าวทั้งหมดเป็นเหตุการณ์ทั่วไป",
      highlights: [],
    });
    const result = parseHighlightsResponse(json);
    expect(result.has_highlights).toBe(false);
    expect(result.no_highlight_reason).toBe("ข่าวทั้งหมดเป็นเหตุการณ์ทั่วไป");
    expect(result.highlights).toHaveLength(0);
  });

  it("strips markdown code fences from response", () => {
    const raw = '```json\n{"has_highlights":false,"no_highlight_reason":"ไม่มี","highlights":[]}\n```';
    const result = parseHighlightsResponse(raw);
    expect(result.has_highlights).toBe(false);
  });

  it("limits highlights to max 5", () => {
    const highlights = Array.from({ length: 8 }, (_, i) => ({
      article_id: `id-${i}`, reason_th: `reason ${i}`, impact_level: "notable",
    }));
    const json = JSON.stringify({ has_highlights: true, no_highlight_reason: null, highlights });
    const result = parseHighlightsResponse(json);
    expect(result.highlights).toHaveLength(5);
  });

  it("filters out invalid highlight items", () => {
    const json = JSON.stringify({
      has_highlights: true,
      no_highlight_reason: null,
      highlights: [
        { article_id: "valid-1", reason_th: "good", impact_level: "critical" },
        { article_id: 123, reason_th: "bad id type", impact_level: "high" },
        { article_id: "valid-2", reason_th: "good", impact_level: "invalid_level" },
        { reason_th: "missing id", impact_level: "high" },
        { article_id: "valid-3", reason_th: "good", impact_level: "notable" },
      ],
    });
    const result = parseHighlightsResponse(json);
    expect(result.highlights).toHaveLength(2);
    expect(result.highlights[0].article_id).toBe("valid-1");
    expect(result.highlights[1].article_id).toBe("valid-3");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseHighlightsResponse("not json at all")).toThrow("Failed to parse AI response");
  });
});
