"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { KeywordInput } from "./KeywordInput";
import type { WatchlistWithKeywords } from "@/lib/types/enterprise";

interface KeywordEntry {
  keyword: string;
  match_mode: string;
}

interface WatchlistFormProps {
  initialData?: WatchlistWithKeywords;
  onSave?: () => void;
}

export function WatchlistForm({ initialData, onSave }: WatchlistFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;

  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [keywords, setKeywords] = useState<KeywordEntry[]>(
    initialData?.watchlist_keywords.map((kw) => ({
      keyword: kw.keyword,
      match_mode: kw.match_mode,
    })) ?? []
  );
  const [notifyMode, setNotifyMode] = useState<"realtime" | "batch">(
    initialData?.notify_mode ?? "realtime"
  );
  const [batchInterval, setBatchInterval] = useState<number>(
    initialData?.batch_interval_minutes ?? 30
  );
  const [summaryLevel, setSummaryLevel] = useState<"short" | "detailed">(
    initialData?.summary_level ?? "short"
  );
  const [emailInput, setEmailInput] = useState("");
  const [emailRecipients, setEmailRecipients] = useState<string[]>(
    initialData?.email_recipients ?? []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleEmailKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && emailInput.trim()) {
      e.preventDefault();
      const email = emailInput.trim();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !emailRecipients.includes(email)) {
        setEmailRecipients((prev) => [...prev, email]);
        setEmailInput("");
      }
    }
  }

  function removeEmail(email: string) {
    setEmailRecipients((prev) => prev.filter((e) => e !== email));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Name is required.");
    if (keywords.length === 0) return setError("At least one keyword is required.");
    if (emailRecipients.length === 0) return setError("At least one email recipient is required.");

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        notify_mode: notifyMode,
        batch_interval_minutes: notifyMode === "batch" ? batchInterval : 30,
        summary_level: summaryLevel,
        email_recipients: emailRecipients,
        keywords,
      };

      const url = isEdit ? `/api/watchlists/${initialData.id}` : "/api/watchlists";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message ?? data.error ?? "Failed to save watchlist");
      }

      onSave?.();
      router.push("/watchlist");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && (
        <div className="bg-error/10 border border-error/30 text-error text-sm rounded-xl px-4 py-3 font-body">
          {error}
        </div>
      )}

      {/* Name */}
      <Card variant="low">
        <div className="space-y-4">
          <h2 className="font-headline text-base font-semibold text-on-surface">Basic Info</h2>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-on-surface-variant font-body uppercase tracking-wider">
              Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Thailand Ransomware Tracker"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-on-surface-variant font-body uppercase tracking-wider">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
              className="w-full bg-surface-container border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none text-on-surface placeholder:text-on-surface-variant/50 px-4 py-2.5 text-sm font-body transition-colors duration-200 resize-none"
            />
          </div>
        </div>
      </Card>

      {/* Keywords */}
      <Card variant="low">
        <div className="space-y-3">
          <h2 className="font-headline text-base font-semibold text-on-surface">Keywords *</h2>
          <p className="text-xs text-on-surface-variant font-body">
            Type a keyword and press Enter to add. Choose match mode for each.
          </p>
          <KeywordInput value={keywords} onChange={setKeywords} />
        </div>
      </Card>

      {/* Notification Settings */}
      <Card variant="low">
        <div className="space-y-4">
          <h2 className="font-headline text-base font-semibold text-on-surface">Notification Settings</h2>

          <div className="space-y-2">
            <label className="text-xs font-medium text-on-surface-variant font-body uppercase tracking-wider">
              Notify Mode
            </label>
            <div className="flex gap-2">
              {(["realtime", "batch"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setNotifyMode(mode)}
                  className={`px-4 py-2 rounded-lg text-sm font-body font-medium transition-colors ${
                    notifyMode === mode
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                  }`}
                >
                  {mode === "realtime" ? "Real-time" : "Batch"}
                </button>
              ))}
            </div>
          </div>

          {notifyMode === "batch" && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-on-surface-variant font-body uppercase tracking-wider">
                Batch Interval
              </label>
              <select
                value={batchInterval}
                onChange={(e) => setBatchInterval(Number(e.target.value))}
                className="bg-surface-container border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none text-on-surface text-sm font-body px-4 py-2.5 transition-colors duration-200"
              >
                <option value={15}>Every 15 minutes</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every 60 minutes</option>
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium text-on-surface-variant font-body uppercase tracking-wider">
              Summary Level
            </label>
            <div className="flex gap-2">
              {(["short", "detailed"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSummaryLevel(level)}
                  className={`px-4 py-2 rounded-lg text-sm font-body font-medium transition-colors ${
                    summaryLevel === level
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                  }`}
                >
                  {level === "short" ? "Short" : "Detailed"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Email Recipients */}
      <Card variant="low">
        <div className="space-y-3">
          <h2 className="font-headline text-base font-semibold text-on-surface">Email Recipients *</h2>
          <p className="text-xs text-on-surface-variant font-body">
            Type an email address and press Enter to add.
          </p>
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={handleEmailKeyDown}
            placeholder="email@example.com"
            className="w-full bg-surface-container border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none text-on-surface placeholder:text-on-surface-variant/50 px-4 py-2.5 text-sm font-body transition-colors duration-200"
          />
          {emailRecipients.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {emailRecipients.map((email) => (
                <div
                  key={email}
                  className="flex items-center gap-1.5 bg-secondary/15 border border-secondary/30 rounded-lg px-2 py-1"
                >
                  <span className="text-xs font-medium text-secondary font-body">{email}</span>
                  <button
                    type="button"
                    onClick={() => removeEmail(email)}
                    className="text-secondary/60 hover:text-secondary transition-colors"
                  >
                    <span className="text-xs">×</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-xl text-sm font-body font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? "Saving..." : isEdit ? "Update Watchlist" : "Create Watchlist"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/watchlist")}
          className="px-6 py-2.5 rounded-xl text-sm font-body font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
