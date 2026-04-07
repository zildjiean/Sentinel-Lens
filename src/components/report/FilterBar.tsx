"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

interface FilterBarProps {
  onSearchChange?: (value: string) => void;
  onSeverityChange?: (value: string) => void;
  onDateChange?: (value: string) => void;
}

const severityOptions = [
  { value: "", label: "All Threat Levels" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "info", label: "Info" },
];

const dateOptions = [
  { value: "", label: "All Dates" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "1y", label: "Last Year" },
];

export function FilterBar({
  onSearchChange,
  onSeverityChange,
  onDateChange,
}: FilterBarProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="md:col-span-2">
        <Input
          icon="search"
          placeholder="Search reports..."
          onChange={(e) => onSearchChange?.(e.target.value)}
        />
      </div>
      <Select
        icon="warning"
        options={severityOptions}
        onChange={(e) => onSeverityChange?.(e.target.value)}
      />
      <Select
        icon="calendar_today"
        options={dateOptions}
        onChange={(e) => onDateChange?.(e.target.value)}
      />
    </div>
  );
}
