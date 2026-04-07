export type UserRole = "admin" | "analyst" | "viewer";
export type ArticleSeverity = "critical" | "high" | "medium" | "low" | "info";
export type ArticleStatus = "new" | "translated" | "reviewed" | "archived";
export type LLMProvider = "gemini" | "openrouter";
export type ReportType = "executive" | "incident" | "weekly";
export type ReportStatus = "draft" | "generated" | "reviewed" | "published";

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface RSSSource {
  id: string;
  name: string;
  url: string;
  is_active: boolean;
  fetch_interval: number;
  last_fetched_at: string | null;
  created_at: string;
}

export interface Article {
  id: string;
  source_id: string | null;
  title: string;
  content: string;
  excerpt: string;
  url: string | null;
  image_url: string | null;
  author: string | null;
  severity: ArticleSeverity;
  status: ArticleStatus;
  tags: string[];
  published_at: string;
  is_manual: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Translation {
  id: string;
  article_id: string;
  title_th: string;
  content_th: string;
  excerpt_th: string;
  provider: LLMProvider;
  model: string;
  confidence: number;
  is_verified: boolean;
  verified_by: string | null;
  token_usage: number;
  translated_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  title: string;
  report_type: ReportType;
  content_en: Record<string, unknown>;
  content_th: Record<string, unknown>;
  severity: ArticleSeverity;
  classification: string;
  provider: LLMProvider | null;
  model: string | null;
  pdf_path: string | null;
  status: ReportStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AppSetting {
  id: string;
  key: string;
  value: unknown;
  updated_by: string | null;
  updated_at: string;
}

export interface ArticleWithTranslation extends Article {
  translations: Translation | null;
}
