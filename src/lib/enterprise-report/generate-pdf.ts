import type { LayoutConfig, ReportContentEN } from "@/lib/types/enterprise";

interface BuildReportHTMLData {
  title: string;
  subtitle?: string | null;
  classification: string;
  severity?: string | null;
  report_type: string;
  content: ReportContentEN;
  layout: LayoutConfig;
  created_at: string;
  language?: "en" | "th";
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#EF4444",
  high: "#F97316",
  medium: "#3B82F6",
  low: "#22C55E",
};

function formatDate(iso: string, language: "en" | "th"): string {
  const date = new Date(iso);
  if (language === "th") {
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSection(
  section: string,
  content: ReportContentEN,
  title: string,
  subtitle: string | null | undefined,
  classification: string,
  severity: string | null | undefined,
  report_type: string,
  created_at: string,
  layout: LayoutConfig,
  language: "en" | "th"
): string {
  const primaryColor = layout.primary_color;
  const accentColor = layout.accent_color;
  const severityColor = SEVERITY_COLORS[severity?.toLowerCase() ?? ""] ?? "#3B82F6";

  switch (section) {
    case "cover":
      return `
        <div class="cover-page page-break-after">
          ${
            layout.classification_watermark
              ? `<div class="watermark">${escapeHtml(classification)}</div>`
              : ""
          }
          <div class="cover-content">
            <div class="classification-badge" style="background:${severityColor}20;border:1px solid ${severityColor};color:${severityColor}">
              ${escapeHtml(classification)}
            </div>
            <h1 class="cover-title" style="color:${primaryColor}">${escapeHtml(title)}</h1>
            ${subtitle ? `<p class="cover-subtitle">${escapeHtml(subtitle)}</p>` : ""}
            <p class="cover-report-type" style="color:${accentColor}">${escapeHtml(report_type)}</p>
            <div class="cover-meta">
              <span class="badge" style="background:${severityColor}20;color:${severityColor};border:1px solid ${severityColor}">
                Risk: ${escapeHtml(content.risk_level ?? "Unknown")}
              </span>
              <span class="badge" style="background:${accentColor}20;color:${accentColor};border:1px solid ${accentColor}">
                Confidence: ${escapeHtml(content.confidence_level ?? "Unknown")}
              </span>
            </div>
            <p class="cover-date">${formatDate(created_at, language)}</p>
          </div>
        </div>`;

    case "executive_summary":
      return content.executive_summary
        ? `
        <div class="section">
          <h2 class="section-heading" style="color:${primaryColor};border-left:4px solid ${accentColor}">
            ${language === "th" ? "สรุปผู้บริหาร" : "Executive Summary"}
          </h2>
          <div class="section-body">${escapeHtml(content.executive_summary).replace(/\n/g, "<br/>")}</div>
        </div>`
        : "";

    case "threat_landscape":
      return content.threat_landscape
        ? `
        <div class="section">
          <h2 class="section-heading" style="color:${primaryColor};border-left:4px solid ${accentColor}">
            ${language === "th" ? "ภูมิทัศน์ภัยคุกคาม" : "Threat Landscape"}
          </h2>
          <div class="section-body">${escapeHtml(content.threat_landscape).replace(/\n/g, "<br/>")}</div>
        </div>`
        : "";

    case "risk_matrix":
      return `
        <div class="section">
          <h2 class="section-heading" style="color:${primaryColor};border-left:4px solid ${accentColor}">
            ${language === "th" ? "เมทริกซ์ความเสี่ยง" : "Risk Matrix"}
          </h2>
          <div class="risk-matrix">
            <div class="risk-item">
              <span class="risk-label">${language === "th" ? "ระดับความเสี่ยง" : "Risk Level"}</span>
              <span class="risk-value" style="color:${severityColor}">${escapeHtml(content.risk_level ?? "Unknown")}</span>
            </div>
            <div class="risk-item">
              <span class="risk-label">${language === "th" ? "ระดับความเชื่อมั่น" : "Confidence Level"}</span>
              <span class="risk-value" style="color:${accentColor}">${escapeHtml(content.confidence_level ?? "Unknown")}</span>
            </div>
          </div>
        </div>`;

    case "immediate_actions":
      return content.immediate_actions?.length
        ? `
        <div class="section">
          <h2 class="section-heading" style="color:${primaryColor};border-left:4px solid ${accentColor}">
            ${language === "th" ? "การดำเนินการทันที" : "Immediate Actions"}
          </h2>
          <ol class="action-list">
            ${content.immediate_actions.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}
          </ol>
        </div>`
        : "";

    case "strategic_actions":
      return content.strategic_actions?.length
        ? `
        <div class="section">
          <h2 class="section-heading" style="color:${primaryColor};border-left:4px solid ${accentColor}">
            ${language === "th" ? "การดำเนินการเชิงกลยุทธ์" : "Strategic Actions"}
          </h2>
          <ol class="action-list">
            ${content.strategic_actions.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}
          </ol>
        </div>`
        : "";

    case "ioc_table":
      return content.ioc_table?.length
        ? `
        <div class="section">
          <h2 class="section-heading" style="color:${primaryColor};border-left:4px solid ${accentColor}">
            ${language === "th" ? "ตัวบ่งชี้การประนีประนอม" : "Indicators of Compromise (IOCs)"}
          </h2>
          <table class="ioc-table">
            <thead>
              <tr style="background:${primaryColor};color:white">
                <th>${language === "th" ? "ประเภท" : "Type"}</th>
                <th>${language === "th" ? "ค่า" : "Value"}</th>
                <th>${language === "th" ? "แหล่งที่มา" : "Source"}</th>
              </tr>
            </thead>
            <tbody>
              ${content.ioc_table
                .map(
                  (ioc, i) => `
                <tr style="${i % 2 === 0 ? "background:rgba(0,0,0,0.03)" : ""}">
                  <td><span class="ioc-type">${escapeHtml(ioc.type)}</span></td>
                  <td class="ioc-value">${escapeHtml(ioc.value)}</td>
                  <td>${escapeHtml(ioc.source)}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>`
        : "";

    case "references":
      return `
        <div class="section">
          <h2 class="section-heading" style="color:${primaryColor};border-left:4px solid ${accentColor}">
            ${language === "th" ? "แหล่งอ้างอิง" : "References"}
          </h2>
          <p class="section-body">${language === "th" ? "รายงานนี้สร้างขึ้นจากบทความและแหล่งข่าวกรองภัยคุกคามที่รวบรวมโดย Sentinel Lens" : "This report was generated from articles and threat intelligence sources aggregated by Sentinel Lens."}</p>
        </div>`;

    default:
      return "";
  }
}

export function buildReportHTML(data: BuildReportHTMLData): string {
  const {
    title,
    subtitle,
    classification,
    severity,
    report_type,
    content,
    layout,
    created_at,
    language = "en",
  } = data;

  const isDark = layout.theme === "dark";
  const bgColor = isDark ? "#0F172A" : "#ffffff";
  const textColor = isDark ? "#E2E8F0" : "#1E293B";
  const secondaryBg = isDark ? "#1E293B" : "#F8FAFC";
  const borderColor = isDark ? "#334155" : "#E2E8F0";

  const sections = layout.sections
    .map((section) =>
      renderSection(
        section,
        content,
        title,
        subtitle,
        classification,
        severity,
        report_type,
        created_at,
        layout,
        language
      )
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    @page {
      size: A4;
      margin: 20mm 20mm 25mm 20mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: '${language === "th" ? "Sarabun" : layout.font_body}', 'Inter', sans-serif;
      background: ${bgColor};
      color: ${textColor};
      font-size: 11pt;
      line-height: 1.6;
    }

    h1, h2, h3 {
      font-family: '${language === "th" ? "Sarabun" : layout.font_heading}', 'Manrope', sans-serif;
    }

    .page-break-after {
      page-break-after: always;
    }

    /* Cover Page */
    .cover-page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 60px 40px;
      position: relative;
      background: ${bgColor};
    }

    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 80px;
      font-weight: 900;
      opacity: 0.04;
      color: ${textColor};
      white-space: nowrap;
      pointer-events: none;
      z-index: 0;
      letter-spacing: 10px;
    }

    .cover-content {
      position: relative;
      z-index: 1;
      max-width: 600px;
    }

    .classification-badge {
      display: inline-block;
      padding: 4px 14px;
      border-radius: 4px;
      font-size: 10pt;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 32px;
    }

    .cover-title {
      font-size: 28pt;
      font-weight: 800;
      line-height: 1.2;
      margin-bottom: 16px;
    }

    .cover-subtitle {
      font-size: 13pt;
      opacity: 0.75;
      margin-bottom: 12px;
    }

    .cover-report-type {
      font-size: 11pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 32px;
    }

    .cover-meta {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
      margin-bottom: 32px;
    }

    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 9pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .cover-date {
      font-size: 10pt;
      opacity: 0.6;
    }

    /* Sections */
    .section {
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid ${borderColor};
    }

    .section:last-child {
      border-bottom: none;
    }

    .section-heading {
      font-size: 15pt;
      font-weight: 700;
      padding-left: 14px;
      margin-bottom: 14px;
      line-height: 1.3;
    }

    .section-body {
      font-size: 10.5pt;
      line-height: 1.7;
      opacity: 0.9;
    }

    /* Risk Matrix */
    .risk-matrix {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }

    .risk-item {
      background: ${secondaryBg};
      border: 1px solid ${borderColor};
      border-radius: 8px;
      padding: 16px 24px;
      min-width: 160px;
    }

    .risk-label {
      display: block;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 1px;
      opacity: 0.6;
      margin-bottom: 6px;
    }

    .risk-value {
      display: block;
      font-size: 15pt;
      font-weight: 700;
      text-transform: capitalize;
    }

    /* Action Lists */
    .action-list {
      padding-left: 24px;
      font-size: 10.5pt;
      line-height: 1.8;
    }

    .action-list li {
      margin-bottom: 8px;
    }

    /* IOC Table */
    .ioc-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
    }

    .ioc-table th {
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
    }

    .ioc-table td {
      padding: 9px 12px;
      border-bottom: 1px solid ${borderColor};
      vertical-align: top;
    }

    .ioc-type {
      display: inline-block;
      padding: 2px 8px;
      background: ${secondaryBg};
      border-radius: 4px;
      font-size: 8.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .ioc-value {
      font-family: monospace;
      font-size: 9pt;
      word-break: break-all;
    }
  </style>
</head>
<body>
  ${sections}
</body>
</html>`;
}
