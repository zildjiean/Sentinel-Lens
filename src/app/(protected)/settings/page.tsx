import { LLMConfig } from "@/components/settings/LLMConfig";
import { RSSManager } from "@/components/settings/RSSManager";
import { UserManager } from "@/components/settings/UserManager";
import { ReportTemplates } from "@/components/settings/ReportTemplates";
import { TokenBudget } from "@/components/settings/TokenBudget";

export default function SettingsPage() {
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold text-on-surface tracking-tight mb-2">Security Settings</h1>
        <p className="text-sm text-on-surface-variant font-light">Configure LLM providers, RSS sources, report templates, and manage users.</p>
      </div>
      <LLMConfig />
      <TokenBudget />
      <RSSManager />
      <ReportTemplates />
      <UserManager />
    </div>
  );
}
