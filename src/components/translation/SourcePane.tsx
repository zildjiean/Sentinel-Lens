import { Badge } from "@/components/ui/Badge";

interface SourcePaneProps {
  title: string;
  content: string;
  confidence: number;
}

export function SourcePane({ title, content, confidence }: SourcePaneProps) {
  return (
    <div className="bg-surface-container-low h-[716px] flex flex-col rounded-l-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
        <div className="flex items-center gap-3">
          <Badge label="Source" />
          <span className="text-xs text-on-surface-variant">English</span>
        </div>
        <span className="text-xs font-semibold text-secondary">
          {confidence}% confidence
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <h2 className="font-headline text-2xl font-bold text-on-surface mb-4">
          {title}
        </h2>
        <div className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
    </div>
  );
}
