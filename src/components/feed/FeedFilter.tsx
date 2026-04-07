"use client";

import { useState } from "react";

interface FeedFilterProps {
  onSeverityChange: (severity: string) => void;
  onDateChange: (days: number | null) => void;
}

const severities = [
  { value: "", label: "All" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "info", label: "Info" },
];

const dateRanges = [
  { value: null, label: "All Time" },
  { value: 1, label: "Today" },
  { value: 7, label: "7 Days" },
  { value: 30, label: "30 Days" },
];

export function FeedFilter({ onSeverityChange, onDateChange }: FeedFilterProps) {
  const [activeSeverity, setActiveSeverity] = useState("");
  const [activeDate, setActiveDate] = useState<number | null>(null);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
      {/* Severity */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-widest text-on-surface-variant mr-1">Severity:</span>
        {severities.map((s) => (
          <button
            key={s.value}
            onClick={() => {
              setActiveSeverity(s.value);
              onSeverityChange(s.value);
            }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeSeverity === s.value
                ? "bg-primary text-[#263046]"
                : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {/* Date */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-widest text-on-surface-variant mr-1">Date:</span>
        {dateRanges.map((d) => (
          <button
            key={String(d.value)}
            onClick={() => {
              setActiveDate(d.value);
              onDateChange(d.value);
            }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeDate === d.value
                ? "bg-secondary text-[#263046]"
                : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}
