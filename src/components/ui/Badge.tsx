import type { ArticleSeverity, ArticleStatus } from "@/lib/types/database";

interface BadgeProps {
  severity?: ArticleSeverity;
  status?: ArticleStatus;
  label?: string;
  className?: string;
}

const severityClasses: Record<ArticleSeverity, string> = {
  critical: "bg-error/20 text-error",
  high: "bg-tertiary/20 text-tertiary",
  medium: "bg-primary/20 text-primary",
  low: "bg-secondary/20 text-secondary",
  info: "bg-surface-container-high text-on-surface-variant",
};

const statusClasses: Record<ArticleStatus, string> = {
  new: "bg-primary/20 text-primary",
  translated: "bg-secondary/20 text-secondary",
  reviewed: "bg-secondary/20 text-secondary",
  archived: "bg-surface-container-high text-on-surface-variant",
};

export function Badge({ severity, status, label, className = "" }: BadgeProps) {
  const classes = severity ? severityClasses[severity] : status ? statusClasses[status] : "bg-surface-container-high text-on-surface-variant";
  const text = label || severity || status || "";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-widest ${classes} ${className}`}>
      {text}
    </span>
  );
}
