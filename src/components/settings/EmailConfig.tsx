"use client";

import { useState, useEffect } from "react";
import { Save, Send, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import type { EmailConfig as EmailConfigType } from "@/lib/types/enterprise";

type Provider = EmailConfigType["provider"];

const DEFAULT_CONFIG: EmailConfigType = {
  provider: "resend",
  api_key: "",
  from_address: "",
  from_name: "",
  smtp_config: {
    host: "",
    port: 587,
    secure: false,
    user: "",
    pass: "",
  },
};

export default function EmailConfig() {
  const [config, setConfig] = useState<EmailConfigType>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "email_config")
        .single();
      if (data?.value) {
        setConfig({ ...DEFAULT_CONFIG, ...data.value });
      }
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "email_config", value: config }, { onConflict: "key" });
      setSaveStatus(error ? "error" : "success");
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }

  async function handleTestEmail() {
    if (!testEmail) return;
    setSending(true);
    setTestStatus("idle");
    try {
      const res = await fetch("/api/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail }),
      });
      setTestStatus(res.ok ? "success" : "error");
    } catch {
      setTestStatus("error");
    } finally {
      setSending(false);
      setTimeout(() => setTestStatus("idle"), 3000);
    }
  }

  function setProvider(provider: Provider) {
    setConfig((c) => ({ ...c, provider }));
  }

  const providers: { id: Provider; label: string }[] = [
    { id: "resend", label: "Resend" },
    { id: "sendgrid", label: "SendGrid" },
    { id: "smtp", label: "SMTP" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-base font-semibold text-on-surface mb-1">Email Provider</h2>
        <p className="text-xs text-on-surface-variant mb-5">
          Configure outbound email for alert notifications and watchlist digests.
        </p>

        {/* Provider selector */}
        <div className="flex gap-2 mb-6">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => setProvider(p.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                config.provider === p.id
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* API key for Resend / SendGrid */}
        {config.provider !== "smtp" && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
              API Key
            </label>
            <Input
              type="password"
              placeholder={`Enter your ${config.provider === "resend" ? "Resend" : "SendGrid"} API key`}
              value={config.api_key}
              onChange={(e) => setConfig((c) => ({ ...c, api_key: e.target.value }))}
            />
          </div>
        )}

        {/* SMTP config */}
        {config.provider === "smtp" && (
          <div className="space-y-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
                  Host
                </label>
                <Input
                  placeholder="smtp.example.com"
                  value={config.smtp_config?.host ?? ""}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      smtp_config: { ...c.smtp_config!, host: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
                  Port
                </label>
                <Input
                  type="number"
                  placeholder="587"
                  value={config.smtp_config?.port ?? 587}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      smtp_config: {
                        ...c.smtp_config!,
                        port: parseInt(e.target.value) || 587,
                      },
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
                  Username
                </label>
                <Input
                  placeholder="user@example.com"
                  value={config.smtp_config?.user ?? ""}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      smtp_config: { ...c.smtp_config!, user: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={config.smtp_config?.pass ?? ""}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      smtp_config: { ...c.smtp_config!, pass: e.target.value },
                    }))
                  }
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={config.smtp_config?.secure ?? false}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    smtp_config: { ...c.smtp_config!, secure: e.target.checked },
                  }))
                }
                className="w-4 h-4 accent-primary"
              />
              Use TLS / SSL
            </label>
          </div>
        )}

        {/* From fields */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
              From Name
            </label>
            <Input
              placeholder="Sentinel Lens"
              value={config.from_name}
              onChange={(e) => setConfig((c) => ({ ...c, from_name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
              From Address
            </label>
            <Input
              type="email"
              placeholder="alerts@yourdomain.com"
              value={config.from_address}
              onChange={(e) => setConfig((c) => ({ ...c, from_address: e.target.value }))}
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving…" : "Save Configuration"}
        </button>
        {saveStatus === "success" && (
          <p className="mt-2 text-xs text-green-400">Configuration saved successfully.</p>
        )}
        {saveStatus === "error" && (
          <p className="mt-2 text-xs text-red-400">Failed to save configuration.</p>
        )}
      </Card>

      {/* Test email */}
      <Card>
        <h2 className="text-base font-semibold text-on-surface mb-1">Send Test Email</h2>
        <p className="text-xs text-on-surface-variant mb-5">
          Verify your configuration by sending a test message to any address.
        </p>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
              Recipient
            </label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
          </div>
          <button
            onClick={handleTestEmail}
            disabled={sending || !testEmail}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-surface-container-high text-on-surface text-sm font-semibold hover:bg-surface-container-highest transition-colors disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {sending ? "Sending…" : "Send Test"}
          </button>
        </div>
        {testStatus === "success" && (
          <p className="mt-2 text-xs text-green-400">Test email sent successfully.</p>
        )}
        {testStatus === "error" && (
          <p className="mt-2 text-xs text-red-400">Failed to send test email.</p>
        )}
      </Card>
    </div>
  );
}
