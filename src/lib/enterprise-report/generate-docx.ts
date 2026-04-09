"use client";

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";
import { saveAs } from "file-saver";
import type { LayoutConfig, ReportContentEN } from "@/lib/types/enterprise";

interface GenerateDocxData {
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

function hexToDocxColor(hex: string): string {
  // Remove # prefix for docx
  return hex.replace(/^#/, "");
}

export async function generateAndDownloadDocx(data: GenerateDocxData): Promise<void> {
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

  const primaryColor = hexToDocxColor(layout.primary_color);
  const sections = layout.sections;
  const children: (Paragraph | Table)[] = [];

  for (const section of sections) {
    switch (section) {
      case "cover": {
        // Classification
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: classification,
                bold: true,
                size: 20,
                color: primaryColor,
                allCaps: true,
              }),
            ],
            spacing: { before: 2880, after: 480 },
          })
        );

        // Title
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: title,
                bold: true,
                size: 56,
                color: primaryColor,
              }),
            ],
            spacing: { after: 240 },
          })
        );

        // Subtitle
        if (subtitle) {
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: subtitle,
                  size: 26,
                  italics: true,
                }),
              ],
              spacing: { after: 240 },
            })
          );
        }

        // Report type
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: report_type,
                size: 22,
                allCaps: true,
                color: primaryColor,
              }),
            ],
            spacing: { after: 480 },
          })
        );

        // Risk and Confidence
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `${language === "th" ? "ระดับความเสี่ยง" : "Risk Level"}: ${content.risk_level ?? "Unknown"}   |   ${language === "th" ? "ระดับความเชื่อมั่น" : "Confidence"}: ${content.confidence_level ?? "Unknown"}`,
                bold: true,
                size: 22,
              }),
            ],
            spacing: { after: 480 },
          })
        );

        // Severity
        if (severity) {
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: `${language === "th" ? "ความรุนแรง" : "Severity"}: ${severity.toUpperCase()}`,
                  bold: true,
                  size: 22,
                }),
              ],
              spacing: { after: 480 },
            })
          );
        }

        // Date
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: formatDate(created_at, language),
                size: 20,
              }),
            ],
            spacing: { after: 480 },
          })
        );

        // Page break
        children.push(
          new Paragraph({
            children: [new PageBreak()],
          })
        );
        break;
      }

      case "executive_summary": {
        if (!content.executive_summary) break;

        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: language === "th" ? "สรุปผู้บริหาร" : "Executive Summary",
                color: primaryColor,
                bold: true,
              }),
            ],
            spacing: { before: 480, after: 240 },
          })
        );

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: content.executive_summary,
                size: 22,
              }),
            ],
            spacing: { after: 240 },
          })
        );
        break;
      }

      case "threat_landscape": {
        if (!content.threat_landscape) break;

        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: language === "th" ? "ภูมิทัศน์ภัยคุกคาม" : "Threat Landscape",
                color: primaryColor,
                bold: true,
              }),
            ],
            spacing: { before: 480, after: 240 },
          })
        );

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: content.threat_landscape,
                size: 22,
              }),
            ],
            spacing: { after: 240 },
          })
        );
        break;
      }

      case "risk_matrix": {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: language === "th" ? "เมทริกซ์ความเสี่ยง" : "Risk Matrix",
                color: primaryColor,
                bold: true,
              }),
            ],
            spacing: { before: 480, after: 240 },
          })
        );

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${language === "th" ? "ระดับความเสี่ยง" : "Risk Level"}: `,
                bold: true,
                size: 22,
              }),
              new TextRun({
                text: content.risk_level ?? "Unknown",
                size: 22,
              }),
            ],
            spacing: { after: 120 },
          })
        );

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${language === "th" ? "ระดับความเชื่อมั่น" : "Confidence Level"}: `,
                bold: true,
                size: 22,
              }),
              new TextRun({
                text: content.confidence_level ?? "Unknown",
                size: 22,
              }),
            ],
            spacing: { after: 240 },
          })
        );
        break;
      }

      case "immediate_actions": {
        if (!content.immediate_actions?.length) break;

        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: language === "th" ? "การดำเนินการทันที" : "Immediate Actions",
                color: primaryColor,
                bold: true,
              }),
            ],
            spacing: { before: 480, after: 240 },
          })
        );

        content.immediate_actions.forEach((action, index) => {
          children.push(
            new Paragraph({
              numbering: {
                reference: "immediate-actions-numbering",
                level: 0,
              },
              children: [
                new TextRun({
                  text: `${index + 1}. ${action}`,
                  size: 22,
                }),
              ],
              spacing: { after: 120 },
            })
          );
        });
        break;
      }

      case "strategic_actions": {
        if (!content.strategic_actions?.length) break;

        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: language === "th" ? "การดำเนินการเชิงกลยุทธ์" : "Strategic Actions",
                color: primaryColor,
                bold: true,
              }),
            ],
            spacing: { before: 480, after: 240 },
          })
        );

        content.strategic_actions.forEach((action, index) => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${index + 1}. ${action}`,
                  size: 22,
                }),
              ],
              spacing: { after: 120 },
            })
          );
        });
        break;
      }

      case "ioc_table": {
        if (!content.ioc_table?.length) break;

        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text:
                  language === "th"
                    ? "ตัวบ่งชี้การประนีประนอม"
                    : "Indicators of Compromise (IOCs)",
                color: primaryColor,
                bold: true,
              }),
            ],
            spacing: { before: 480, after: 240 },
          })
        );

        const headerRow = new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: language === "th" ? "ประเภท" : "Type",
                      bold: true,
                      color: "FFFFFF",
                    }),
                  ],
                }),
              ],
              shading: { fill: primaryColor },
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: language === "th" ? "ค่า" : "Value",
                      bold: true,
                      color: "FFFFFF",
                    }),
                  ],
                }),
              ],
              shading: { fill: primaryColor },
            }),
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: language === "th" ? "แหล่งที่มา" : "Source",
                      bold: true,
                      color: "FFFFFF",
                    }),
                  ],
                }),
              ],
              shading: { fill: primaryColor },
            }),
          ],
        });

        const dataRows = content.ioc_table.map(
          (ioc) =>
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 20, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: ioc.type, size: 20 })] })],
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: ioc.value, size: 20 })] })],
                }),
                new TableCell({
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: ioc.source, size: 20 })] })],
                }),
              ],
            })
        );

        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows],
          })
        );
        break;
      }

      case "references": {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: language === "th" ? "แหล่งอ้างอิง" : "References",
                color: primaryColor,
                bold: true,
              }),
            ],
            spacing: { before: 480, after: 240 },
          })
        );

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text:
                  language === "th"
                    ? "รายงานนี้สร้างขึ้นจากบทความและแหล่งข่าวกรองภัยคุกคามที่รวบรวมโดย Sentinel Lens"
                    : "This report was generated from articles and threat intelligence sources aggregated by Sentinel Lens.",
                size: 22,
              }),
            ],
            spacing: { after: 240 },
          })
        );
        break;
      }
    }
  }

  const doc = new Document({
    creator: "Sentinel Lens",
    title,
    description: subtitle ?? "",
    sections: [
      {
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${language}.docx`;
  saveAs(blob, filename);
}
