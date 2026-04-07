"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import type { RSSSource } from "@/lib/types/database";

export function RSSManager() {
  const [sources, setSources] = useState<RSSSource[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    async function loadSources() {
      const supabase = createClient();
      const { data } = await supabase
        .from("rss_sources")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) setSources(data);
    }
    loadSources();
  }, []);

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

      <div className="space-y-3">
        {sources.map((source) => (
          <div key={source.id} className="flex items-center gap-3 py-2 border-b border-outline-variant/10">
            {/* Custom toggle switch */}
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
            </div>

            <button
              onClick={() => handleDelete(source.id)}
              className="text-on-surface-variant hover:text-error transition-colors"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
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
