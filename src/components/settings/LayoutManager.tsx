"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import type { EnterpriseReportLayout } from "@/lib/types/enterprise";

export default function LayoutManager() {
  const [layouts, setLayouts] = useState<EnterpriseReportLayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadLayouts = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("enterprise_report_layouts")
      .select("*")
      .order("is_preset", { ascending: false })
      .order("name", { ascending: true });
    setLayouts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLayouts();
  }, [loadLayouts]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this layout? This action cannot be undone.")) return;
    setDeletingId(id);
    const supabase = createClient();
    await supabase.from("enterprise_report_layouts").delete().eq("id", id);
    setLayouts((prev) => prev.filter((l) => l.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold text-on-surface mb-1">Report Layouts</h2>
            <p className="text-xs text-on-surface-variant">
              Manage layout templates used when generating enterprise reports.
            </p>
          </div>
          <button
            onClick={() => {
              // Placeholder: open new layout modal
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New Layout
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-on-surface-variant">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span className="text-sm">Loading layouts…</span>
          </div>
        ) : layouts.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant text-sm">
            No layouts found. Create one to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {layouts.map((layout) => {
              const primaryColor =
                layout.layout_config?.primary_color ?? "#6750A4";
              const accentColor =
                layout.layout_config?.accent_color ?? "#7965AF";
              const sectionCount =
                layout.layout_config?.sections?.length ?? 0;

              return (
                <div
                  key={layout.id}
                  className="rounded-xl bg-surface-container-high p-4 flex flex-col gap-3"
                >
                  {/* Color preview */}
                  <div
                    className="h-12 rounded-lg border-2"
                    style={{
                      backgroundColor: primaryColor,
                      borderColor: accentColor,
                    }}
                  />

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-on-surface truncate">
                        {layout.name}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          layout.is_preset
                            ? "bg-primary/20 text-primary"
                            : "bg-surface-container-highest text-on-surface-variant"
                        }`}
                      >
                        {layout.is_preset ? "Preset" : "Custom"}
                      </span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant">
                      {sectionCount} section{sectionCount !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Actions (custom only) */}
                  {!layout.is_preset && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          // Placeholder: open edit modal
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface text-xs font-medium transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(layout.id)}
                        disabled={deletingId === layout.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container text-red-400 hover:text-red-300 text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {deletingId === layout.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
