"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ClipboardCheck, PenLine, RefreshCw, FileDown } from "lucide-react";

type Tab = "translate" | "compare";

export function Toolbar() {
  const [activeTab, setActiveTab] = useState<Tab>("translate");
  const [showExportMenu, setShowExportMenu] = useState(false);

  return (
    <div className="flex items-center justify-between mb-6">
      {/* Tab toggle */}
      <div className="flex items-center bg-surface-container-high rounded-lg p-1">
        <button
          onClick={() => setActiveTab("translate")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 ${
            activeTab === "translate"
              ? "bg-primary text-[#263046]"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Translate
        </button>
        <button
          onClick={() => setActiveTab("compare")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 ${
            activeTab === "compare"
              ? "bg-primary text-[#263046]"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Compare
        </button>
      </div>

      {/* Tool buttons */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm">
          <ClipboardCheck className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="sm">
          <PenLine className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="sm">
          <RefreshCw className="w-5 h-5" />
        </Button>

        {/* Export with dropdown */}
        <div className="relative">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowExportMenu(!showExportMenu)}
          >
            <FileDown className="w-5 h-5" />
            Export
          </Button>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 w-40 glass-panel rounded-lg border border-outline-variant/20 py-1 z-20">
              <button className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container-high transition-colors">
                Export as PDF
              </button>
              <button className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container-high transition-colors">
                Export as DOCX
              </button>
              <button className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container-high transition-colors">
                Copy to Clipboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
