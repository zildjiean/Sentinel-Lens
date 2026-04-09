# Daily Highlights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AI-curated "Daily Highlights" section to the Intelligence Feed that picks 0-5 important articles from the last 24 hours with Thai explanations, using hybrid DB caching (4-hour TTL).

**Architecture:** New API endpoint `GET /api/daily-highlights` checks a `daily_highlights` table for a fresh cache (< 4 hours). On miss, it fetches recent articles, sends them to the configured LLM (Gemini/OpenRouter), saves the result, and returns it. A new client component `DailyHighlights` renders between HeroBriefing and FilteredFeed.

**Tech Stack:** Next.js 14, Supabase, Gemini/OpenRouter LLM, Vitest, TypeScript

---

## File Structure

### New Files
- `supabase/migrations/006_add_daily_highlights.sql` — table, RLS, index
- `src/lib/daily-highlights/generator.ts` — LLM prompt building, response parsing, validation
- `src/app/api/daily-highlights/route.ts` — GET endpoint with hybrid cache logic
- `src/components/feed/DailyHighlights.tsx` — Client UI component
- `src/__tests__/lib/daily-highlights/generator.test.ts` — Unit tests for generator

### Modified Files
- `src/app/(public)/page.tsx` — Add DailyHighlights between HeroBriefing and FilteredFeed

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/006_add_daily_highlights.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/006_add_daily_highlights.sql

CREATE TABLE IF NOT EXISTS daily_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  highlights_data JSONB NOT NULL,
  article_count INTEGER NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '4 hours'),
  created_by UUID REFERENCES auth.users(id)
);

-- Index for finding fresh highlights quickly
CREATE INDEX idx_daily_highlights_expires_at ON daily_highlights(expires_at DESC);

-- RLS: all authenticated users can read
ALTER TABLE daily_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read daily highlights"
  ON daily_highlights FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert daily highlights"
  ON daily_highlights FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

- [ ] **Step 2: Run migration in Supabase**

Run this SQL in Supabase Dashboard → SQL Editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/006_add_daily_highlights.sql
git commit -m "feat: add daily_highlights table migration"
```

---

### Task 2: Generator Library (LLM Logic)

**Files:**
- Create: `src/lib/daily-highlights/generator.ts`
- Test: `src/__tests__/lib/daily-highlights/generator.test.ts`

- [ ] **Step 1: Write the generator module**

```ts
// src/lib/daily-highlights/generator.ts

import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface HighlightItem {
  article_id: string;
  reason_th: string;
  impact_level: "critical" | "high" | "notable";
}

export interface HighlightsData {
  has_highlights: boolean;
  no_highlight_reason: string | null;
  highlights: HighlightItem[];
}

interface ArticleSummary {
  id: string;
  title: string;
  severity: string;
  tags: string[];
  excerpt: string | null;
  published_at: string;
}

const SYSTEM_PROMPT = `คุณเป็นผู้เชี่ยวชาญด้าน cybersecurity intelligence วิเคราะห์ข่าวต่อไปนี้และคัดเลือกข่าวที่สำคัญที่สุดของวันนี้

เกณฑ์การคัดเลือก:
- ช่องโหว่ร้ายแรง (zero-day, RCE, actively exploited)
- การโจมตีที่กระทบวงกว้างหรือเกี่ยวข้องกับประเทศไทย
- ภัยคุกคามใหม่ที่ไม่เคยพบมาก่อน (new malware, new APT campaign)
- เหตุการณ์ data breach ขนาดใหญ่

กฎ:
- เลือกได้ 0-5 ข่าว ตามความสำคัญจริง
- ถ้าไม่มีข่าวที่น่าสนใจจริงๆ ให้ตอบ has_highlights: false พร้อมเหตุผลสั้นๆ
- เขียน reason_th เป็นภาษาไทย อธิบายว่าทำไมข่าวนี้สำคัญ (1-2 ประโยค)
- impact_level: "critical" (ต้องดำเนินการทันที), "high" (ควรติดตาม), "notable" (น่าสนใจ)

ตอบเป็น JSON เท่านั้น ไม่ต้องมี markdown code block`;

export function buildArticleContext(articles: ArticleSummary[]): string {
  return articles
    .map(
      (a) =>
        `[ID:${a.id}] "${a.title}" (${a.severity}) tags:[${a.tags.join(",")}] — ${(a.excerpt || "").substring(0, 200)}`
    )
    .join("\n");
}

export function parseHighlightsResponse(raw: string): HighlightsData {
  // Strip markdown code fences if present
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse AI response as JSON: ${cleaned.substring(0, 200)}`);
  }

  const hasHighlights = Boolean(parsed.has_highlights);
  const noHighlightReason =
    typeof parsed.no_highlight_reason === "string"
      ? parsed.no_highlight_reason
      : null;

  const rawHighlights = Array.isArray(parsed.highlights)
    ? parsed.highlights
    : [];

  const highlights: HighlightItem[] = rawHighlights
    .filter(
      (h: Record<string, unknown>) =>
        typeof h.article_id === "string" &&
        typeof h.reason_th === "string" &&
        ["critical", "high", "notable"].includes(String(h.impact_level))
    )
    .slice(0, 5)
    .map((h: Record<string, unknown>) => ({
      article_id: String(h.article_id),
      reason_th: String(h.reason_th),
      impact_level: h.impact_level as "critical" | "high" | "notable",
    }));

  return { has_highlights: hasHighlights, no_highlight_reason: noHighlightReason, highlights };
}

export async function generateHighlights(
  articles: ArticleSummary[],
  supabase: SupabaseClient
): Promise<HighlightsData> {
  if (articles.length === 0) {
    return {
      has_highlights: false,
      no_highlight_reason: "ไม่มีข่าวในระบบ 24 ชั่วโมงที่ผ่านมา",
      highlights: [],
    };
  }

  // Get API keys (same pattern as summarizer.ts)
  const { data: settings } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", [
      "llm_provider",
      "llm_api_keys",
      "gemini_api_key",
      "openrouter_api_key",
      "gemini_model",
      "openrouter_model",
    ]);

  const providerSetting = settings?.find((s) => s.key === "llm_provider");
  const keysSetting = settings?.find((s) => s.key === "llm_api_keys");
  const geminiKeySetting = settings?.find((s) => s.key === "gemini_api_key");
  const openrouterKeySetting = settings?.find((s) => s.key === "openrouter_api_key");
  const geminiModelSetting = settings?.find((s) => s.key === "gemini_model");
  const openrouterModelSetting = settings?.find((s) => s.key === "openrouter_model");

  const provider = ((providerSetting?.value as string) || "gemini").replace(/"/g, "");
  const keys = (keysSetting?.value as Record<string, string>) || {};

  const geminiKey =
    keys.gemini ||
    ((geminiKeySetting?.value as string) || "").replace(/"/g, "") ||
    process.env.GEMINI_API_KEY ||
    "";
  const openrouterKey =
    keys.openrouter ||
    ((openrouterKeySetting?.value as string) || "").replace(/"/g, "") ||
    process.env.OPENROUTER_API_KEY ||
    "";

  const geminiModel = ((geminiModelSetting?.value as string) || "gemini-2.0-flash").replace(/"/g, "");
  const openrouterModel = ((openrouterModelSetting?.value as string) || "google/gemini-2.0-flash-exp:free").replace(/"/g, "");

  const activeKey = provider === "gemini" ? geminiKey : openrouterKey;
  const model = provider === "gemini" ? geminiModel : openrouterModel;

  if (!activeKey) {
    throw new Error(`No API key configured for ${provider}. Go to Settings to add one.`);
  }

  const userPrompt = `วิเคราะห์ข่าว cybersecurity ต่อไปนี้ (${articles.length} ชิ้น จาก 24 ชม. ที่ผ่านมา) แล้วคัดเลือกข่าวสำคัญ:\n\n${buildArticleContext(articles)}`;

  let rawResponse: string;

  if (provider === "gemini") {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048, responseMimeType: "application/json" },
        }),
      }
    );
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${errText}`);
    }
    const data = await response.json();
    rawResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  } else {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${activeKey}`,
        "X-Title": "Sentinel Lens",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${errText}`);
    }
    const data = await response.json();
    rawResponse = data.choices?.[0]?.message?.content || "{}";
  }

  return parseHighlightsResponse(rawResponse);
}
```

- [ ] **Step 2: Write unit tests for pure functions**

```ts
// src/__tests__/lib/daily-highlights/generator.test.ts
import { describe, it, expect } from "vitest";
import { buildArticleContext, parseHighlightsResponse } from "@/lib/daily-highlights/generator";

describe("buildArticleContext", () => {
  it("formats articles into context string", () => {
    const articles = [
      {
        id: "abc-123",
        title: "Zero-day in Apache",
        severity: "critical",
        tags: ["CVE", "apache"],
        excerpt: "A critical zero-day was found",
        published_at: "2026-04-09T10:00:00Z",
      },
    ];
    const result = buildArticleContext(articles);
    expect(result).toContain("[ID:abc-123]");
    expect(result).toContain('"Zero-day in Apache"');
    expect(result).toContain("(critical)");
    expect(result).toContain("tags:[CVE,apache]");
    expect(result).toContain("A critical zero-day was found");
  });

  it("handles empty articles array", () => {
    expect(buildArticleContext([])).toBe("");
  });

  it("truncates long excerpts to 200 chars", () => {
    const articles = [
      {
        id: "x",
        title: "Test",
        severity: "low",
        tags: [],
        excerpt: "A".repeat(300),
        published_at: "2026-04-09T10:00:00Z",
      },
    ];
    const result = buildArticleContext(articles);
    // The excerpt part should be at most 200 chars
    const excerptPart = result.split("— ")[1];
    expect(excerptPart.length).toBeLessThanOrEqual(200);
  });

  it("handles null excerpt", () => {
    const articles = [
      {
        id: "x",
        title: "Test",
        severity: "low",
        tags: [],
        excerpt: null,
        published_at: "2026-04-09T10:00:00Z",
      },
    ];
    const result = buildArticleContext(articles);
    expect(result).toContain("— ");
  });
});

describe("parseHighlightsResponse", () => {
  it("parses valid JSON with highlights", () => {
    const json = JSON.stringify({
      has_highlights: true,
      no_highlight_reason: null,
      highlights: [
        { article_id: "abc-123", reason_th: "ข่าวสำคัญมาก", impact_level: "critical" },
        { article_id: "def-456", reason_th: "ควรติดตาม", impact_level: "high" },
      ],
    });
    const result = parseHighlightsResponse(json);
    expect(result.has_highlights).toBe(true);
    expect(result.no_highlight_reason).toBeNull();
    expect(result.highlights).toHaveLength(2);
    expect(result.highlights[0].article_id).toBe("abc-123");
    expect(result.highlights[0].impact_level).toBe("critical");
  });

  it("parses no-highlights response", () => {
    const json = JSON.stringify({
      has_highlights: false,
      no_highlight_reason: "ข่าวทั้งหมดเป็นเหตุการณ์ทั่วไป",
      highlights: [],
    });
    const result = parseHighlightsResponse(json);
    expect(result.has_highlights).toBe(false);
    expect(result.no_highlight_reason).toBe("ข่าวทั้งหมดเป็นเหตุการณ์ทั่วไป");
    expect(result.highlights).toHaveLength(0);
  });

  it("strips markdown code fences from response", () => {
    const raw = '```json\n{"has_highlights":false,"no_highlight_reason":"ไม่มี","highlights":[]}\n```';
    const result = parseHighlightsResponse(raw);
    expect(result.has_highlights).toBe(false);
  });

  it("limits highlights to max 5", () => {
    const highlights = Array.from({ length: 8 }, (_, i) => ({
      article_id: `id-${i}`,
      reason_th: `reason ${i}`,
      impact_level: "notable",
    }));
    const json = JSON.stringify({ has_highlights: true, no_highlight_reason: null, highlights });
    const result = parseHighlightsResponse(json);
    expect(result.highlights).toHaveLength(5);
  });

  it("filters out invalid highlight items", () => {
    const json = JSON.stringify({
      has_highlights: true,
      no_highlight_reason: null,
      highlights: [
        { article_id: "valid-1", reason_th: "good", impact_level: "critical" },
        { article_id: 123, reason_th: "bad id type", impact_level: "high" },
        { article_id: "valid-2", reason_th: "good", impact_level: "invalid_level" },
        { reason_th: "missing id", impact_level: "high" },
        { article_id: "valid-3", reason_th: "good", impact_level: "notable" },
      ],
    });
    const result = parseHighlightsResponse(json);
    expect(result.highlights).toHaveLength(2);
    expect(result.highlights[0].article_id).toBe("valid-1");
    expect(result.highlights[1].article_id).toBe("valid-3");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseHighlightsResponse("not json at all")).toThrow("Failed to parse AI response");
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/__tests__/lib/daily-highlights/generator.test.ts`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/daily-highlights/generator.ts src/__tests__/lib/daily-highlights/generator.test.ts
git commit -m "feat: add daily highlights generator with LLM integration and tests"
```

---

### Task 3: API Endpoint

**Files:**
- Create: `src/app/api/daily-highlights/route.ts`

- [ ] **Step 1: Create the API route**

```ts
// src/app/api/daily-highlights/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateHighlights } from "@/lib/daily-highlights/generator";
import type { HighlightsData } from "@/lib/daily-highlights/generator";

const CACHE_HOURS = 4;

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Check for fresh cache
  const { data: cached } = await supabase
    .from("daily_highlights")
    .select("*")
    .gt("expires_at", new Date().toISOString())
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();

  if (cached) {
    const highlightsData = cached.highlights_data as HighlightsData;

    // Enrich with article details
    const articleIds = highlightsData.highlights.map((h) => h.article_id);
    const { data: articles } = articleIds.length > 0
      ? await supabase
          .from("articles")
          .select("id, title, severity, excerpt, tags, published_at, url")
          .in("id", articleIds)
      : { data: [] };

    const articleMap = new Map((articles || []).map((a) => [a.id, a]));

    return NextResponse.json({
      has_highlights: highlightsData.has_highlights,
      highlights: highlightsData.highlights.map((h) => ({
        ...h,
        article: articleMap.get(h.article_id) || null,
      })),
      no_highlight_reason: highlightsData.no_highlight_reason,
      generated_at: cached.generated_at,
      is_cached: true,
    });
  }

  // 2. Cache miss — fetch recent articles and generate
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: recentArticles } = await supabase
    .from("articles")
    .select("id, title, severity, excerpt, tags, published_at, url")
    .gte("published_at", since)
    .order("published_at", { ascending: false })
    .limit(30);

  const articlesForAI = (recentArticles || []).map((a) => ({
    id: a.id,
    title: a.title,
    severity: a.severity || "low",
    tags: a.tags || [],
    excerpt: a.excerpt,
    published_at: a.published_at,
  }));

  let highlightsData: HighlightsData;

  try {
    highlightsData = await generateHighlights(articlesForAI, supabase);
  } catch (err) {
    return NextResponse.json(
      { error: `AI generation failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }

  // 3. Save to DB
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_HOURS * 60 * 60 * 1000);

  await supabase.from("daily_highlights").insert({
    highlights_data: highlightsData,
    article_count: articlesForAI.length,
    generated_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    created_by: user.id,
  });

  // 4. Enrich with article details
  const articleIds = highlightsData.highlights.map((h) => h.article_id);
  const { data: articles } = articleIds.length > 0
    ? await supabase
        .from("articles")
        .select("id, title, severity, excerpt, tags, published_at, url")
        .in("id", articleIds)
    : { data: [] };

  const articleMap = new Map((articles || []).map((a) => [a.id, a]));

  return NextResponse.json({
    has_highlights: highlightsData.has_highlights,
    highlights: highlightsData.highlights.map((h) => ({
      ...h,
      article: articleMap.get(h.article_id) || null,
    })),
    no_highlight_reason: highlightsData.no_highlight_reason,
    generated_at: now.toISOString(),
    is_cached: false,
  });
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build passes.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/daily-highlights/route.ts
git commit -m "feat: add daily-highlights API endpoint with hybrid cache"
```

---

### Task 4: UI Component

**Files:**
- Create: `src/components/feed/DailyHighlights.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/feed/DailyHighlights.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { formatDateTimeTh } from "@/lib/utils/date";
import { Flame, Coffee, AlertTriangle, RefreshCw } from "lucide-react";

interface HighlightArticle {
  id: string;
  title: string;
  severity: string;
  excerpt: string | null;
  tags: string[] | null;
  published_at: string;
  url: string | null;
}

interface Highlight {
  article_id: string;
  reason_th: string;
  impact_level: "critical" | "high" | "notable";
  article: HighlightArticle | null;
}

interface DailyHighlightsResponse {
  has_highlights: boolean;
  highlights: Highlight[];
  no_highlight_reason: string | null;
  generated_at: string;
  is_cached: boolean;
  error?: string;
}

const IMPACT_STYLES: Record<string, { border: string; badge: string; badgeBg: string }> = {
  critical: { border: "border-l-red-500", badge: "CRITICAL", badgeBg: "bg-red-500" },
  high: { border: "border-l-orange-500", badge: "HIGH", badgeBg: "bg-orange-500" },
  notable: { border: "border-l-blue-500", badge: "NOTABLE", badgeBg: "bg-blue-500" },
};

export function DailyHighlights() {
  const [data, setData] = useState<DailyHighlightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchHighlights() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/daily-highlights");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHighlights();
  }, []);

  // Loading skeleton
  if (loading) {
    return (
      <section className="mb-8">
        <div className="bg-surface-container rounded-xl p-6 animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-6 bg-surface-container-high rounded" />
            <div className="h-5 w-40 bg-surface-container-high rounded" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-surface-container-high rounded-lg" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className="mb-8">
        <div className="bg-surface-container rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <span className="text-on-surface-variant text-sm">{error}</span>
            </div>
            <button
              onClick={fetchHighlights}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-primary hover:bg-surface-container-high rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              ลองใหม่
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!data) return null;

  // No highlights state
  if (!data.has_highlights) {
    return (
      <section className="mb-8">
        <div className="bg-surface-container rounded-xl p-6">
          <div className="text-center py-4">
            <div className="flex items-center justify-center gap-2.5 mb-3">
              <Coffee className="w-5 h-5 text-on-surface-variant" />
              <h2 className="text-base font-bold text-on-surface">ข่าวเด่นประจำวัน</h2>
            </div>
            <div className="bg-surface-container-high rounded-lg p-6 max-w-md mx-auto border border-outline-variant/20">
              <div className="text-2xl mb-2">✅</div>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                วันนี้ไม่มีข่าวที่น่าสนใจเป็นพิเศษ
              </p>
              {data.no_highlight_reason && (
                <p className="text-on-surface-variant/60 text-xs mt-1">
                  {data.no_highlight_reason}
                </p>
              )}
            </div>
            <p className="text-on-surface-variant/40 text-[11px] mt-3">
              อัปเดตล่าสุด {formatDateTimeTh(data.generated_at)} · ตรวจสอบอีกครั้งใน 4 ชม.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Has highlights
  return (
    <section className="mb-8">
      <div className="bg-surface-container rounded-xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-orange-400" />
            <div>
              <h2 className="text-base font-bold text-on-surface">ข่าวเด่นประจำวัน</h2>
              <p className="text-[11px] text-on-surface-variant/60">
                AI คัดเลือก · อัปเดตล่าสุด {formatDateTimeTh(data.generated_at)}
              </p>
            </div>
          </div>
          <span className="text-[11px] text-on-surface-variant bg-surface-container-high px-3 py-1 rounded-full border border-outline-variant/20">
            {data.highlights.length} รายการ
          </span>
        </div>

        {/* Highlight Cards */}
        <div className="space-y-3">
          {data.highlights.map((h) => {
            const style = IMPACT_STYLES[h.impact_level] || IMPACT_STYLES.notable;
            const article = h.article;
            if (!article) return null;

            return (
              <div
                key={h.article_id}
                className={`bg-surface-container-high rounded-lg border border-outline-variant/20 border-l-4 ${style.border} p-4`}
              >
                {/* Badge + Time */}
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`${style.badgeBg} text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide`}
                  >
                    {style.badge}
                  </span>
                  <span className="text-[11px] text-on-surface-variant/60">
                    {formatDistanceToNow(new Date(article.published_at), {
                      addSuffix: true,
                      locale: th,
                    })}
                  </span>
                </div>

                {/* Title */}
                <Link
                  href={`/article/${article.id}`}
                  className="text-sm font-semibold text-on-surface hover:text-primary transition-colors leading-snug block mb-2"
                >
                  {article.title}
                </Link>

                {/* AI Reason */}
                <div className="text-xs text-on-surface-variant leading-relaxed mb-2.5 px-3 py-2 bg-surface-container rounded-md border-l-[3px] border-yellow-500/60">
                  <span className="text-yellow-500 font-semibold">AI: </span>
                  {h.reason_th}
                </div>

                {/* Tags */}
                {article.tags && article.tags.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {article.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] text-on-surface-variant/70 bg-surface-container px-2 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build passes.

- [ ] **Step 3: Commit**

```bash
git add src/components/feed/DailyHighlights.tsx
git commit -m "feat: add DailyHighlights UI component"
```

---

### Task 5: Integrate into Feed Page

**Files:**
- Modify: `src/app/(public)/page.tsx`

- [ ] **Step 1: Add DailyHighlights to the page**

Add import at top of file:
```ts
import { DailyHighlights } from "@/components/feed/DailyHighlights";
```

Add the component between HeroBriefing and FilteredFeed in the JSX return:
```tsx
      {/* Hero section - full width */}
      <div className="mb-8">
        <HeroBriefing
          activeThreats={articles.length}
          criticalAlerts={criticalCount}
          highAlerts={highCount}
          translatedCount={translatedCount}
          latestArticles={articles.slice(0, 5)}
        />
      </div>

      {/* AI Daily Highlights */}
      <DailyHighlights />

      {/* Filtered article feed */}
      <FilteredFeed articles={articles} />
```

- [ ] **Step 2: Run tests and build**

Run: `npm run test && npm run build`
Expected: All 92+ tests pass, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/(public)/page.tsx
git commit -m "feat: integrate DailyHighlights into Intelligence Feed page"
```

---

### Task 6: Bump Version to v1.1.0

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update version**

Change `"version": "1.0.0"` to `"version": "1.1.0"` in package.json.

- [ ] **Step 2: Commit and push**

```bash
git add package.json
git commit -m "chore: bump version to 1.1.0 — Daily Highlights feature"
git push
```
