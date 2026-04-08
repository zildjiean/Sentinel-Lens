"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";

interface UsageData {
  totalTokens: number;
  translationTokens: number;
  reportTokens: number;
  budget: number;
}

export function TokenBudget() {
  const [usage, setUsage] = useState<UsageData>({
    totalTokens: 0,
    translationTokens: 0,
    reportTokens: 0,
    budget: 1000000,
  });
  const [editBudget, setEditBudget] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Get translation tokens
      const { data: translations } = await supabase
        .from("translations")
        .select("token_usage");
      const translationTokens = (translations ?? []).reduce(
        (sum: number, t: { token_usage: number }) => sum + (t.token_usage || 0),
        0
      );

      // Get budget setting
      const { data: budgetSetting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "token_budget")
        .single();

      const budget = budgetSetting?.value
        ? parseInt(String(budgetSetting.value).replace(/"/g, ""))
        : 1000000;

      setUsage({
        totalTokens: translationTokens,
        translationTokens,
        reportTokens: 0,
        budget,
      });
      setEditBudget(String(budget));
    }
    load();
  }, []);

  async function saveBudget() {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("app_settings")
      .upsert({ key: "token_budget", value: editBudget }, { onConflict: "key" });
    setUsage((prev) => ({ ...prev, budget: parseInt(editBudget) || 1000000 }));
    setSaving(false);
  }

  const usagePercent = Math.min((usage.totalTokens / usage.budget) * 100, 100);
  const isWarning = usagePercent > 75;
  const isDanger = usagePercent > 90;

  return (
    <Card variant="low">
      <h2 className="font-headline text-xl font-semibold text-on-surface mb-4">
        Token Budget & Usage
      </h2>

      {/* Usage bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-on-surface-variant">
            {usage.totalTokens.toLocaleString()} / {usage.budget.toLocaleString()} tokens used
          </span>
          <span className={`text-xs font-medium ${isDanger ? "text-error" : isWarning ? "text-tertiary" : "text-secondary"}`}>
            {usagePercent.toFixed(1)}%
          </span>
        </div>
        <div className="h-3 bg-surface-container-high rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isDanger ? "bg-error" : isWarning ? "bg-tertiary" : "bg-secondary"
            }`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-3 rounded-lg bg-surface-container-high/30">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-sm text-tertiary">translate</span>
            <span className="text-xs text-on-surface-variant">Translation</span>
          </div>
          <p className="font-headline text-lg font-bold text-on-surface">
            {usage.translationTokens.toLocaleString()}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-surface-container-high/30">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-sm text-primary">description</span>
            <span className="text-xs text-on-surface-variant">Reports</span>
          </div>
          <p className="font-headline text-lg font-bold text-on-surface">
            {usage.reportTokens.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Budget config */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-on-surface-variant whitespace-nowrap">Monthly Budget:</span>
        <input
          type="number"
          value={editBudget}
          onChange={(e) => setEditBudget(e.target.value)}
          className="flex-1 px-3 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface text-sm border border-outline-variant/20 focus:border-primary focus:outline-none"
          placeholder="1000000"
        />
        <button
          onClick={saveBudget}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-[#263046] disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </Card>
  );
}
