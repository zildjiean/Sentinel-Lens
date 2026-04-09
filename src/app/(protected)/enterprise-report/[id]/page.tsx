import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { mergeLayoutConfig } from "@/lib/enterprise-report/merge-layout";
import { EnterpriseReportPageClient } from "@/components/enterprise-report/EnterpriseReportPageClient";
import type { EnterpriseReport, LayoutConfig, EnterpriseReportLayout } from "@/lib/types/enterprise";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function fetchReport(id: string) {
  const supabase = await createClient();

  const { data: report, error: reportErr } = await supabase
    .from("enterprise_reports")
    .select("*")
    .eq("id", id)
    .single();

  if (reportErr || !report) return null;

  let layout: EnterpriseReportLayout | null = null;
  if (report.layout_id) {
    const { data: layoutData } = await supabase
      .from("enterprise_report_layouts")
      .select("*")
      .eq("id", report.layout_id)
      .single();
    layout = layoutData ?? null;
  }

  const baseLayoutConfig = layout?.layout_config as LayoutConfig | undefined | null;
  const override = report.layout_config_override as Partial<LayoutConfig> | undefined | null;
  const merged_layout_config = mergeLayoutConfig(baseLayoutConfig, override);

  return {
    report: report as EnterpriseReport,
    layout,
    merged_layout_config,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await fetchReport(id);
  if (!data) return { title: "Report Not Found" };
  return {
    title: `${data.report.title} | Enterprise Report — Sentinel Lens`,
    description: data.report.subtitle ?? `${data.report.report_type} — ${data.report.classification}`,
  };
}

export default async function EnterpriseReportDetailPage({ params }: PageProps) {
  const { id } = await params;
  const data = await fetchReport(id);

  if (!data) notFound();

  const { report, merged_layout_config } = data;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/enterprise-report"
        className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
      >
        <ArrowLeft size={16} />
        All Reports
      </Link>

      {/* Client wrapper: shares language state between Viewer and Exporter */}
      <EnterpriseReportPageClient
        reportId={id}
        report={report}
        mergedLayout={merged_layout_config}
      />
    </div>
  );
}
