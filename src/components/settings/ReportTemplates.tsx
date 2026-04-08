"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

interface Template {
  id: string;
  name: string;
  type: string;
  prompt: string;
  is_default: boolean;
}

const DEFAULT_TEMPLATES = [
  {
    name: "Executive Brief",
    type: "executive",
    prompt: "Generate a concise executive summary focusing on business impact, risk exposure, and strategic recommendations. Use non-technical language suitable for C-level executives.",
  },
  {
    name: "Incident Report",
    type: "incident",
    prompt: "Generate a detailed incident analysis report covering timeline, attack vectors, indicators of compromise (IOCs), affected systems, and immediate response actions. Include technical details for SOC analysts.",
  },
  {
    name: "Weekly Summary",
    type: "weekly",
    prompt: "Generate a weekly threat intelligence summary covering key trends, notable vulnerabilities, emerging threats, and recommended security actions for the coming week.",
  },
  {
    name: "Daily Brief",
    type: "daily",
    prompt: "Generate a short daily intelligence briefing highlighting the top 3-5 most important threats, any critical vulnerabilities, and immediate actions required.",
  },
  {
    name: "Monthly Analysis",
    type: "monthly",
    prompt: "Generate a comprehensive monthly threat landscape analysis including statistical trends, threat actor activity, vulnerability metrics, and strategic security posture recommendations.",
  },
];

export function ReportTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("executive");
  const [newPrompt, setNewPrompt] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("report_templates")
        .select("*")
        .order("created_at", { ascending: true });
      setTemplates(data ?? []);
    }
    load();
  }, []);

  async function initDefaults() {
    const supabase = createClient();
    for (const tmpl of DEFAULT_TEMPLATES) {
      await supabase.from("report_templates").insert({
        name: tmpl.name,
        type: tmpl.type,
        prompt: tmpl.prompt,
        is_default: true,
      });
    }
    const { data } = await supabase.from("report_templates").select("*").order("created_at", { ascending: true });
    setTemplates(data ?? []);
  }

  async function savePrompt(id: string) {
    const supabase = createClient();
    await supabase.from("report_templates").update({ prompt: editPrompt }).eq("id", id);
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, prompt: editPrompt } : t)));
    setEditing(null);
  }

  async function addTemplate() {
    if (!newName.trim() || !newPrompt.trim()) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("report_templates")
      .insert({ name: newName, type: newType, prompt: newPrompt, is_default: false })
      .select()
      .single();
    if (data) {
      setTemplates((prev) => [...prev, data]);
      setNewName("");
      setNewPrompt("");
      setShowAdd(false);
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    const supabase = createClient();
    await supabase.from("report_templates").delete().eq("id", id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <Card variant="low">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-headline text-xl font-semibold text-on-surface">Report Templates</h2>
        <div className="flex gap-2">
          {templates.length === 0 && (
            <Button variant="secondary" size="sm" onClick={initDefaults}>
              <span className="material-symbols-outlined text-sm">auto_fix_high</span>
              Initialize Defaults
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowAdd(!showAdd)}>
            <span className="material-symbols-outlined text-sm">add</span>
            Add Template
          </Button>
        </div>
      </div>

      {showAdd && (
        <div className="mb-4 p-4 rounded-lg bg-surface-container-high/30 space-y-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Template name"
            className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest text-on-surface text-sm border border-outline-variant/20 focus:border-primary focus:outline-none"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest text-on-surface text-sm border border-outline-variant/20 focus:border-primary focus:outline-none"
          >
            <option value="executive">Executive</option>
            <option value="incident">Incident</option>
            <option value="weekly">Weekly</option>
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom</option>
          </select>
          <textarea
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            placeholder="LLM system prompt for this report type..."
            className="w-full h-24 px-3 py-2 rounded-lg bg-surface-container-lowest text-on-surface text-sm border border-outline-variant/20 focus:border-primary focus:outline-none resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" onClick={addTemplate}>Save</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {templates.map((tmpl) => (
          <div key={tmpl.id} className="p-3 rounded-lg bg-surface-container-high/20 border border-outline-variant/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-primary">description</span>
                <span className="text-sm font-medium text-on-surface">{tmpl.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                  {tmpl.type}
                </span>
                {tmpl.is_default && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary">default</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditing(tmpl.id);
                    setEditPrompt(tmpl.prompt);
                  }}
                  className="p-1 text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                </button>
                {!tmpl.is_default && (
                  <button
                    onClick={() => deleteTemplate(tmpl.id)}
                    className="p-1 text-on-surface-variant hover:text-error transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                )}
              </div>
            </div>
            {editing === tmpl.id ? (
              <div className="space-y-2">
                <textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  className="w-full h-24 px-3 py-2 rounded-lg bg-surface-container-lowest text-on-surface text-sm border border-outline-variant/20 focus:border-primary focus:outline-none resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditing(null)} className="px-3 py-1 text-xs text-on-surface-variant hover:text-on-surface">Cancel</button>
                  <button onClick={() => savePrompt(tmpl.id)} className="px-3 py-1 text-xs font-medium bg-primary text-[#263046] rounded-lg">Save</button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant line-clamp-2">{tmpl.prompt}</p>
            )}
          </div>
        ))}
        {templates.length === 0 && (
          <p className="text-sm text-on-surface-variant text-center py-6">
            No templates configured. Click &ldquo;Initialize Defaults&rdquo; to get started.
          </p>
        )}
      </div>
    </Card>
  );
}
