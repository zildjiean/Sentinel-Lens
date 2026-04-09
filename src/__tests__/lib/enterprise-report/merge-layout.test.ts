import { describe, it, expect } from "vitest";
import { mergeLayoutConfig } from "@/lib/enterprise-report/merge-layout";
import type { LayoutConfig } from "@/lib/types/enterprise";

const fullLayout: LayoutConfig = {
  theme: "light",
  primary_color: "#FF0000",
  accent_color: "#00FF00",
  font_heading: "Roboto",
  font_body: "Arial",
  cover_style: "branded",
  logo_url: "https://example.com/logo.png",
  sections: ["cover", "executive_summary", "references"],
  show_page_numbers: false,
  show_header_footer: false,
  classification_watermark: false,
};

describe("mergeLayoutConfig", () => {
  it("returns default layout when base is null and override is null", () => {
    const result = mergeLayoutConfig(null, null);
    expect(result.theme).toBe("dark");
    expect(result.primary_color).toBe("#1E3A5F");
    expect(result.font_heading).toBe("Manrope");
    expect(result.show_page_numbers).toBe(true);
    expect(result.sections).toContain("cover");
    expect(result.sections).toContain("executive_summary");
  });

  it("returns default layout when base and override are undefined", () => {
    const result = mergeLayoutConfig(undefined, undefined);
    expect(result.theme).toBe("dark");
  });

  it("returns base layout when override is null", () => {
    const result = mergeLayoutConfig(fullLayout, null);
    expect(result).toEqual(fullLayout);
  });

  it("returns base layout when override is undefined", () => {
    const result = mergeLayoutConfig(fullLayout, undefined);
    expect(result).toEqual(fullLayout);
  });

  it("overrides specific properties while keeping base values", () => {
    const result = mergeLayoutConfig(fullLayout, { theme: "dark", accent_color: "#0000FF" });
    expect(result.theme).toBe("dark");
    expect(result.accent_color).toBe("#0000FF");
    expect(result.primary_color).toBe("#FF0000");
    expect(result.font_heading).toBe("Roboto");
  });

  it("uses base sections when override does not provide sections", () => {
    const result = mergeLayoutConfig(fullLayout, { theme: "dark" });
    expect(result.sections).toEqual(fullLayout.sections);
  });

  it("overrides sections when provided", () => {
    const newSections: LayoutConfig["sections"] = ["cover", "references"];
    const result = mergeLayoutConfig(fullLayout, { sections: newSections });
    expect(result.sections).toEqual(newSections);
  });

  it("uses default layout as base when base is null with override", () => {
    const result = mergeLayoutConfig(null, { theme: "light" });
    expect(result.theme).toBe("light");
    expect(result.primary_color).toBe("#1E3A5F");
    expect(result.font_heading).toBe("Manrope");
  });
});
