"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatDateThShort } from "@/lib/utils/date";
import type { ArticleSeverity } from "@/lib/types/database";
import type { EnterpriseReportStatus } from "@/lib/types/enterprise";

const statusColors: Record<EnterpriseReportStatus, string> = {
  draft: "bg-surface-container-high text-on-surface-variant",
  generating: "bg-primary/20 text-primary",
  generated: "bg-secondary/20 text-secondary",
  reviewed: "bg-secondary/20 text-secondary",
  published: "bg-green-500/20 text-green-600",
};

interface EnterpriseReportCardProps {
  id: string;
  title: string;
  report_type: string;
  status: EnterpriseReportStatus;
  severity: string | null;
  classification: string;
  created_at: string;
}

export function EnterpriseReportCard({
  id,
  title,
  report_type,
  status,
  severity,
  classification,
  created_at,
}: EnterpriseReportCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/enterprise-report/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Delete failed (${res.status})`);
      }
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "ลบรายงานไม่สำเร็จ");
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  }

  return (
    <div className="group relative rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/20 hover:border-outline-variant transition-all duration-200">
      {/* Delete button — top right */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowConfirm(true);
        }}
        className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-on-surface-variant/40 hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
        title="ลบรายงาน"
      >
        <Trash2 size={14} />
      </button>

      {/* Card link */}
      <Link
        href={`/enterprise-report/${id}`}
        className="block p-5 space-y-3"
      >
        {/* Type + Status row */}
        <div className="flex items-center justify-between gap-2 flex-wrap pr-6">
          <span className="text-[10px] px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-semibold uppercase tracking-wide">
            {report_type}
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wide ${
              statusColors[status]
            }`}
          >
            {status}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-sm font-semibold text-on-surface font-headline group-hover:text-primary transition-colors line-clamp-2">
          {title}
        </h2>

        {/* Severity + Classification */}
        <div className="flex items-center gap-2 flex-wrap">
          {severity && (
            <Badge severity={severity as ArticleSeverity} />
          )}
          <span className="text-[10px] px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-semibold uppercase tracking-wider">
            {classification}
          </span>
        </div>

        {/* Date */}
        <p className="text-[11px] text-on-surface-variant">
          {formatDateThShort(created_at)}
        </p>
      </Link>

      {/* Confirm delete modal overlay */}
      {showConfirm && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-surface/90 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center space-y-3 p-4">
            <p className="text-sm font-semibold text-on-surface">ลบรายงานนี้?</p>
            <p className="text-xs text-on-surface-variant line-clamp-2">{title}</p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
                className="px-4 py-1.5 text-xs rounded-lg bg-surface-container-high text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Trash2 size={12} />
                )}
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
