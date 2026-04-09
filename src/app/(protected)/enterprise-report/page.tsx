import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import type { ArticleSeverity } from "@/lib/types/database";
import type { EnterpriseReport, EnterpriseReportStatus } from "@/lib/types/enterprise";

const statusColors: Record<EnterpriseReportStatus, string> = {
  draft: "bg-surface-container-high text-on-surface-variant",
  generating: "bg-primary/20 text-primary",
  generated: "bg-secondary/20 text-secondary",
  reviewed: "bg-secondary/20 text-secondary",
  published: "bg-green-500/20 text-green-600",
};

export default async function EnterpriseReportListPage() {
  const supabase = await createClient();
  const { data: reports } = await supabase
    .from("enterprise_reports")
    .select("*")
    .order("created_at", { ascending: false });

  const list = (reports ?? []) as EnterpriseReport[];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-headline font-bold text-on-surface">Enterprise Reports</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            AI-generated threat intelligence reports for executive audiences.
          </p>
        </div>
        <Link
          href="/enterprise-report/new"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          New Enterprise Report
        </Link>
      </div>

      {/* Grid */}
      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center">
            <FileText size={28} className="text-on-surface-variant" />
          </div>
          <div>
            <p className="text-base font-semibold text-on-surface">No reports yet</p>
            <p className="text-sm text-on-surface-variant mt-1">
              Create your first enterprise report to get started.
            </p>
          </div>
          <Link
            href="/enterprise-report/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            New Enterprise Report
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {list.map((report) => (
            <Link
              key={report.id}
              href={`/enterprise-report/${report.id}`}
              className="group block rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/20 hover:border-outline-variant transition-all duration-200 p-5 space-y-3"
            >
              {/* Type + Status row */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-semibold uppercase tracking-wide">
                  {report.report_type}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wide ${
                    statusColors[report.status]
                  }`}
                >
                  {report.status}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-sm font-semibold text-on-surface font-headline group-hover:text-primary transition-colors line-clamp-2">
                {report.title}
              </h2>

              {/* Severity + Classification */}
              <div className="flex items-center gap-2 flex-wrap">
                {report.severity && (
                  <Badge
                    severity={report.severity as ArticleSeverity}
                  />
                )}
                <span className="text-[10px] px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-semibold uppercase tracking-wider">
                  {report.classification}
                </span>
              </div>

              {/* Date */}
              <p className="text-[11px] text-on-surface-variant">
                {new Date(report.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
