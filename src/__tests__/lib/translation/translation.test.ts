import { describe, it, expect } from "vitest";
import { DEFAULT_TRANSLATION_PROMPT } from "@/lib/translation/prompt";
import { parseTranslationResponse } from "@/lib/translation/translator";

describe("DEFAULT_TRANSLATION_PROMPT", () => {
  it("should be a non-empty string", () => {
    expect(DEFAULT_TRANSLATION_PROMPT).toBeTruthy();
    expect(typeof DEFAULT_TRANSLATION_PROMPT).toBe("string");
    expect(DEFAULT_TRANSLATION_PROMPT.length).toBeGreaterThan(100);
  });

  it("should contain JSON format instruction", () => {
    expect(DEFAULT_TRANSLATION_PROMPT).toContain("title_th");
    expect(DEFAULT_TRANSLATION_PROMPT).toContain("excerpt_th");
    expect(DEFAULT_TRANSLATION_PROMPT).toContain("content_th");
  });

  it("should instruct to keep technical terms in English", () => {
    expect(DEFAULT_TRANSLATION_PROMPT).toContain("CVE IDs");
    expect(DEFAULT_TRANSLATION_PROMPT).toContain("APT group names");
  });
});

describe("parseTranslationResponse", () => {
  it("should parse valid JSON with all fields", () => {
    const input = JSON.stringify({
      title_th: "หัวข้อทดสอบ",
      excerpt_th: "สรุปสั้นๆ",
      content_th: "เนื้อหาวิเคราะห์",
    });
    const result = parseTranslationResponse(input);
    expect(result.title_th).toBe("หัวข้อทดสอบ");
    expect(result.excerpt_th).toBe("สรุปสั้นๆ");
    expect(result.content_th).toBe("เนื้อหาวิเคราะห์");
    expect(result.confidence).toBe(0.85);
  });

  it("should handle JSON wrapped in markdown code block", () => {
    const input = '```json\n{"title_th": "test", "excerpt_th": "ex", "content_th": "content"}\n```';
    const result = parseTranslationResponse(input);
    expect(result.title_th).toBe("test");
    expect(result.content_th).toBe("content");
    expect(result.confidence).toBe(0.85);
  });

  it("should return 0.6 confidence when title_th is missing", () => {
    const input = JSON.stringify({
      excerpt_th: "สรุปสั้นๆ",
      content_th: "เนื้อหาวิเคราะห์",
    });
    const result = parseTranslationResponse(input);
    expect(result.title_th).toBe("");
    expect(result.confidence).toBe(0.6);
  });

  it("should return 0.6 confidence when content_th is missing", () => {
    const input = JSON.stringify({
      title_th: "หัวข้อทดสอบ",
      excerpt_th: "สรุปสั้นๆ",
    });
    const result = parseTranslationResponse(input);
    expect(result.content_th).toBe("");
    expect(result.confidence).toBe(0.6);
  });

  it("should fallback gracefully for non-JSON input", () => {
    const input = "This is not JSON at all, just plain text response";
    const result = parseTranslationResponse(input);
    expect(result.title_th).toBe(input.slice(0, 200));
    expect(result.content_th).toBe(input);
    expect(result.confidence).toBe(0.6);
  });

  it("should handle empty string input", () => {
    const result = parseTranslationResponse("");
    expect(result.confidence).toBe(0.6);
  });
});
