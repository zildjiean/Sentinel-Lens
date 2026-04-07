import { Card } from "@/components/ui/Card";

interface HeroBriefingProps {
  relevance: number;
  activeThreats: number;
  criticalAlerts: number;
}

export function HeroBriefing({
  relevance = 94,
  activeThreats = 12,
  criticalAlerts = 3,
}: HeroBriefingProps) {
  return (
    <Card variant="low" className="col-span-12 lg:col-span-8 relative overflow-hidden">
      {/* Decorative gradient orb */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <h2 className="font-headline text-sm font-semibold text-on-surface-variant uppercase tracking-widest mb-6">
        Daily Intelligence Briefing
      </h2>

      <div className="grid grid-cols-3 gap-8 relative z-10">
        <div>
          <p className="font-headline text-4xl font-extrabold text-on-surface">
            {relevance}%
          </p>
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">
            Feed Relevance
          </p>
        </div>
        <div>
          <p className="font-headline text-4xl font-extrabold text-on-surface">
            {activeThreats}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">
            Active Threats
          </p>
        </div>
        <div>
          <p className="font-headline text-4xl font-extrabold text-error">
            {criticalAlerts}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">
            Critical Alerts
          </p>
        </div>
      </div>
    </Card>
  );
}
