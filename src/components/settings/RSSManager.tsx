"use client";

import { useState, useEffect } from "react";
import { Clock, Hourglass, Rss, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import type { RSSSource } from "@/lib/types/database";

const scheduleOptions = [
  { value: "manual", label: "Manual Only" },
  { value: "1h", label: "Every 1 Hour" },
  { value: "6h", label: "Every 6 Hours" },
  { value: "12h", label: "Every 12 Hours" },
  { value: "daily", label: "Daily" },
  { value: "3d", label: "Every 3 Days" },
];

export function RSSManager() {
  const [sources, setSources] = useState<RSSSource[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [schedule, setSchedule] = useState("manual");
  const [fetching, setFetching] = useState(false);
  const [fetchResult, setFetchResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      // Load sources
      const { data: sourceData } = await supabase
        .from("rss_sources")
        .select("*")
        .order("created_at", { ascending: false });
      if (sourceData) setSources(sourceData);

      // Load schedule setting
      const { data: settingData } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "rss_schedule")
        .single();
      if (settingData?.value) {
        setSchedule(String(settingData.value).replace(/"/g, ""));
      }
    }
    loadData();
  }, []);

  async function handleSaveSchedule(newSchedule: string) {
    setSchedule(newSchedule);
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("app_settings")
      .upsert({ key: "rss_schedule", value: newSchedule }, { onConflict: "key" });
    setSaving(false);
  }

  async function handleFetchNow() {
    setFetching(true);
    setFetchResult(null);
    try {
      const response = await fetch("/api/rss-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (response.ok) {
        setFetchResult(`✓ Fetched ${data.new_articles} new articles from ${data.sources_processed} sources. ${data.skipped_duplicates} duplicates skipped.`);
      } else {
        setFetchResult(`✗ Error: ${data.error}`);
      }
    } catch {
      setFetchResult("✗ Network error");
    } finally {
      setFetching(false);
    }
  }

  async function handleAdd() {
    if (!name.trim() || !url.trim()) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("rss_sources")
      .insert({ name: name.trim(), url: url.trim(), is_active: true })
      .select()
      .single();

    if (data) {
      setSources((prev) => [data, ...prev]);
      setName("");
      setUrl("");
    }
  }

  async function handleToggle(id: string, currentActive: boolean) {
    const supabase = createClient();
    await supabase.from("rss_sources").update({ is_active: !currentActive }).eq("id", id);
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_active: !currentActive } : s))
    );
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("rss_sources").delete().eq("id", id);
    setSources((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <Card variant="low">
      <h2 className="font-headline text-xl font-semibold text-on-surface mb-4">RSS Sources</h2>

      {/* Schedule Section */}
      <div className="mb-6 p-4 rounded-lg bg-surface-container-high/30">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Fetch Schedule
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Configure how often RSS feeds are automatically fetched
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleFetchNow}
            disabled={fetching}
          >
            {fetching ? <Hourglass className="w-4 h-4" /> : <Rss className="w-4 h-4" />}
            {fetching ? "Fetching..." : "Fetch Now"}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mb-2">
          {scheduleOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSaveSchedule(opt.value)}
              disabled={saving}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                schedule === opt.value
                  ? "bg-primary text-[#263046]"
                  : "bg-surface-container-lowest text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {fetchResult && (
          <p className={`text-xs mt-2 ${fetchResult.startsWith("✓") ? "text-secondary" : "text-error"}`}>
            {fetchResult}
          </p>
        )}
      </div>

      {/* Add Source */}
      <div className="flex gap-2 mb-6">
        <Input
          placeholder="Source name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1"
        />
        <Input
          placeholder="Feed URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleAdd} size="md">
          Add
        </Button>
      </div>

      {/* Source List */}
      <div className="space-y-3">
        {sources.map((source) => (
          <div key={source.id} className="flex items-center gap-3 py-2 border-b border-outline-variant/10">
            <div
              onClick={() => handleToggle(source.id, source.is_active)}
              className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors ${
                source.is_active ? "bg-primary" : "bg-surface-container-high"
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  source.is_active ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-on-surface truncate">{source.name}</p>
              <p className="text-xs text-on-surface-variant truncate">{source.url}</p>
              {source.last_fetched_at && (
                <p className="text-[10px] text-on-surface-variant/60 mt-0.5">
                  Last fetched: {new Date(source.last_fetched_at).toLocaleString()}
                </p>
              )}
            </div>

            <button
              onClick={() => handleDelete(source.id)}
              className="text-on-surface-variant hover:text-error transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}

        {sources.length === 0 && (
          <p className="text-sm text-on-surface-variant text-center py-4">No RSS sources configured.</p>
        )}
      </div>
    </Card>
  );
}
