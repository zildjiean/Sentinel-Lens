"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { type LucideIcon, PlusCircle, Trash2, Pencil, Languages, FileText, Rss, LogIn, Download, Hourglass, History, Info } from "lucide-react";
import { formatDateTimeTh } from "@/lib/utils/date";

interface AuditEntry {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  profiles: { email: string; display_name: string | null } | null;
}

const ACTION_ICONS: Record<string, LucideIcon> = {
  create: PlusCircle,
  delete: Trash2,
  update: Pencil,
  translate: Languages,
  generate_report: FileText,
  fetch_rss: Rss,
  login: LogIn,
  export: Download,
};

const ACTION_COLORS: Record<string, string> = {
  create: "text-secondary",
  delete: "text-error",
  update: "text-primary",
  translate: "text-tertiary",
  generate_report: "text-primary",
  fetch_rss: "text-secondary",
  login: "text-on-surface-variant",
  export: "text-primary",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/audit-log?limit=${pageSize}&offset=${page * pageSize}`);
        const data = await res.json();
        setLogs(data.logs ?? []);
        setTotal(data.total ?? 0);
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [page]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold text-on-surface tracking-tight mb-2">
          Audit Log
        </h1>
        <p className="text-sm text-on-surface-variant">
          Track all user actions and system events ({total} entries)
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-on-surface-variant">
          <Hourglass className="w-5 h-5 animate-spin mr-2" />
          Loading...
        </div>
      ) : logs.length === 0 ? (
        <Card variant="low">
          <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant">
            <History className="w-10 h-10 mb-3" />
            <p className="text-sm">No audit logs recorded yet.</p>
          </div>
        </Card>
      ) : (
        <Card variant="low">
          <div className="divide-y divide-outline-variant/10">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
                <div className={`mt-0.5 ${ACTION_COLORS[log.action] || "text-on-surface-variant"}`}>
                  {(() => {
                    const Icon = ACTION_ICONS[log.action] || Info;
                    return <Icon className="w-5 h-5" />;
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-on-surface capitalize">
                      {log.action.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                      {log.entity_type}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    by {log.profiles?.display_name || log.profiles?.email || "System"}
                    {log.entity_id && <span className="text-on-surface-variant/50"> · ID: {log.entity_id.slice(0, 8)}...</span>}
                  </p>
                  {log.details && (
                    <p className="text-xs text-on-surface-variant/70 mt-1 truncate">
                      {JSON.stringify(log.details).slice(0, 100)}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-on-surface-variant/60 whitespace-nowrap">
                  {formatDateTimeTh(log.created_at)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-container-high text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors"
          >
            Previous
          </button>
          <span className="text-xs text-on-surface-variant">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-container-high text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
