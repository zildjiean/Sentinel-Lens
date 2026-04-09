"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Shield, Plus, Search, X, Trash2, Hourglass,
  Globe, Hash, Mail, Link as LinkIcon, Server,
  type LucideIcon,
} from "lucide-react";
import { formatDateThShort } from "@/lib/utils/date";

interface IOC {
  id: string;
  type: string;
  value: string;
  description: string | null;
  severity: string;
  tags: string[];
  first_seen: string;
  last_seen: string;
  articles: { title: string } | null;
}

const TYPE_ICONS: Record<string, LucideIcon> = {
  ip: Server,
  domain: Globe,
  hash_md5: Hash,
  hash_sha256: Hash,
  url: LinkIcon,
  email: Mail,
};

const TYPE_LABELS: Record<string, string> = {
  ip: "IP Address",
  domain: "Domain",
  hash_md5: "MD5 Hash",
  hash_sha256: "SHA256 Hash",
  url: "URL",
  email: "Email",
};

export default function IOCsPage() {
  const [iocs, setIocs] = useState<IOC[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  // Add form
  const [newType, setNewType] = useState("ip");
  const [newValue, setNewValue] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newSeverity, setNewSeverity] = useState("medium");
  const [adding, setAdding] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (typeFilter) params.set("type", typeFilter);
    if (severityFilter) params.set("severity", severityFilter);

    try {
      const res = await fetch(`/api/iocs?${params}`);
      const data = await res.json();
      setIocs(data.iocs ?? []);
      setTotal(data.total ?? 0);
    } catch { /* ignore */ }
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [search, typeFilter, severityFilter]);

  async function handleAdd() {
    if (!newValue.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/iocs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newType,
          value: newValue.trim(),
          description: newDesc.trim() || undefined,
          severity: newSeverity,
        }),
      });
      if (res.ok) {
        setNewValue("");
        setNewDesc("");
        setShowAdd(false);
        load();
      }
    } catch { /* ignore */ }
    setAdding(false);
  }

  async function handleDelete(id: string) {
    await fetch("/api/iocs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setIocs((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold text-on-surface tracking-tight mb-2">
            IOC Management
          </h1>
          <p className="text-sm text-on-surface-variant">
            Indicators of Compromise — {total} active indicators
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-[#263046] text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add IOC
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <Card variant="low">
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="px-3 py-2 rounded-lg bg-surface-container text-on-surface text-sm border border-outline-variant/20 focus:border-primary focus:outline-none"
              >
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Indicator value..."
                className="col-span-2 px-3 py-2 rounded-lg bg-surface-container text-on-surface text-sm border border-outline-variant/20 focus:border-primary focus:outline-none"
              />
              <select
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value)}
                className="px-3 py-2 rounded-lg bg-surface-container text-on-surface text-sm border border-outline-variant/20 focus:border-primary focus:outline-none"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="info">Info</option>
              </select>
            </div>
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-3 py-2 rounded-lg bg-surface-container text-on-surface text-sm border border-outline-variant/20 focus:border-primary focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors">
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={adding || !newValue.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-primary text-[#263046] disabled:opacity-50 transition-colors"
              >
                {adding ? "Adding..." : "Add Indicator"}
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search IOCs..."
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-surface-container text-on-surface text-sm border border-outline-variant/20 focus:border-primary focus:outline-none transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-on-surface-variant" />
            </button>
          )}
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-surface-container text-on-surface text-sm border border-outline-variant/20 focus:border-primary focus:outline-none"
        >
          <option value="">All Types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-surface-container text-on-surface text-sm border border-outline-variant/20 focus:border-primary focus:outline-none"
        >
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* IOC List */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-on-surface-variant">
          <Hourglass className="w-5 h-5 animate-spin mr-2" />
          Loading...
        </div>
      ) : iocs.length === 0 ? (
        <Card variant="low">
          <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant">
            <Shield className="w-10 h-10 mb-3" />
            <p className="text-sm">No IOCs found. Add your first indicator above.</p>
          </div>
        </Card>
      ) : (
        <Card variant="low">
          <div className="divide-y divide-outline-variant/10">
            {iocs.map((ioc) => {
              const TypeIcon = TYPE_ICONS[ioc.type] || Shield;
              return (
                <div key={ioc.id} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
                  <TypeIcon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <code className="text-sm font-mono text-on-surface break-all">{ioc.value}</code>
                      <Badge severity={ioc.severity as "critical" | "high" | "medium" | "low" | "info"} />
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-on-surface-variant">
                      <span className="px-1.5 py-0.5 rounded bg-surface-container-high">{TYPE_LABELS[ioc.type]}</span>
                      {ioc.description && <span className="truncate">{ioc.description}</span>}
                    </div>
                    {ioc.articles?.title && (
                      <p className="text-[10px] text-on-surface-variant/60 mt-0.5">
                        Source: {ioc.articles.title}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-on-surface-variant/50">
                      {formatDateThShort(ioc.last_seen)}
                    </span>
                    <button
                      onClick={() => handleDelete(ioc.id)}
                      className="p-1 text-on-surface-variant hover:text-error transition-colors"
                      aria-label="Delete IOC"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
