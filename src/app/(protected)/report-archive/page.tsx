"use client";

import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FilterBar } from "@/components/report/FilterBar";
import { ReportCard } from "@/components/report/ReportCard";
import type { Report } from "@/lib/types/database";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 5;

export default function ReportArchivePage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    async function fetchReports() {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      setReports((data as Report[]) ?? []);
    }
    fetchReports();
  }, []);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const matchSearch =
        !search || r.title.toLowerCase().includes(search.toLowerCase());
      const matchSeverity = !severity || r.severity === severity;
      return matchSearch && matchSeverity;
    });
  }, [reports, search, severity]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this report? This action cannot be undone.")) {
      return;
    }

    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    // Delete report_articles junction first
    await supabase.from("report_articles").delete().eq("report_id", id);

    // Delete the report
    const { error } = await supabase.from("reports").delete().eq("id", id);

    if (error) {
      alert("Failed to delete report: " + error.message);
      return;
    }

    setReports((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div>
      {/* Hero */}
      <div className="mb-8">
        <h1 className="font-headline text-2xl font-bold text-on-surface mb-1">
          Report Archive
        </h1>
        <p className="text-sm text-on-surface-variant mb-6">
          Browse, search, and manage generated intelligence reports
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card variant="low">
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
              Total Reports
            </p>
            <p className="font-headline text-3xl font-extrabold text-on-surface">
              {reports.length}
            </p>
          </Card>
          <Card variant="low">
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
              Critical Reports
            </p>
            <p className="font-headline text-3xl font-extrabold text-error">
              {reports.filter((r) => r.severity === "critical").length}
            </p>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        onSearchChange={setSearch}
        onSeverityChange={setSeverity}
      />

      {/* Report list */}
      <div className="space-y-4">
        {paged.length > 0 ? (
          paged.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onDelete={handleDelete}
            />
          ))
        ) : (
          <div className="text-center py-12 text-on-surface-variant">
            No reports found.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </Button>
          <span className="text-sm text-on-surface-variant px-4">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
