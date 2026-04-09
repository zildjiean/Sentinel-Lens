// src/lib/utils/date.ts
// Centralized Thai date formatting utilities

/**
 * Format date as Thai locale string
 * e.g. "9 เมษายน 2569"
 */
export function formatDateTh(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format date as short Thai locale
 * e.g. "9 เม.ย. 2569"
 */
export function formatDateThShort(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format date+time as Thai locale
 * e.g. "9 เมษายน 2569 14:30:00"
 */
export function formatDateTimeTh(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return date.toLocaleString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
