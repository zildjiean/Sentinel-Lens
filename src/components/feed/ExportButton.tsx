"use client";

import { useState } from "react";
import { Download, Hourglass, Table, Braces, Shield } from "lucide-react";

export function ExportButton() {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleExport(format: string) {
    setExporting(true);
    setOpen(false);
    try {
      const res = await fetch(`/api/export?format=${format}`);
      if (!res.ok) {
        alert("Export failed");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = format === "csv" ? "csv" : "json";
      a.download = `sentinel-lens-${format}-${new Date().toISOString().split("T")[0]}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={exporting}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-50"
      >
        {exporting ? <Hourglass className="w-4 h-4" /> : <Download className="w-4 h-4" />}
        {exporting ? "Exporting..." : "Export"}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-surface-container border border-outline-variant/20 shadow-xl z-50 overflow-hidden">
          <button
            onClick={() => handleExport("csv")}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <Table className="w-4 h-4 text-secondary" />
            Export as CSV
          </button>
          <button
            onClick={() => handleExport("json")}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <Braces className="w-4 h-4 text-primary" />
            Export as JSON
          </button>
          <button
            onClick={() => handleExport("stix")}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <Shield className="w-4 h-4 text-tertiary" />
            Export as STIX 2.1
          </button>
        </div>
      )}
    </div>
  );
}
