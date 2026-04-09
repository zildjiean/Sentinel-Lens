"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, ChevronRight } from "lucide-react";
import { ArticleSelector } from "./ArticleSelector";
import { LayoutPicker } from "./LayoutPicker";
import { AIDesignPanel } from "./AIDesignPanel";
import { Input } from "@/components/ui/Input";
import type { LayoutConfig } from "@/lib/types/enterprise";

const STEPS = [
  { label: "Articles & Info", description: "Select articles and enter report details" },
  { label: "Layout", description: "Choose a report layout template" },
  { label: "AI Design", description: "Optionally customize design with AI" },
  { label: "Review & Generate", description: "Review and generate your report" },
];

const REPORT_TYPES = [
  "Threat Intelligence",
  "Incident Report",
  "Executive Briefing",
  "Vulnerability Assessment",
  "Weekly Digest",
  "Monthly Summary",
];

const CLASSIFICATIONS = ["TLP:WHITE", "TLP:GREEN", "TLP:AMBER", "TLP:RED", "CONFIDENTIAL", "SECRET", "TOP SECRET", "UNCLASSIFIED"];

export function ReportWizard() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);
  const [layoutOverride, setLayoutOverride] = useState<Partial<LayoutConfig> | null>(null);
  const [title, setTitle] = useState("");
  const [reportType, setReportType] = useState(REPORT_TYPES[0]);
  const [classification, setClassification] = useState(CLASSIFICATIONS[0]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step validation
  const stepValid: Record<number, boolean> = {
    1: title.trim().length > 0 && selectedArticleIds.length > 0,
    2: selectedLayoutId !== null,
    3: true, // AI design step can always proceed
    4: true,
  };

  function goNext() {
    if (step < 4) setStep((s) => s + 1);
  }

  function goBack() {
    if (step > 1) setStep((s) => s - 1);
  }

  async function handleGenerate() {
    if (!selectedLayoutId) return;
    setGenerating(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        article_ids: selectedArticleIds,
        title: title.trim(),
        report_type: reportType,
        classification,
        layout_id: selectedLayoutId,
      };
      if (layoutOverride) {
        body.layout_config_override = layoutOverride;
      }

      const res = await fetch("/api/enterprise-report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Generation failed (${res.status})`);
      }

      const data = await res.json();
      const reportId: string = data.report?.id;
      if (!reportId) throw new Error("No report ID returned");
      router.push(`/enterprise-report/${reportId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setGenerating(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => {
          const num = i + 1;
          const isActive = step === num;
          const isCompleted = step > num;
          return (
            <div key={num} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
                    isCompleted
                      ? "bg-primary text-on-primary"
                      : isActive
                      ? "bg-primary text-on-primary ring-4 ring-primary/20"
                      : "bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  {isCompleted ? <CheckCircle2 size={16} /> : num}
                </div>
                <span
                  className={`text-[10px] font-medium text-center hidden sm:block ${
                    isActive ? "text-primary" : isCompleted ? "text-on-surface" : "text-on-surface-variant"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-colors ${
                    step > num ? "bg-primary" : "bg-outline-variant/30"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="bg-surface-container-low rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-lg font-headline font-semibold text-on-surface">
            Step {step}: {STEPS[step - 1].label}
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">{STEPS[step - 1].description}</p>
        </div>

        {/* Step 1: Title + Type + Classification + Articles */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-2 font-body">
                Report Title <span className="text-error">*</span>
              </label>
              <Input
                placeholder="e.g. Q2 2025 Threat Intelligence Brief"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2 font-body">
                  Report Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full bg-surface-container-lowest border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none text-on-surface px-4 py-2.5 text-sm font-body transition-colors duration-200"
                >
                  {REPORT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-2 font-body">
                  Classification
                </label>
                <select
                  value={classification}
                  onChange={(e) => setClassification(e.target.value)}
                  className="w-full bg-surface-container-lowest border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none text-on-surface px-4 py-2.5 text-sm font-body transition-colors duration-200"
                >
                  {CLASSIFICATIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface mb-3 font-body">
                Select Articles <span className="text-error">*</span>
              </label>
              <ArticleSelector selectedIds={selectedArticleIds} onSelect={setSelectedArticleIds} />
            </div>
          </div>
        )}

        {/* Step 2: Layout Picker */}
        {step === 2 && (
          <LayoutPicker
            selectedId={selectedLayoutId}
            onSelect={setSelectedLayoutId}
          />
        )}

        {/* Step 3: AI Design */}
        {step === 3 && selectedLayoutId && (
          <AIDesignPanel
            layoutId={selectedLayoutId}
            onApply={(override) => {
              setLayoutOverride(override);
              goNext();
            }}
            onSkip={goNext}
          />
        )}

        {/* Step 4: Summary */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SummaryRow label="Title" value={title} />
              <SummaryRow label="Report Type" value={reportType} />
              <SummaryRow label="Classification" value={classification} />
              <SummaryRow label="Articles" value={`${selectedArticleIds.length} selected`} />
              <SummaryRow label="Layout" value={selectedLayoutId ?? "—"} mono />
              <SummaryRow label="AI Design" value={layoutOverride ? "Applied" : "Default"} />
            </div>

            {error && (
              <p className="text-sm text-error bg-error/10 rounded-lg px-4 py-3">{error}</p>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating || selectedArticleIds.length === 0 || !selectedLayoutId}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-on-primary text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity mt-4"
            >
              {generating && <Loader2 size={16} className="animate-spin" />}
              {generating ? "Generating Report..." : "Generate Report"}
              {!generating && <ChevronRight size={16} />}
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      {step !== 3 && (
        <div className="flex items-center justify-between">
          <button
            onClick={goBack}
            disabled={step === 1}
            className="px-5 py-2.5 rounded-xl bg-surface-container text-on-surface-variant text-sm font-semibold hover:bg-surface-container-high transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Back
          </button>
          {step < 4 && (
            <button
              onClick={goNext}
              disabled={!stepValid[step]}
              className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-surface-container rounded-lg px-4 py-3">
      <p className="text-[10px] text-on-surface-variant uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-sm text-on-surface ${mono ? "font-mono text-xs" : "font-body"}`}>
        {value}
      </p>
    </div>
  );
}
