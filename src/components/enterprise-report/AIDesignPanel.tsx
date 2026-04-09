"use client";

import { useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import type { LayoutConfig } from "@/lib/types/enterprise";

interface AIDesignPanelProps {
  layoutId: string;
  onApply: (override: Partial<LayoutConfig>) => void;
  onSkip: () => void;
}

export function AIDesignPanel({ layoutId, onApply, onSkip }: AIDesignPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Partial<LayoutConfig> | null>(null);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      const res = await fetch("/api/enterprise-report/ai-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout_id: layoutId, prompt: prompt.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      const data = await res.json();
      setPreview(data.layout_config as Partial<LayoutConfig>);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-on-surface mb-2 font-body">
          Describe your desired design
        </label>
        <textarea
          className="w-full bg-surface-container-lowest border-2 border-outline-variant/30 focus:border-primary focus:outline-none text-on-surface placeholder:text-on-surface-variant/50 px-4 py-3 rounded-xl text-sm font-body transition-colors duration-200 resize-none"
          rows={4}
          placeholder="e.g. Make it dark themed with blue accents and a professional executive style..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
        Generate Preview
      </button>

      {error && (
        <p className="text-sm text-error bg-error/10 rounded-lg px-4 py-3">{error}</p>
      )}

      {preview && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-on-surface font-headline">Preview</h3>

          {/* Color swatches */}
          <div className="flex gap-3 items-center">
            <div className="space-y-1">
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wide">Primary</p>
              <div
                className="h-8 w-16 rounded-lg border border-outline-variant"
                style={{ backgroundColor: preview.primary_color ?? "#000" }}
              />
              <p className="text-[10px] text-on-surface-variant font-mono">
                {preview.primary_color}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wide">Accent</p>
              <div
                className="h-8 w-16 rounded-lg border border-outline-variant"
                style={{ backgroundColor: preview.accent_color ?? "#000" }}
              />
              <p className="text-[10px] text-on-surface-variant font-mono">
                {preview.accent_color}
              </p>
            </div>
            {preview.theme && (
              <div className="space-y-1">
                <p className="text-[10px] text-on-surface-variant uppercase tracking-wide">Theme</p>
                <span className="inline-block px-2 py-1 rounded bg-surface-container-high text-on-surface text-xs">
                  {preview.theme}
                </span>
              </div>
            )}
          </div>

          {/* Sections list */}
          {preview.sections && preview.sections.length > 0 && (
            <div>
              <p className="text-xs font-medium text-on-surface-variant mb-2 uppercase tracking-wide">
                Sections
              </p>
              <div className="flex flex-wrap gap-2">
                {preview.sections.map((section) => (
                  <span
                    key={section}
                    className="text-[10px] px-2 py-1 rounded bg-surface-container-high text-on-surface-variant"
                  >
                    {section.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Apply / Skip */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => onApply(preview)}
              className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Apply Design
            </button>
            <button
              onClick={onSkip}
              className="px-5 py-2.5 rounded-xl bg-surface-container text-on-surface-variant text-sm font-semibold hover:bg-surface-container-high transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {!preview && (
        <div className="pt-2">
          <button
            onClick={onSkip}
            className="px-5 py-2.5 rounded-xl bg-surface-container text-on-surface-variant text-sm font-semibold hover:bg-surface-container-high transition-colors"
          >
            Skip AI Design
          </button>
        </div>
      )}
    </div>
  );
}
