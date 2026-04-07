export interface TranslateRequest {
  article_id: string;
}

export interface TranslateResult {
  title_th: string;
  content_th: string;
  excerpt_th: string;
  confidence: number;
  token_usage: number;
  provider: "gemini" | "openrouter";
  model: string;
}

export interface ReportGenRequest {
  article_ids: string[];
  title: string;
  report_type: "executive" | "incident" | "weekly";
  classification: string;
}

export interface LLMResponse {
  text: string;
  token_usage: number;
  model: string;
}
