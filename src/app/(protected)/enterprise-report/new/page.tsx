"use client";

import { ReportWizard } from "@/components/enterprise-report/ReportWizard";

export default function NewEnterpriseReportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-headline font-bold text-on-surface">New Enterprise Report</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Follow the steps below to generate an AI-powered enterprise threat intelligence report.
        </p>
      </div>
      <ReportWizard />
    </div>
  );
}
