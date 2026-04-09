import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EnterpriseReportCard } from "@/components/enterprise-report/EnterpriseReportCard";
import type { EnterpriseReport } from "@/lib/types/enterprise";

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
            <EnterpriseReportCard
              key={report.id}
              id={report.id}
              title={report.title}
              report_type={report.report_type}
              status={report.status}
              severity={report.severity}
              classification={report.classification}
              created_at={report.created_at}
            />
          ))}
        </div>
      )}
    </div>
  );
}
