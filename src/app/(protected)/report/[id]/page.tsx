import { createClient } from "@/lib/supabase/server";
import { ReportHeader } from "@/components/report/ReportHeader";
import { ReportViewer } from "@/components/report/ReportViewer";
import type { Report } from "@/lib/types/database";
import { notFound } from "next/navigation";

export default async function ReportViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) {
    notFound();
  }

  const report = data as Report;

  return (
    <div>
      <ReportHeader
        severity={report.severity}
        classification={report.classification}
      />
      <ReportViewer report={report} />
    </div>
  );
}
