interface ThreatMeterProps {
  value: number;
  variant?: "primary" | "secondary" | "tertiary" | "error";
  height?: number;
}

const gradients: Record<string, string> = {
  primary: "from-primary to-primary-container",
  secondary: "from-secondary to-secondary-container",
  tertiary: "from-tertiary to-tertiary-container",
  error: "from-error to-error-container",
};

export function ThreatMeter({ value, variant = "tertiary", height = 3 }: ThreatMeterProps) {
  return (
    <div className="w-full rounded-full bg-surface-container-highest overflow-hidden" style={{ height }}>
      <div
        className={`h-full rounded-full bg-gradient-to-r ${gradients[variant]} transition-all duration-500`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
