import { Card } from "@/components/ui/Card";
import { ThreatMeter } from "@/components/ui/ThreatMeter";
import { StatusIndicator } from "@/components/ui/StatusIndicator";

interface AnalysisCardsProps {
  riskLevel: number;
  termAccuracy: number;
}

export function AnalysisCards({
  riskLevel = 42,
  termAccuracy = 96,
}: AnalysisCardsProps) {
  const circumference = 100;
  const dashOffset = circumference - (termAccuracy / 100) * circumference;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
      {/* Risk Level */}
      <Card variant="low">
        <h3 className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-3">
          Risk Level
        </h3>
        <p className="font-headline text-4xl font-extrabold text-on-surface mb-3">
          {riskLevel}%
        </p>
        <ThreatMeter
          value={riskLevel}
          variant={riskLevel > 70 ? "error" : riskLevel > 40 ? "tertiary" : "secondary"}
        />
      </Card>

      {/* Term Accuracy */}
      <Card variant="low">
        <h3 className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-3">
          Term Accuracy
        </h3>
        <div className="flex items-center justify-center py-2">
          <svg viewBox="0 0 36 36" className="w-20 h-20">
            {/* Background circle */}
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              className="text-surface-container-highest"
              strokeWidth="3"
            />
            {/* Progress circle */}
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              className="text-secondary"
              strokeWidth="3"
              strokeDasharray={`${circumference}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
            <text
              x="18"
              y="20.5"
              textAnchor="middle"
              className="fill-on-surface text-[8px] font-bold"
            >
              {termAccuracy}%
            </text>
          </svg>
        </div>
      </Card>

      {/* Analyst Verdict */}
      <Card variant="low">
        <h3 className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-3">
          Analyst Verdict
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <StatusIndicator status="secure" />
            <span className="text-sm text-on-surface">Context preserved</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusIndicator status="secure" />
            <span className="text-sm text-on-surface">
              Technical terms accurate
            </span>
          </div>
          <div className="flex items-center gap-2">
            <StatusIndicator status="warning" />
            <span className="text-sm text-on-surface">
              Tone needs review
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
