"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import type { LLMProvider } from "@/lib/types/database";

export function LLMConfig() {
  const [activeProvider, setActiveProvider] = useState<LLMProvider>("gemini");
  const [geminiKey, setGeminiKey] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      const supabase = createClient();
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["llm_provider", "gemini_api_key", "openrouter_api_key"]);

      if (data) {
        for (const setting of data) {
          if (setting.key === "llm_provider") setActiveProvider(setting.value as LLMProvider);
          if (setting.key === "gemini_api_key") setGeminiKey(setting.value as string);
          if (setting.key === "openrouter_api_key") setOpenrouterKey(setting.value as string);
        }
      }
    }
    loadSettings();
  }, []);

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();

    const settings = [
      { key: "llm_provider", value: activeProvider },
      { key: "gemini_api_key", value: geminiKey },
      { key: "openrouter_api_key", value: openrouterKey },
    ];

    for (const setting of settings) {
      await supabase
        .from("app_settings")
        .upsert({ key: setting.key, value: setting.value }, { onConflict: "key" });
    }

    setSaving(false);
  }

  return (
    <Card variant="low">
      <h2 className="font-headline text-xl font-semibold text-on-surface mb-4">LLM Provider Configuration</h2>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveProvider("gemini")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeProvider === "gemini"
              ? "bg-primary text-[#263046]"
              : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
          }`}
        >
          Gemini
        </button>
        <button
          onClick={() => setActiveProvider("openrouter")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeProvider === "openrouter"
              ? "bg-primary text-[#263046]"
              : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
          }`}
        >
          OpenRouter
        </button>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-xs text-on-surface-variant mb-1">Gemini API Key</label>
          <Input
            type="password"
            placeholder="Enter Gemini API key"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-on-surface-variant mb-1">OpenRouter API Key</label>
          <Input
            type="password"
            placeholder="Enter OpenRouter API key"
            value={openrouterKey}
            onChange={(e) => setOpenrouterKey(e.target.value)}
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Configuration"}
      </Button>
    </Card>
  );
}
