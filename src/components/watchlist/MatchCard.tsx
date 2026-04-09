import Link from "next/link";
import { Mail, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { WatchlistMatchWithArticle } from "@/lib/types/enterprise";
import type { ArticleSeverity } from "@/lib/types/database";

interface MatchCardProps {
  match: WatchlistMatchWithArticle;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const matchedInLabels: Record<string, string> = {
  title: "Title",
  content: "Content",
  tags: "Tags",
  excerpt: "Excerpt",
};

export function MatchCard({ match }: MatchCardProps) {
  const isSeverityValid = (s: string): s is ArticleSeverity =>
    ["critical", "high", "medium", "low", "info"].includes(s);

  return (
    <div className="relative pl-6">
      <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/20 space-y-2.5">
        {/* Title + severity */}
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/article/${match.article.id}`}
            className="font-headline text-sm font-semibold text-on-surface hover:text-primary transition-colors line-clamp-2 flex-1"
          >
            {match.article.title}
          </Link>
          {isSeverityValid(match.article.severity) && (
            <Badge severity={match.article.severity} />
          )}
        </div>

        {/* Summary */}
        {match.summary_th && (
          <p className="text-xs text-on-surface-variant font-body line-clamp-3">
            {match.summary_th}
          </p>
        )}

        {/* Meta */}
        <div className="flex items-center flex-wrap gap-2 pt-1">
          {/* Keyword pill */}
          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-primary/15 text-primary text-[10px] font-semibold font-body">
            {match.matched_keyword}
          </span>

          {/* Matched location */}
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-[10px] font-body">
            in {matchedInLabels[match.matched_in] ?? match.matched_in}
          </span>

          {/* Email status */}
          {match.notified_at ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-[#4ade80] font-body">
              <Mail size={11} />
              Email sent
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] text-yellow-400 font-body">
              <Mail size={11} />
              Pending
            </span>
          )}

          {/* Time */}
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-on-surface-variant font-body">
            <Clock size={11} />
            {timeAgo(match.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
