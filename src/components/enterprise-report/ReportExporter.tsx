"use client";

import { useState } from "react";
import { Loader2, Download, FileText } from "lucide-react";
import { generateAndDownloadDocx } from "@/lib/enterprise-report/generate-docx";
import type { LayoutConfig, ReportContentEN } from "@/lib/types/enterprise";

interface ReportExporterProps {
  reportId: string;
  report: {
    title: string;
    subtitle: string | null;
    classification: string;
    severity: string | null;
    report_type: string;
    content_en: ReportContentEN | null;
    content_th: ReportContentEN | null;
    created_at: string;
  };
  mergedLayout: LayoutConfig;
  language: "en" | "th";
}

export function ReportExporter({ reportId, report, mergedLayout, language }: ReportExporterProps) {
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExportPdf() {
    setExportingPdf(true);
    setError(null);
    try {
      const res = await fetch(`/api/enterprise-report/${reportId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "pdf", language }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${language}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleExportDocx() {
    setExportingDocx(true);
    setError(null);
    try {
      const content = language === "th" ? report.content_th : report.content_en;
      if (!content) throw new Error("No content available for selected language");

      await generateAndDownloadDocx({
        title: report.title,
        subtitle: report.subtitle,
        classification: report.classification,
        severity: report.severity,
        report_type: report.report_type,
        content,
        layout: mergedLayout,
        created_at: report.created_at,
        language,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExportingDocx(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-error bg-error/10 rounded-lg px-4 py-2">{error}</p>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleExportPdf}
          disabled={exportingPdf || exportingDocx}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-sm font-semibold hover:bg-surface-container-high transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exportingPdf ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Download size={16} />
          )}
          Export PDF
        </button>

        <button
          onClick={handleExportDocx}
          disabled={exportingPdf || exportingDocx}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-sm font-semibold hover:bg-surface-container-high transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exportingDocx ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <FileText size={16} />
          )}
          Export DOCX
        </button>
      </div>
    </div>
  );
}
