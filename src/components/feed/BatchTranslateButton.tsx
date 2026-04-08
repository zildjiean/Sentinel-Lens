"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface BatchTranslateButtonProps {
  articleIds: string[];
}

export function BatchTranslateButton({ articleIds }: BatchTranslateButtonProps) {
  const [translating, setTranslating] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  async function handleBatchTranslate() {
    if (articleIds.length === 0) return;
    if (!confirm(`Translate ${articleIds.length} article(s)? This may take a while.`)) return;

    setTranslating(true);
    setResult(null);
    setProgress({ done: 0, total: articleIds.length });

    try {
      const res = await fetch("/api/batch-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ article_ids: articleIds }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult(`Translated ${data.translated}/${data.total} articles. ${data.failed} failed.`);
        setProgress({ done: data.translated, total: data.total });
        router.refresh();
      } else {
        setResult(data.error || "Batch translation failed");
      }
    } catch {
      setResult("Network error. Please try again.");
    } finally {
      setTranslating(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleBatchTranslate}
        disabled={translating || articleIds.length === 0}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-tertiary/20 text-tertiary text-sm font-medium hover:bg-tertiary/30 transition-colors disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-lg">
          {translating ? "hourglass_empty" : "translate"}
        </span>
        {translating
          ? `Translating${progress ? ` (${progress.done}/${progress.total})` : "..."}`
          : `Batch Translate (${articleIds.length})`}
      </button>

      {/* Progress bar */}
      {translating && progress && (
        <div className="flex-1 max-w-48 h-2 bg-surface-container-high rounded-full overflow-hidden">
          <div
            className="h-full bg-tertiary rounded-full transition-all duration-300"
            style={{ width: `${(progress.done / progress.total) * 100}%` }}
          />
        </div>
      )}

      {result && !translating && (
        <span className="text-xs text-on-surface-variant">{result}</span>
      )}
    </div>
  );
}
