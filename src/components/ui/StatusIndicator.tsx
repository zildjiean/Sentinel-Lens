type StatusType = "secure" | "warning" | "critical" | "neutral";

interface StatusIndicatorProps {
  status: StatusType;
  size?: number;
  label?: string;
}

const statusClasses: Record<StatusType, string> = {
  secure: "bg-secondary glow-secondary",
  warning: "bg-tertiary glow-tertiary",
  critical: "bg-error glow-error",
  neutral: "bg-outline",
};

export function StatusIndicator({ status, size = 8, label }: StatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={`rounded-full ${statusClasses[status]}`} style={{ width: size, height: size }} />
      {label && <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-medium">{label}</span>}
    </div>
  );
}
