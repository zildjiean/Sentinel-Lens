import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ReportViewer } from "@/components/report/ReportViewer";
import type { Report } from "@/lib/types/database";
import { notFound } from "next/navigation";

interface PageProps {
  params: { id: string };
}

export default async function ReportViewPage({ params }: PageProps) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!data) {
    notFound();
  }

  const report = data as Report;

  return (
    <div>
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-outline-variant/20 -mx-8 px-8 py-3 mb-8 flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <Badge severity={report.severity} />
          <span className="text-xs uppercase tracking-widest text-tertiary font-semibold">
            {report.classification}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <span className="material-symbols-outlined text-lg">download</span>
            Download
          </Button>
          <Button variant="ghost" size="sm" onClick={() => {}}>
            <span className="material-symbols-outlined text-lg">print</span>
            Print
          </Button>
          <Button variant="ghost" size="sm">
            <span className="material-symbols-outlined text-lg">share</span>
            Share
          </Button>
        </div>
      </div>

      <ReportViewer report={report} />
    </div>
  );
}
