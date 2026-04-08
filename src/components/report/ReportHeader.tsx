"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Download, Printer, Share2 } from "lucide-react";
import type { ArticleSeverity } from "@/lib/types/database";


interface ReportHeaderProps {
  severity: ArticleSeverity;
  classification: string;
}

export function ReportHeader({ severity, classification }: ReportHeaderProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-outline-variant/20 -mx-8 px-8 py-3 mb-8 flex items-center justify-between no-print">
      <div className="flex items-center gap-3">
        <Badge severity={severity} />
        <span className="text-xs uppercase tracking-widest text-tertiary font-semibold">
          {classification}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm">
          <Download className="w-5 h-5" />
          Download
        </Button>
        <Button variant="ghost" size="sm" onClick={handlePrint}>
          <Printer className="w-5 h-5" />
          Print
        </Button>
        <Button variant="ghost" size="sm">
          <Share2 className="w-5 h-5" />
          Share
        </Button>
      </div>
    </div>
  );
}
