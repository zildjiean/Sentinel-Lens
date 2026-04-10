# Auto-Translation on RSS Fetch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically translate and analyze every new article into Thai immediately after RSS fetch using a structured cybersecurity analysis prompt, with prompt override from Settings UI.

**Architecture:** Fire-and-forget POST from rss-fetch to a new auto-translate endpoint. Shared translator module eliminates LLM code duplication between manual and auto translation. Prompt stored in code with DB override via `app_settings`.

**Tech Stack:** Next.js API routes, Supabase, Gemini/OpenRouter APIs, React (Settings UI)

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/lib/translation/prompt.ts` (new) | Default prompt constant + `getTranslationPrompt()` loader |
| `src/lib/translation/translator.ts` (new) | Core `translateArticle()` — LLM config, API call, JSON parsing |
| `src/app/api/auto-translate/route.ts` (new) | POST endpoint — batch translate untranslated articles |
| `src/app/api/rss-fetch/route.ts` (modify) | Fire-and-forget call to auto-translate after fetch |
| `src/app/api/translate/route.ts` (modify) | Replace inline LLM logic with shared translator |
| `src/components/settings/LLMConfig.tsx` (modify) | Add Translation Prompt textarea section |

---

### Task 1: Translation Prompt Module

**Files:**
- Create: `src/lib/translation/prompt.ts`

- [ ] **Step 1: Create the prompt module**

```ts
// src/lib/translation/prompt.ts

import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export const DEFAULT_TRANSLATION_PROMPT = `คุณคือผู้เชี่ยวชาญด้าน cybersecurity โดยเฉพาะด้านข่าวสารภัยคุกคามทางไซเบอร์ มีหน้าที่สรุปข้อมูลสำคัญจากข่าวหรือบทความ และนำเสนอในรูปแบบที่เข้าใจง่ายและครบถ้วนตามหัวข้อที่กำหนด

วัตถุประสงค์และเป้าหมาย:
* สรุปข่าวสารด้าน Cybersecurity
* วิเคราะห์และจัดหมวดหมู่ข้อมูลตามหัวข้อที่กำหนด เพื่อให้ผู้ใช้ได้รับข้อมูลที่ครอบคลุมและเป็นระบบ
* นำเสนอข้อมูลในรูปแบบที่เข้าใจง่าย กระชับ และมีสาระครบถ้วน

พฤติกรรมและกฎ:
1) การรับข้อมูลและการประมวลผล:
a) สรุปเนื้อหาหลักของข่าวให้เข้าใจง่าย ไม่ยาวเกินไป แต่ต้องมีสาระครบถ้วน
b) ระบุ Severity (ระดับความรุนแรง) ของข่าว เช่น ต่ำ, ปานกลาง, สูง, วิกฤต
c) ระบุ System Impact ที่เกี่ยวข้อง ว่ากระทบกับระบบหรือแพลตฟอร์มใดบ้าง
d) ระบุ Malware หรือ Threat Actor ที่เกี่ยวข้อง หากมี
e) สรุปขั้นตอนการโจมตีทางเทคนิคแบบ Step by Step แต่ไม่ต้องลงรายละเอียดที่ซับซ้อนเกินไป
f) แยกแยะคำแนะนำเป็น 2 ส่วน: Short Term (คำแนะนำเร่งด่วน) และ Long Term (คำแนะนำระยะยาว)
g) ระบุแหล่งที่มาของข่าวจากลิงก์ที่ผู้ใช้ให้มาอย่างชัดเจน
h) แสดงผลทุกครั้งให้มีหัวข้อเท่าเดิมเสมอ ห้ามเพิ่มหัวข้อขึ้นมาเอง

2) การนำเสนอ:
a) จัดรูปแบบการนำเสนอให้เป็นไปตามลำดับหัวข้อที่กำหนด
b) ใช้ภาษาที่กระชับและเป็นทางการ แต่ยังคงความเข้าใจง่าย
c) ใช้หัวข้อย่อยเพื่อจัดระเบียบข้อมูลให้ดูสะอาดตาและอ่านง่าย
d) เน้นหัวข้อและรายละเอียดให้ชัดเจน

โทนโดยรวม:
* ใช้ภาษาแบบผู้เชี่ยวชาญที่มีความน่าเชื่อถือ
* แสดงความเป็นมืออาชีพและละเอียดรอบคอบในการวิเคราะห์ข้อมูล
* ตอบคำถามอย่างตรงไปตรงมาและให้ข้อมูลที่ถูกต้อง

กฎเพิ่มเติม:
* คงคำศัพท์เทคนิคเป็นภาษาอังกฤษ: CVE IDs, APT group names, malware names, protocol names, IP addresses, domain names, tool names, vendor names
* ตอบเป็น JSON เท่านั้น ไม่ต้องมี markdown code block
* JSON format: { "title_th": "...", "excerpt_th": "สรุปสั้น 2-3 ประโยค", "content_th": "เนื้อหาวิเคราะห์แบบ structured ตามหัวข้อที่กำหนด" }`;

export async function getTranslationPrompt(supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "translation_prompt")
    .maybeSingle();

  const dbPrompt = data?.value as string | null;
  if (dbPrompt && dbPrompt.trim().length > 0) {
    return dbPrompt;
  }

  return DEFAULT_TRANSLATION_PROMPT;
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit src/lib/translation/prompt.ts 2>&1 || true`

If there are import resolution issues, that's OK — they'll resolve when `translator.ts` is also created. The key thing is no syntax errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/translation/prompt.ts
git commit -m "feat: add translation prompt module with DB override support"
```

---

### Task 2: Core Translator Module

**Files:**
- Create: `src/lib/translation/translator.ts`

- [ ] **Step 1: Create the translator module**

This module extracts and shares the LLM calling logic from `src/app/api/translate/route.ts`. It follows the same config pattern used in `src/lib/daily-highlights/generator.ts`.

```ts
// src/lib/translation/translator.ts

import { createClient } from "@/lib/supabase/server";
import { getTranslationPrompt } from "./prompt";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface TranslationResult {
  title_th: string;
  excerpt_th: string;
  content_th: string;
  provider: "gemini" | "openrouter";
  model: string;
  token_usage: number;
  confidence: number;
}

interface ArticleInput {
  title: string;
  content: string | null;
  excerpt: string | null;
  url: string;
}

interface LLMConfig {
  provider: "gemini" | "openrouter";
  apiKey: string;
  model: string;
}

async function loadLLMConfig(supabase: SupabaseClient): Promise<LLMConfig> {
  const { data: settings } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", [
      "llm_provider", "llm_api_keys", "gemini_api_key",
      "openrouter_api_key", "gemini_model", "openrouter_model",
    ]);

  const providerSetting = settings?.find((s) => s.key === "llm_provider");
  const keysSetting = settings?.find((s) => s.key === "llm_api_keys");
  const geminiKeySetting = settings?.find((s) => s.key === "gemini_api_key");
  const openrouterKeySetting = settings?.find((s) => s.key === "openrouter_api_key");
  const geminiModelSetting = settings?.find((s) => s.key === "gemini_model");
  const openrouterModelSetting = settings?.find((s) => s.key === "openrouter_model");

  const provider = (((providerSetting?.value as string) || "gemini").replace(/"/g, "")) as "gemini" | "openrouter";
  const keys = (keysSetting?.value as Record<string, string>) || {};

  const geminiKey = keys.gemini || ((geminiKeySetting?.value as string) || "").replace(/"/g, "") || process.env.GEMINI_API_KEY || "";
  const openrouterKey = keys.openrouter || ((openrouterKeySetting?.value as string) || "").replace(/"/g, "") || process.env.OPENROUTER_API_KEY || "";

  const geminiModel = ((geminiModelSetting?.value as string) || "gemini-2.0-flash").replace(/"/g, "");
  const openrouterModel = ((openrouterModelSetting?.value as string) || "google/gemini-2.0-flash-exp:free").replace(/"/g, "");

  const apiKey = provider === "gemini" ? geminiKey : openrouterKey;
  const model = provider === "gemini" ? geminiModel : openrouterModel;

  if (!apiKey) {
    throw new Error(`No API key configured for ${provider}. Go to Settings to add one.`);
  }

  return { provider, apiKey, model };
}

async function callGemini(apiKey: string, model: string, systemPrompt: string, userPrompt: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
      }),
      signal: AbortSignal.timeout(30000),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const tokenUsage =
    (data.usageMetadata?.promptTokenCount || 0) +
    (data.usageMetadata?.candidatesTokenCount || 0);

  return { text, tokenUsage, model, provider: "gemini" as const };
}

async function callOpenRouter(apiKey: string, model: string, systemPrompt: string, userPrompt: string) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(30000),
    cache: "no-store",
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  const tokenUsage = data.usage?.total_tokens || 0;

  return { text, tokenUsage, model, provider: "openrouter" as const };
}

function parseTranslationResponse(raw: string): { title_th: string; excerpt_th: string; content_th: string; confidence: number } {
  try {
    const jsonStr = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    const confidence = parsed.title_th && parsed.content_th ? 0.85 : 0.6;
    return {
      title_th: parsed.title_th || "",
      excerpt_th: parsed.excerpt_th || "",
      content_th: parsed.content_th || "",
      confidence,
    };
  } catch {
    return {
      title_th: raw.slice(0, 200),
      excerpt_th: raw.slice(0, 300),
      content_th: raw,
      confidence: 0.6,
    };
  }
}

export async function translateArticle(
  article: ArticleInput,
  supabase: SupabaseClient
): Promise<TranslationResult> {
  const config = await loadLLMConfig(supabase);
  const systemPrompt = await getTranslationPrompt(supabase);

  const contentTruncated = (article.content || "").substring(0, 6000);
  const userPrompt = `วิเคราะห์และสรุปข่าว cybersecurity ต่อไปนี้:

Title: ${article.title}

Content: ${contentTruncated}

Excerpt: ${article.excerpt || ""}

Source URL: ${article.url}`;

  const result = config.provider === "gemini"
    ? await callGemini(config.apiKey, config.model, systemPrompt, userPrompt)
    : await callOpenRouter(config.apiKey, config.model, systemPrompt, userPrompt);

  const parsed = parseTranslationResponse(result.text);

  return {
    title_th: parsed.title_th,
    excerpt_th: parsed.excerpt_th,
    content_th: parsed.content_th,
    provider: result.provider,
    model: result.model,
    token_usage: result.tokenUsage,
    confidence: parsed.confidence,
  };
}
```

- [ ] **Step 2: Verify no syntax errors**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/lib/translation/translator.ts
git commit -m "feat: add core translator module with Gemini/OpenRouter support"
```

---

### Task 3: Auto-Translate API Endpoint

**Files:**
- Create: `src/app/api/auto-translate/route.ts`

- [ ] **Step 1: Create the auto-translate endpoint**

```ts
// src/app/api/auto-translate/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { translateArticle } from "@/lib/translation/translator";

export const maxDuration = 300; // 5 minutes for Vercel serverless

export async function POST() {
  const supabase = await createClient();

  // Query untranslated articles (LEFT JOIN where translation is missing)
  const { data: articles, error: queryError } = await supabase
    .from("articles")
    .select("id, title, content, excerpt, url")
    .eq("status", "new")
    .order("published_at", { ascending: false })
    .limit(20);

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  if (!articles || articles.length === 0) {
    return NextResponse.json({ translated: 0, failed: 0, total: 0 });
  }

  // Filter out articles that already have translations
  const articleIds = articles.map((a) => a.id);
  const { data: existingTranslations } = await supabase
    .from("translations")
    .select("article_id")
    .in("article_id", articleIds);

  const translatedIds = new Set(existingTranslations?.map((t) => t.article_id) || []);
  const untranslated = articles.filter((a) => !translatedIds.has(a.id));

  if (untranslated.length === 0) {
    return NextResponse.json({ translated: 0, failed: 0, total: 0 });
  }

  let translated = 0;
  let failed = 0;

  for (const article of untranslated) {
    try {
      const result = await translateArticle(
        {
          title: article.title,
          content: article.content,
          excerpt: article.excerpt,
          url: article.url,
        },
        supabase
      );

      const { error: insertError } = await supabase.from("translations").insert({
        article_id: article.id,
        title_th: result.title_th,
        content_th: result.content_th,
        excerpt_th: result.excerpt_th,
        provider: result.provider,
        model: result.model,
        confidence: result.confidence,
        token_usage: result.token_usage,
      });

      if (insertError) {
        console.warn(`Auto-translate insert failed for article ${article.id}:`, insertError.message);
        failed++;
        continue;
      }

      await supabase
        .from("articles")
        .update({ status: "translated" })
        .eq("id", article.id);

      translated++;
    } catch (err) {
      console.warn(
        `Auto-translate failed for article ${article.id}:`,
        err instanceof Error ? err.message : String(err)
      );
      failed++;
    }
  }

  return NextResponse.json({
    translated,
    failed,
    total: untranslated.length,
  });
}
```

- [ ] **Step 2: Verify no syntax errors**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auto-translate/route.ts
git commit -m "feat: add auto-translate endpoint for batch article translation"
```

---

### Task 4: Fire-and-Forget from RSS Fetch

**Files:**
- Modify: `src/app/api/rss-fetch/route.ts:254-263`

- [ ] **Step 1: Add fire-and-forget auto-translate call after RSS fetch completes**

In `src/app/api/rss-fetch/route.ts`, replace the final return block (lines ~254-263) with:

```ts
  // Fire-and-forget: trigger auto-translation for new articles
  if (totalNew > 0) {
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    fetch(`${protocol}://${host}/api/auto-translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }).catch(() => {}); // fire-and-forget, errors are logged inside auto-translate
  }

  return NextResponse.json({
    success: true,
    new_articles: totalNew,
    ads_filtered: totalAdsFiltered,
    skipped_duplicates: totalSkipped,
    sources_processed: sources.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
```

Note: The `request` parameter is already available in the POST handler function signature. Verify by checking line 1 of the exported POST function — it receives `request: Request`.

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/rss-fetch/route.ts
git commit -m "feat: trigger auto-translate after RSS fetch for new articles"
```

---

### Task 5: Refactor Manual Translate to Use Shared Translator

**Files:**
- Modify: `src/app/api/translate/route.ts`

- [ ] **Step 1: Replace the entire file with the refactored version**

The new version keeps auth check, duplicate check, and DB insert logic, but delegates LLM work to the shared translator module.

```ts
// src/app/api/translate/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { translateArticle } from "@/lib/translation/translator";

export async function POST(request: Request) {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "viewer") {
    return NextResponse.json({ error: "Forbidden. Analyst or Admin role required." }, { status: 403 });
  }

  const { article_id } = await request.json();

  // Fetch article
  const { data: article, error: articleError } = await supabase
    .from("articles")
    .select("*")
    .eq("id", article_id)
    .single();

  if (articleError || !article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  // Check if already translated
  const { data: existing } = await supabase
    .from("translations")
    .select("id")
    .eq("article_id", article_id)
    .single();

  if (existing) {
    return NextResponse.json({ message: "Already translated" });
  }

  try {
    const result = await translateArticle(
      {
        title: article.title,
        content: article.content,
        excerpt: article.excerpt,
        url: article.url,
      },
      supabase
    );

    // Insert translation
    const { error: insertError } = await supabase.from("translations").insert({
      article_id,
      title_th: result.title_th,
      content_th: result.content_th,
      excerpt_th: result.excerpt_th,
      provider: result.provider,
      model: result.model,
      confidence: result.confidence,
      token_usage: result.token_usage,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Update article status
    await supabase
      .from("articles")
      .update({ status: "translated" })
      .eq("id", article_id);

    return NextResponse.json({
      message: "Translation complete",
      provider: result.provider,
      token_usage: result.token_usage,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Translation failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/translate/route.ts
git commit -m "refactor: use shared translator module in manual translate endpoint"
```

---

### Task 6: Translation Prompt Settings UI

**Files:**
- Modify: `src/components/settings/LLMConfig.tsx`

- [ ] **Step 1: Add Translation Prompt section to LLMConfig component**

Add these state variables after the existing state declarations (after line 35 `const [saving, setSaving] = useState(false);`):

```ts
  const [translationPrompt, setTranslationPrompt] = useState("");
  const [promptSaving, setPromptSaving] = useState(false);
  const [promptLoaded, setPromptLoaded] = useState(false);
```

In the `loadSettings` function, add `"translation_prompt"` to the `.in("key", [...])` array, and add this case inside the `for (const setting of data)` loop:

```ts
          if (setting.key === "translation_prompt") {
            setTranslationPrompt((setting.value as string) || "");
            setPromptLoaded(true);
          }
```

Also set `setPromptLoaded(true)` after the loop (outside the if-block for translation_prompt), so it's always marked as loaded even if no DB row exists:

```ts
      if (data) {
        for (const setting of data) {
          // ... existing cases ...
          if (setting.key === "translation_prompt") {
            setTranslationPrompt((setting.value as string) || "");
          }
        }
      }
      setPromptLoaded(true);
```

Add two handler functions before the `return` statement:

```ts
  async function handleSavePrompt() {
    setPromptSaving(true);
    const supabase = createClient();
    await supabase
      .from("app_settings")
      .upsert({ key: "translation_prompt", value: translationPrompt }, { onConflict: "key" });
    setPromptSaving(false);
  }

  async function handleResetPrompt() {
    setPromptSaving(true);
    const supabase = createClient();
    await supabase
      .from("app_settings")
      .delete()
      .eq("key", "translation_prompt");
    setTranslationPrompt("");
    setPromptSaving(false);
  }
```

Add this JSX block after the closing `</Card>` in the return statement. The component will now return a fragment wrapping both cards:

Change the return from:
```tsx
  return (
    <Card variant="low">
      ...existing content...
    </Card>
  );
```

To:
```tsx
  return (
    <>
      <Card variant="low">
        ...existing LLM config content (unchanged)...
      </Card>

      <Card variant="low" className="mt-6">
        <h2 className="font-headline text-xl font-semibold text-on-surface mb-4">Translation Prompt</h2>
        <p className="text-xs text-on-surface-variant mb-3">
          กำหนด prompt สำหรับการแปลและวิเคราะห์ข่าว (ว่างเปล่า = ใช้ prompt เริ่มต้น)
        </p>
        <textarea
          value={translationPrompt}
          onChange={(e) => setTranslationPrompt(e.target.value)}
          placeholder={promptLoaded && !translationPrompt ? "ใช้ prompt เริ่มต้น (คลิกเพื่อแก้ไข)" : ""}
          rows={10}
          className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-on-surface-variant">
            {translationPrompt.length} characters
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetPrompt}
              disabled={promptSaving || !translationPrompt}
            >
              Reset to Default
            </Button>
            <Button
              size="sm"
              onClick={handleSavePrompt}
              disabled={promptSaving}
            >
              {promptSaving ? "Saving..." : "Save Prompt"}
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Verify the dev server renders correctly**

Run: `npm run dev` and navigate to Settings page. Verify:
- Translation Prompt section appears below LLM config
- Textarea is empty by default (using default prompt)
- Character count shows "0 characters"
- Reset button is disabled when textarea is empty
- Save button works

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/LLMConfig.tsx
git commit -m "feat: add Translation Prompt override in Settings UI"
```

---

### Task 7: Integration Test & Full Verification

- [ ] **Step 1: Run the full test suite**

Run: `npm test 2>&1 | tail -30`

Expected: All existing tests pass (103+).

- [ ] **Step 2: Run the build to verify no compilation errors**

Run: `npm run build 2>&1 | tail -30`

Expected: Build succeeds with no errors.

- [ ] **Step 3: Manual integration test**

1. Start dev server: `npm run dev`
2. Go to Settings → verify Translation Prompt section appears
3. Trigger RSS fetch (POST /api/rss-fetch)
4. Check console logs — auto-translate should fire
5. Check articles table — new articles should get status "translated"
6. Check translations table — new rows with Thai content

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve any integration issues from auto-translation feature"
```
