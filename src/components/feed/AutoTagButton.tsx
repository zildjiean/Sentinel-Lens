"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tag, Hourglass } from "lucide-react";

export function AutoTagButton() {
  const [tagging, setTagging] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  async function handleAutoTag() {
    if (!confirm("Auto-tag all untagged articles? This will analyze content and assign relevant tags.")) return;

    setTagging(true);
    setResult(null);

    try {
      const res = await fetch("/api/auto-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag_all: true }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult(`Tagged ${data.tagged} of ${data.total} articles`);
        router.refresh();
      } else {
        setResult(data.error || "Auto-tagging failed");
      }
    } catch {
      setResult("Network error");
    } finally {
      setTagging(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleAutoTag}
        disabled={tagging}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container-high text-on-surface-variant text-sm font-medium hover:text-on-surface hover:bg-surface-container-highest transition-colors disabled:opacity-50"
      >
        {tagging ? <Hourglass className="w-5 h-5" /> : <Tag className="w-5 h-5" />}
        {tagging ? "Auto-tagging..." : "Auto-Tag All"}
      </button>
      {result && <span className="text-xs text-secondary">{result}</span>}
    </div>
  );
}
