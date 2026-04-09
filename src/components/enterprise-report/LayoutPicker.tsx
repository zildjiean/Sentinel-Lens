"use client";

import { useState, useEffect } from "react";
import type { EnterpriseReportLayout } from "@/lib/types/enterprise";

interface LayoutPickerProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function LayoutPicker({ selectedId, onSelect }: LayoutPickerProps) {
  const [layouts, setLayouts] = useState<EnterpriseReportLayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/enterprise-report/layouts")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load layouts");
        return res.json();
      })
      .then((data) => {
        setLayouts(data.layouts ?? []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-xl bg-surface-container-high/60" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-error py-4">{error}</p>;
  }

  if (layouts.length === 0) {
    return <p className="text-sm text-on-surface-variant py-4">No layouts available.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {layouts.map((layout) => {
        const isSelected = layout.id === selectedId;
        return (
          <button
            key={layout.id}
            onClick={() => onSelect(layout.id)}
            className={`rounded-xl border-2 p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isSelected
                ? "border-primary ring-2 ring-primary bg-primary/5"
                : "border-outline-variant bg-surface-container hover:bg-surface-container-high"
            }`}
          >
            {/* Color preview */}
            <div
              className="h-12 w-full rounded-lg mb-3 border-2"
              style={{
                backgroundColor: layout.layout_config.primary_color,
                borderColor: layout.layout_config.accent_color,
              }}
            />
            <p className="text-sm font-semibold text-on-surface font-headline truncate">
              {layout.name}
            </p>
            {layout.description && (
              <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">
                {layout.description}
              </p>
            )}
            <div className="flex gap-1 mt-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                {layout.layout_config.theme}
              </span>
              {layout.is_preset && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                  preset
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
