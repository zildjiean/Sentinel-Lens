"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import type { LLMProvider } from "@/lib/types/database";

const GEMINI_MODELS = [
  { id: "gemini-2.5-flash-preview-05-20", label: "Gemini 2.5 Flash (Preview)" },
  { id: "gemini-2.5-pro-preview-05-06", label: "Gemini 2.5 Pro (Preview)" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash-Lite" },
  { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
];

const OPENROUTER_GEMINI_MODELS = [
  { id: "google/gemini-2.5-flash-preview", label: "Gemini 2.5 Flash (Preview)" },
  { id: "google/gemini-2.5-pro-preview", label: "Gemini 2.5 Pro (Preview)" },
  { id: "google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash (Free)" },
  { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash" },
  { id: "google/gemini-2.0-flash-lite-001", label: "Gemini 2.0 Flash-Lite" },
  { id: "google/gemini-pro-1.5", label: "Gemini 1.5 Pro" },
  { id: "google/gemini-flash-1.5", label: "Gemini 1.5 Flash" },
];

export function LLMConfig() {
  const [activeProvider, setActiveProvider] = useState<LLMProvider>("gemini");
  const [geminiModel, setGeminiModel] = useState("gemini-2.0-flash");
  const [openrouterModel, setOpenrouterModel] = useState("google/gemini-2.0-flash-exp:free");
  const [geminiKey, setGeminiKey] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [translationPrompt, setTranslationPrompt] = useState("");
  const [promptSaving, setPromptSaving] = useState(false);
  const [promptLoaded, setPromptLoaded] = useState(false);

  const activeModels = activeProvider === "gemini" ? GEMINI_MODELS : OPENROUTER_GEMINI_MODELS;
  const activeModel = activeProvider === "gemini" ? geminiModel : openrouterModel;
  const setActiveModel = activeProvider === "gemini" ? setGeminiModel : setOpenrouterModel;

  useEffect(() => {
    async function loadSettings() {
      const supabase = createClient();
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["llm_provider", "gemini_api_key", "openrouter_api_key", "gemini_model", "openrouter_model", "translation_prompt"]);

      if (data) {
        for (const setting of data) {
          if (setting.key === "llm_provider") setActiveProvider(setting.value as LLMProvider);
          if (setting.key === "gemini_api_key") setGeminiKey(setting.value as string);
          if (setting.key === "openrouter_api_key") setOpenrouterKey(setting.value as string);
          if (setting.key === "gemini_model") setGeminiModel(setting.value as string);
          if (setting.key === "openrouter_model") setOpenrouterModel(setting.value as string);
          if (setting.key === "translation_prompt") {
            setTranslationPrompt((setting.value as string) || "");
          }
        }
      }
      setPromptLoaded(true);
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
      { key: "gemini_model", value: geminiModel },
      { key: "openrouter_model", value: openrouterModel },
    ];

    for (const setting of settings) {
      await supabase
        .from("app_settings")
        .upsert({ key: setting.key, value: setting.value }, { onConflict: "key" });
    }

    setSaving(false);
  }

  async function handleSavePrompt() {
    setPromptSaving(true);
    const supabase = createClient();
    await supabase
      .from("app_settings")
      .upsert({ key: "translation_prompt", value: translationPrompt }, { onConflict: "key" });
    setPromptSaving(false);
  }

  async function handleResetPrompt() {
    setPromptSaving(true);
    const supabase = createClient();
    await supabase
      .from("app_settings")
      .delete()
      .eq("key", "translation_prompt");
    setTranslationPrompt("");
    setPromptSaving(false);
  }

  return (
    <>
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
            <label className="block text-xs text-on-surface-variant mb-1">Translation Model</label>
            <select
              value={activeModel}
              onChange={(e) => setActiveModel(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {activeModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
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

      <Card variant="low" className="mt-6">
        <h2 className="font-headline text-xl font-semibold text-on-surface mb-4">Translation Prompt</h2>
        <p className="text-xs text-on-surface-variant mb-3">
          กำหนด prompt สำหรับการแปลและวิเคราะห์ข่าว (ว่างเปล่า = ใช้ prompt เริ่มต้น)
        </p>
        <textarea
          value={translationPrompt}
          onChange={(e) => setTranslationPrompt(e.target.value)}
          placeholder={promptLoaded && !translationPrompt ? "ใช้ prompt เริ่มต้น (คลิกเพื่อแก้ไข)" : ""}
          rows={10}
          className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-on-surface-variant">
            {translationPrompt.length} characters
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetPrompt}
              disabled={promptSaving || !translationPrompt}
            >
              Reset to Default
            </Button>
            <Button
              size="sm"
              onClick={handleSavePrompt}
              disabled={promptSaving}
            >
              {promptSaving ? "Saving..." : "Save Prompt"}
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}
