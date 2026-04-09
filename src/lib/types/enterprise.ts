// src/lib/types/enterprise.ts

// === Layout Types ===

export interface LayoutConfig {
  theme: "dark" | "light";
  primary_color: string;
  accent_color: string;
  font_heading: string;
  font_body: string;
  cover_style: "minimal" | "branded" | "full-image";
  logo_url: string | null;
  sections: ReportSection[];
  show_page_numbers: boolean;
  show_header_footer: boolean;
  classification_watermark: boolean;
}

export type ReportSection =
  | "cover"
  | "executive_summary"
  | "threat_landscape"
  | "risk_matrix"
  | "immediate_actions"
  | "strategic_actions"
  | "ioc_table"
  | "references";

export interface EnterpriseReportLayout {
  id: string;
  name: string;
  description: string | null;
  is_preset: boolean;
  layout_config: LayoutConfig;
  thumbnail_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// === Report Types ===

export type EnterpriseReportStatus =
  | "draft"
  | "generating"
  | "generated"
  | "reviewed"
  | "published";

export interface ReportContentEN {
  executive_summary: string;
  subtitle: string;
  threat_landscape: string;
  immediate_actions: string[];
  strategic_actions: string[];
  risk_level: string;
  confidence_level: string;
  ioc_table?: { type: string; value: string; source: string }[];
}

export interface EnterpriseReport {
  id: string;
  title: string;
  subtitle: string | null;
  report_type: string;
  classification: string;
  severity: string | null;
  layout_id: string | null;
  layout_config_override: Partial<LayoutConfig> | null;
  ai_design_prompt: string | null;
  content_en: ReportContentEN | null;
  content_th: ReportContentEN | null;
  content_prompt_template: string | null;
  status: EnterpriseReportStatus;
  export_history: { format: string; exported_at: string; file_size: number }[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EnterpriseReportWithArticles extends EnterpriseReport {
  articles: {
    article_id: string;
    display_order: number;
    article: {
      id: string;
      title: string;
      severity: string;
      excerpt: string | null;
      source_url: string | null;
      published_at: string | null;
      tags: string[];
    };
  }[];
  layout: EnterpriseReportLayout | null;
}

// === Watchlist Types ===

export type NotifyMode = "realtime" | "batch";
export type SummaryLevel = "short" | "detailed";
export type MatchMode = "exact" | "contains" | "regex";

export interface Watchlist {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  notify_mode: NotifyMode;
  batch_interval_minutes: number;
  summary_level: SummaryLevel;
  email_recipients: string[];
  is_active: boolean;
  last_checked_at: string | null;
  last_notified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WatchlistKeyword {
  id: string;
  watchlist_id: string;
  keyword: string;
  match_mode: MatchMode;
  created_at: string;
}

export interface WatchlistMatch {
  id: string;
  watchlist_id: string;
  article_id: string;
  keyword_id: string;
  matched_keyword: string;
  matched_in: string;
  summary_th: string | null;
  notified_at: string | null;
  created_at: string;
}

export interface WatchlistWithKeywords extends Watchlist {
  watchlist_keywords: WatchlistKeyword[];
}

export interface WatchlistWithStats extends Watchlist {
  keyword_count: number;
  match_count: number;
  today_match_count: number;
}

export interface WatchlistMatchWithArticle extends WatchlistMatch {
  article: {
    id: string;
    title: string;
    severity: string;
    excerpt: string | null;
    source_url: string | null;
    published_at: string | null;
  };
}

// === Email Config ===

export interface EmailConfig {
  provider: "resend" | "sendgrid" | "smtp";
  api_key: string;
  from_address: string;
  from_name: string;
  smtp_config?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  };
}
