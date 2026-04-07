"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import type { ArticleWithTranslation } from "@/lib/types/database";

const reportTypeOptions = [
  { value: "executive", label: "Executive Report" },
  { value: "incident", label: "Incident Report" },
  { value: "weekly", label: "Weekly Summary" },
];

const classificationOptions = [
  { value: "TLP:GREEN", label: "TLP:GREEN" },
  { value: "TLP:AMBER", label: "TLP:AMBER" },
  { value: "TLP:RED", label: "TLP:RED" },
  { value: "TLP:CLEAR", label: "TLP:CLEAR" },
];

export default function NewReportPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [reportType, setReportType] = useState("executive");
  const [classification, setClassification] = useState("TLP:GREEN");
  const [articles, setArticles] = useState<ArticleWithTranslation[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function fetchArticles() {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase
        .from("articles")
        .select("*, translations(*)")
        .order("published_at", { ascending: false })
        .limit(30);

      const mapped: ArticleWithTranslation[] = (data ?? []).map(
        (a: Record<string, unknown>) => ({
          ...a,
          translations: Array.isArray(a.translations)
            ? (a.translations as unknown[])[0] || null
            : a.translations,
        })
      ) as ArticleWithTranslation[];

      setArticles(mapped);
    }
    fetchArticles();
  }, []);

  const toggleArticle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!title || selectedIds.size === 0) return;
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/report-gen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          report_type: reportType,
          classification,
          article_ids: Array.from(selectedIds),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Report generation failed");
        return;
      }

      if (data?.report_id) {
        router.push(`/report/${data.report_id}`);
      }
    } catch (err) {
      console.error("Report generation failed:", err);
      setError("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <h1 className="font-headline text-2xl font-bold text-on-surface mb-1">
        Generate Report
      </h1>
      <p className="text-sm text-on-surface-variant mb-8">
        Select articles and configure report parameters
      </p>

      {/* Config section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 block">
            Report Title
          </label>
          <Input
            placeholder="Enter report title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 block">
            Report Type
          </label>
          <Select
            options={reportTypeOptions}
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 block">
            Classification
          </label>
          <Select
            options={classificationOptions}
            value={classification}
            onChange={(e) => setClassification(e.target.value)}
          />
        </div>
      </div>

      {/* Article selection */}
      <h2 className="font-headline text-lg font-bold text-on-surface mb-4">
        Select Articles ({selectedIds.size} selected)
      </h2>

      <div className="space-y-2 mb-8 max-h-[500px] overflow-y-auto">
        {articles.map((article) => (
          <Card
            key={article.id}
            variant={selectedIds.has(article.id) ? "high" : "low"}
            hoverable
            className="flex items-center gap-4 cursor-pointer"
            onClick={() => toggleArticle(article.id)}
          >
            <input
              type="checkbox"
              checked={selectedIds.has(article.id)}
              onChange={() => toggleArticle(article.id)}
              className="w-4 h-4 rounded accent-primary flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-on-surface truncate">
                {article.title}
              </p>
              <p className="text-xs text-on-surface-variant">
                {new Date(article.published_at).toLocaleDateString()}
              </p>
            </div>
            <Badge severity={article.severity} />
          </Card>
        ))}
        {articles.length === 0 && (
          <p className="text-center py-8 text-on-surface-variant">
            No articles available.
          </p>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-error/10 border border-error/30 rounded-lg p-3 text-error text-sm">
          {error}
        </div>
      )}

      {/* Generate button */}
      <div className="flex justify-end">
        <Button
          variant="security"
          size="lg"
          disabled={!title || selectedIds.size === 0 || generating}
          onClick={handleGenerate}
        >
          <span className="material-symbols-outlined text-lg">
            {generating ? "hourglass_empty" : "auto_awesome"}
          </span>
          {generating ? "Generating..." : "Generate Report"}
        </Button>
      </div>
    </div>
  );
}
