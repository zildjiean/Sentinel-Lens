"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import type { EnterpriseReport, LayoutConfig, ReportContentEN } from "@/lib/types/enterprise";

interface EnterpriseReportViewerProps {
  report: EnterpriseReport & {
    merged_layout_config: LayoutConfig;
  };
}

const classificationColors: Record<string, string> = {
  "TLP:WHITE": "bg-gray-100 text-gray-800",
  "TLP:GREEN": "bg-green-100 text-green-800",
  "TLP:AMBER": "bg-amber-100 text-amber-800",
  "TLP:RED": "bg-red-100 text-red-800",
  CONFIDENTIAL: "bg-orange-100 text-orange-800",
  SECRET: "bg-red-100 text-red-800",
  "TOP SECRET": "bg-purple-100 text-purple-800",
  UNCLASSIFIED: "bg-green-100 text-green-800",
};

const severityColors: Record<string, string> = {
  critical: "bg-red-500/20 text-red-500",
  high: "bg-orange-500/20 text-orange-500",
  medium: "bg-blue-500/20 text-blue-500",
  low: "bg-green-500/20 text-green-500",
  info: "bg-gray-500/20 text-gray-500",
};

export function EnterpriseReportViewer({ report }: EnterpriseReportViewerProps) {
  const [language, setLanguage] = useState<"en" | "th">("en");
  const layout = report.merged_layout_config;
  const content: ReportContentEN | null = language === "th" ? report.content_th : report.content_en;

  const primaryStyle = { color: layout.primary_color };

  return (
    <div
      className="space-y-8"
      style={
        layout.theme === "dark"
          ? { background: "#1a1a2e", color: "#e0e0e0", borderRadius: "1rem", padding: "2rem" }
          : {}
      }
    >
      {/* Top bar: language toggle + classification badge */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider ${
              classificationColors[report.classification] ??
              "bg-surface-container-high text-on-surface-variant"
            }`}
          >
            {report.classification}
          </span>
          {report.severity && (
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-widest ${
                severityColors[report.severity] ?? "bg-gray-500/20 text-gray-500"
              }`}
            >
              {report.severity}
            </span>
          )}
        </div>

        {/* Language toggle */}
        <div className="flex items-center gap-1 bg-surface-container rounded-lg p-1">
          <Globe size={14} className="text-on-surface-variant ml-1" />
          <button
            onClick={() => setLanguage("en")}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
              language === "en"
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage("th")}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
              language === "th"
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            TH
          </button>
        </div>
      </div>

      {/* Cover / Header */}
      {layout.sections.includes("cover") && (
        <div className="text-center space-y-2 pb-6 border-b border-outline-variant/20">
          <h1
            className="text-3xl sm:text-4xl font-headline font-bold"
            style={primaryStyle}
          >
            {report.title}
          </h1>
          {(report.subtitle ?? content?.subtitle) && (
            <p className="text-lg text-on-surface-variant italic">
              {report.subtitle ?? content?.subtitle}
            </p>
          )}
          <p className="text-sm text-on-surface-variant">
            {new Date(report.created_at).toLocaleDateString(
              language === "th" ? "th-TH" : "en-US",
              { year: "numeric", month: "long", day: "numeric" }
            )}
          </p>
        </div>
      )}

      {/* No content fallback */}
      {!content && (
        <p className="text-sm text-on-surface-variant italic text-center py-8">
          {language === "th" ? "ยังไม่มีเนื้อหาภาษาไทย" : "Content not available."}
        </p>
      )}

      {content && (
        <div className="space-y-8">
          {/* Executive Summary */}
          {layout.sections.includes("executive_summary") && content.executive_summary && (
            <section>
              <SectionHeading
                title={language === "th" ? "สรุปผู้บริหาร" : "Executive Summary"}
                color={layout.primary_color}
              />
              <p className="text-sm leading-relaxed text-on-surface font-body whitespace-pre-line">
                {content.executive_summary}
              </p>
            </section>
          )}

          {/* Threat Landscape */}
          {layout.sections.includes("threat_landscape") && content.threat_landscape && (
            <section>
              <SectionHeading
                title={language === "th" ? "ภูมิทัศน์ภัยคุกคาม" : "Threat Landscape"}
                color={layout.primary_color}
              />
              <p className="text-sm leading-relaxed text-on-surface font-body whitespace-pre-line">
                {content.threat_landscape}
              </p>
            </section>
          )}

          {/* Risk Matrix */}
          {layout.sections.includes("risk_matrix") && (
            <section>
              <SectionHeading
                title={language === "th" ? "เมทริกซ์ความเสี่ยง" : "Risk Matrix"}
                color={layout.primary_color}
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-container rounded-lg px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wide text-on-surface-variant mb-1">
                    {language === "th" ? "ระดับความเสี่ยง" : "Risk Level"}
                  </p>
                  <p className="text-lg font-semibold text-on-surface">{content.risk_level}</p>
                </div>
                <div className="bg-surface-container rounded-lg px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wide text-on-surface-variant mb-1">
                    {language === "th" ? "ระดับความเชื่อมั่น" : "Confidence Level"}
                  </p>
                  <p className="text-lg font-semibold text-on-surface">{content.confidence_level}</p>
                </div>
              </div>
            </section>
          )}

          {/* Immediate Actions */}
          {layout.sections.includes("immediate_actions") && content.immediate_actions?.length > 0 && (
            <section>
              <SectionHeading
                title={language === "th" ? "การดำเนินการทันที" : "Immediate Actions"}
                color={layout.primary_color}
              />
              <ol className="space-y-2">
                {content.immediate_actions.map((action, i) => (
                  <li key={i} className="flex gap-3 text-sm text-on-surface font-body">
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: layout.primary_color }}
                    >
                      {i + 1}
                    </span>
                    {action}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Strategic Actions */}
          {layout.sections.includes("strategic_actions") && content.strategic_actions?.length > 0 && (
            <section>
              <SectionHeading
                title={language === "th" ? "การดำเนินการเชิงกลยุทธ์" : "Strategic Actions"}
                color={layout.primary_color}
              />
              <ol className="space-y-2">
                {content.strategic_actions.map((action, i) => (
                  <li key={i} className="flex gap-3 text-sm text-on-surface font-body">
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        backgroundColor: layout.accent_color,
                        color: "#fff",
                      }}
                    >
                      {i + 1}
                    </span>
                    {action}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* IOC Table */}
          {layout.sections.includes("ioc_table") && content.ioc_table && content.ioc_table.length > 0 && (
            <section>
              <SectionHeading
                title={language === "th" ? "ตัวบ่งชี้การประนีประนอม" : "Indicators of Compromise"}
                color={layout.primary_color}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr style={{ backgroundColor: layout.primary_color }}>
                      <th className="px-4 py-2 text-left text-white text-xs uppercase tracking-wide">
                        {language === "th" ? "ประเภท" : "Type"}
                      </th>
                      <th className="px-4 py-2 text-left text-white text-xs uppercase tracking-wide">
                        {language === "th" ? "ค่า" : "Value"}
                      </th>
                      <th className="px-4 py-2 text-left text-white text-xs uppercase tracking-wide">
                        {language === "th" ? "แหล่งที่มา" : "Source"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.ioc_table.map((ioc, i) => (
                      <tr
                        key={i}
                        className={i % 2 === 0 ? "bg-surface-container" : "bg-surface-container-low"}
                      >
                        <td className="px-4 py-2 text-xs font-mono text-on-surface-variant">
                          {ioc.type}
                        </td>
                        <td className="px-4 py-2 text-xs font-mono text-on-surface">{ioc.value}</td>
                        <td className="px-4 py-2 text-xs text-on-surface-variant">{ioc.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* References */}
          {layout.sections.includes("references") && (
            <section>
              <SectionHeading
                title={language === "th" ? "แหล่งอ้างอิง" : "References"}
                color={layout.primary_color}
              />
              <p className="text-sm text-on-surface-variant font-body">
                {language === "th"
                  ? "รายงานนี้สร้างขึ้นจากบทความและแหล่งข่าวกรองภัยคุกคามที่รวบรวมโดย Sentinel Lens"
                  : "This report was generated from articles and threat intelligence sources aggregated by Sentinel Lens."}
              </p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function SectionHeading({ title, color }: { title: string; color: string }) {
  return (
    <h2
      className="text-lg font-headline font-bold mb-3 pb-2 border-b"
      style={{ color, borderColor: `${color}30` }}
    >
      {title}
    </h2>
  );
}
