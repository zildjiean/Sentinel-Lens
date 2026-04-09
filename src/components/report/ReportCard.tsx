import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { FileText, Download, Share2, Trash2 } from "lucide-react";
import type { Report } from "@/lib/types/database";
import { formatDateThShort } from "@/lib/utils/date";

interface ReportCardProps {
  report: Report;
  onDelete?: (id: string) => void;
}

const statusMap: Record<string, "secure" | "warning" | "critical" | "neutral"> = {
  published: "secure",
  reviewed: "secure",
  generated: "warning",
  draft: "neutral",
};

export function ReportCard({ report, onDelete }: ReportCardProps) {
  return (
    <Card variant="low" className="flex flex-col md:flex-row gap-4">
      {/* Left: image placeholder */}
      <div className="md:w-48 h-32 md:h-auto rounded-lg bg-gradient-to-br from-surface-container-high to-surface-container-lowest relative overflow-hidden flex-shrink-0 flex items-center justify-center">
        <FileText className="w-10 h-10 text-on-surface-variant/30" />
        <div className="absolute bottom-2 left-2">
          <StatusIndicator
            status={statusMap[report.status] ?? "neutral"}
            label={report.status}
          />
        </div>
      </div>

      {/* Middle: info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-headline text-lg font-bold text-on-surface mb-1 truncate">
          {report.title}
        </h3>
        <p className="text-xs text-on-surface-variant mb-2">
          Classification:{" "}
          <span className="text-tertiary font-semibold uppercase">
            {report.classification}
          </span>
        </p>
        <div className="flex items-center gap-2 mb-2">
          <Badge severity={report.severity} />
          <Badge label={report.report_type} />
        </div>
        <p className="text-xs text-on-surface-variant">
          Created: {formatDateThShort(report.created_at)}
        </p>
      </div>

      {/* Right: actions */}
      <div className="flex md:flex-col gap-2 flex-shrink-0">
        <Button variant="ghost" size="sm">
          <Download className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="sm">
          <Share2 className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete?.(report.id)}
        >
          <Trash2 className="w-5 h-5 text-error" />
        </Button>
      </div>
    </Card>
  );
}
