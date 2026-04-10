# Auto-Translation on RSS Fetch — Design Spec

**Date:** 2026-04-10  
**Status:** Approved  
**Goal:** Automatically translate and analyze every new article into Thai immediately after RSS fetch, using a structured cybersecurity analysis prompt. Allow the prompt to be overridden from Settings UI.

---

## Architecture

### Data Flow

```
RSS Fetch (existing POST /api/rss-fetch)
  → Insert new articles into DB (status: "new")
  → Return response immediately
  → Fire-and-forget: call POST /api/auto-translate

Auto-Translate Endpoint (POST /api/auto-translate)
  → Query articles with status="new" and no translation (LIMIT 20)
  → For each article:
      → Load prompt (DB override or default)
      → Call Gemini/OpenRouter with article content
      → Parse JSON response (title_th, excerpt_th, content_th)
      → Insert into translations table
      → Update article status → "translated"
  → Return summary { translated, failed, skipped }
```

### Key Decisions

- **Async after fetch** — RSS fetch returns fast; translation happens in background via fire-and-forget fetch call. No risk of timeout on the RSS endpoint.
- **Replace existing prompt** — The new structured analysis prompt replaces the old translation prompt in both auto and manual translation flows.
- **No schema changes** — Uses existing `translations` table fields (title_th, content_th, excerpt_th) and `app_settings` table for prompt override.
- **Prompt override via Settings** — Default prompt lives in code; admin can override it via `app_settings` key `translation_prompt` from the Settings UI.

---

## Files

### New Files

#### `src/lib/translation/prompt.ts`
- Exports `DEFAULT_TRANSLATION_PROMPT` — the full structured prompt (user-provided)
- Exports `getTranslationPrompt(supabase)` — reads `app_settings.translation_prompt`; returns DB value if exists, otherwise returns default
- Pure functions, no side effects

#### `src/lib/translation/translator.ts`
- Exports `translateArticle(article, supabase)` — core translation function
  - Loads LLM config (provider, key, model) using same pattern as daily-highlights/generator.ts
  - Loads prompt via `getTranslationPrompt(supabase)`
  - Builds user prompt with article title, content, excerpt, url
  - Calls Gemini or OpenRouter API (30s timeout, cache: "no-store")
  - Parses JSON response → `{ title_th, excerpt_th, content_th }`
  - Fallback parsing if JSON parse fails (confidence 0.6 vs 0.85)
  - Returns `TranslationResult` with fields + metadata (provider, model, token_usage, confidence)

#### `src/app/api/auto-translate/route.ts`
- POST endpoint (no auth required — called internally by rss-fetch)
- Accepts optional `{ secret: string }` body for cron-based invocation security
- Queries: `articles` LEFT JOIN `translations` WHERE `translations.id IS NULL` AND `status = 'new'` LIMIT 20
- Loops through each article:
  - Calls `translateArticle()`
  - On success: inserts translation record, updates article status to "translated"
  - On failure: logs error, continues to next article
- Returns `{ translated: number, failed: number, total: number }`

### Modified Files

#### `src/app/api/rss-fetch/route.ts`
- After successful fetch (new_articles > 0), add fire-and-forget call:
  ```ts
  if (totalNew > 0) {
    const baseUrl = request.headers.get("host");
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    fetch(`${protocol}://${baseUrl}/api/auto-translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }).catch(() => {}); // fire-and-forget
  }
  ```

#### `src/app/api/translate/route.ts`
- Replace inline prompt + LLM call with import from `translator.ts`:
  ```ts
  import { translateArticle } from "@/lib/translation/translator";
  ```
- Remove duplicated LLM config retrieval and API call logic
- Keep auth check, duplicate check, and DB insert logic

#### `src/components/settings/LLMConfig.tsx`
- Add new section "Translation Prompt" below existing LLM settings
- Textarea field for prompt override
- Load current value from `app_settings` key `translation_prompt`
- Save button upserts to `app_settings`
- "Reset to Default" button deletes the DB row (reverts to code default)
- Show character count and hint: "ว่างเปล่า = ใช้ prompt เริ่มต้น"

---

## Default Prompt

Stored in `src/lib/translation/prompt.ts`:

```
คุณคือผู้เชี่ยวชาญด้าน cybersecurity โดยเฉพาะด้านข่าวสารภัยคุกคามทางไซเบอร์ มีหน้าที่สรุปข้อมูลสำคัญจากข่าวหรือบทความ และนำเสนอในรูปแบบที่เข้าใจง่ายและครบถ้วนตามหัวข้อที่กำหนด

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
* JSON format: { "title_th": "...", "excerpt_th": "สรุปสั้น 2-3 ประโยค", "content_th": "เนื้อหาวิเคราะห์แบบ structured ตามหัวข้อที่กำหนด" }
```

---

## AI Response Format

The AI must return JSON:

```json
{
  "title_th": "หัวข้อข่าวภาษาไทย",
  "excerpt_th": "สรุปสั้นๆ 2-3 ประโยค",
  "content_th": "สรุปเนื้อหา\n\nระดับความรุนแรง (Severity)\nวิกฤต\n\nระบบที่ได้รับผลกระทบ (System Impact)\n...\n\nMalware / Threat Actor\n...\n\nขั้นตอนการโจมตี (Attack Steps)\n...\n\nคำแนะนำระยะสั้น (Short Term)\n...\n\nคำแนะนำระยะยาว (Long Term)\n...\n\nแหล่งที่มา\n..."
}
```

These map directly to existing `translations` table columns — no migration needed.

---

## User Prompt Template

Sent to AI for each article:

```
วิเคราะห์และสรุปข่าว cybersecurity ต่อไปนี้:

Title: {article.title}

Content: {article.content (max 6000 chars)}

Excerpt: {article.excerpt}

Source URL: {article.url}
```

---

## Error Handling

- **Per-article try-catch** — one failed translation does not block others
- **30s timeout** on AI API calls via `AbortSignal.timeout(30000)`
- **Fallback parsing** — if AI returns non-JSON, use raw text as content_th with confidence 0.6
- **No retry** — failed articles stay as status "new" and will be picked up on next auto-translate run
- **Logging** — `console.warn` on failures with article ID and error message

---

## Settings UI Addition

In `LLMConfig.tsx`, add a new section:

```
┌─────────────────────────────────────────┐
│ Translation Prompt                       │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ [textarea - current prompt]         │ │
│ │                                     │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│ 1,234 characters                        │
│                                         │
│ [Reset to Default]  [Save Prompt]       │
│                                         │
│ ℹ ว่างเปล่า = ใช้ prompt เริ่มต้น        │
└─────────────────────────────────────────┘
```

- Stored in `app_settings` with key `translation_prompt`
- Reset button deletes the row from DB
- Empty textarea = use default from code

---

## Testing

- Unit tests for `getTranslationPrompt()` (default vs override)
- Unit tests for response parsing (valid JSON, invalid JSON fallback, missing fields)
- Existing test suite must continue passing (103 tests)
