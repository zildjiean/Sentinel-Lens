"use client";

import { useState } from "react";
import { EnterpriseReportViewer } from "./EnterpriseReportViewer";
import { ReportExporter } from "./ReportExporter";
import type { EnterpriseReport, LayoutConfig } from "@/lib/types/enterprise";

interface Props {
  reportId: string;
  report: EnterpriseReport;
  mergedLayout: LayoutConfig;
}

export function EnterpriseReportPageClient({ reportId, report, mergedLayout }: Props) {
  const [language, setLanguage] = useState<"en" | "th">("en");

  const reportWithLayout = { ...report, merged_layout_config: mergedLayout };

  return (
    <>
      <ReportExporter
        reportId={reportId}
        report={report}
        mergedLayout={mergedLayout}
        language={language}
      />

      <div className="bg-surface-container-low rounded-xl p-6 sm:p-8">
        <EnterpriseReportViewer
          report={reportWithLayout}
          language={language}
          onLanguageChange={setLanguage}
        />
      </div>
    </>
  );
}
