import type { LayoutConfig } from "@/lib/types/enterprise";

const DEFAULT_LAYOUT: LayoutConfig = {
  theme: "dark",
  primary_color: "#1E3A5F",
  accent_color: "#60A5FA",
  font_heading: "Manrope",
  font_body: "Inter",
  cover_style: "minimal",
  logo_url: null,
  sections: ["cover", "executive_summary", "threat_landscape", "risk_matrix", "immediate_actions", "strategic_actions", "references"],
  show_page_numbers: true,
  show_header_footer: true,
  classification_watermark: true,
};

export function mergeLayoutConfig(
  base: LayoutConfig | undefined | null,
  override: Partial<LayoutConfig> | undefined | null
): LayoutConfig {
  const resolvedBase = base ?? DEFAULT_LAYOUT;
  if (!override) return resolvedBase;
  return {
    ...resolvedBase,
    ...override,
    sections: override.sections ?? resolvedBase.sections,
  };
}
