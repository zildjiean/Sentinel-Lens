import { Badge } from "@/components/ui/Badge";
import { BadgeCheck } from "lucide-react";

interface TargetPaneProps {
  title: string;
  content: string;
  isVerified: boolean;
}

export function TargetPane({ title, content, isVerified }: TargetPaneProps) {
  return (
    <div className="bg-surface-container h-[716px] flex flex-col rounded-r-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
        <div className="flex items-center gap-3">
          <Badge label="Target" />
          <span className="text-xs text-on-surface-variant">Thai</span>
        </div>
        {isVerified && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-secondary">
            <BadgeCheck className="w-4 h-4" />
            Verified
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <h2 className="font-headline text-2xl font-bold text-on-surface mb-4 thai-text">
          {title}
        </h2>
        <div className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap thai-text">
          {content}
        </div>
      </div>
    </div>
  );
}
