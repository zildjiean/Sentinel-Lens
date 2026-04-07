import { Card } from "@/components/ui/Card";
import { ThreatMeter } from "@/components/ui/ThreatMeter";
import { StatusIndicator } from "@/components/ui/StatusIndicator";

export function NetworkHealth() {
  return (
    <Card variant="low" className="col-span-12 lg:col-span-4">
      <h2 className="font-headline text-sm font-semibold text-on-surface-variant uppercase tracking-widest mb-4">
        Network Status
      </h2>

      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-widest text-on-surface-variant">
            Threat Level
          </span>
          <span className="text-xs font-semibold text-tertiary">62%</span>
        </div>
        <ThreatMeter value={62} variant="tertiary" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-on-surface">Firewall</span>
          <StatusIndicator status="secure" label="Active" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-on-surface">EDR</span>
          <StatusIndicator status="secure" label="Active" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-on-surface">VPN Gateway</span>
          <StatusIndicator status="warning" label="Degraded" />
        </div>
      </div>
    </Card>
  );
}
