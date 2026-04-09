# Daily Highlights — Design Spec

## Goal

เพิ่ม section "ข่าวเด่นประจำวัน" บนหน้า Intelligence Feed ที่ AI คัดเลือกข่าวสำคัญ 1-5 ชิ้นจากข่าว 24 ชม. ล่าสุด พร้อมสรุปเหตุผลเป็นภาษาไทย หากไม่มีข่าวน่าสนใจให้แสดงข้อความบอกตรงๆ

## Position

แสดงเป็น section ใหม่ **ระหว่าง HeroBriefing กับ FilteredFeed** บนหน้า Intelligence Feed

## Data Strategy: Hybrid Cache

1. Client เรียก `GET /api/daily-highlights`
2. API เช็ค table `daily_highlights` ว่ามี record ที่ `generated_at` อายุ < 4 ชม. ไหม
3. **ถ้ามี** → return cached JSON ทันที
4. **ถ้าไม่มี/หมดอายุ** → ดึงข่าว 24 ชม. ล่าสุดจาก `articles` table → ส่งให้ LLM วิเคราะห์ → save ลง `daily_highlights` → return
5. ถ้าไม่มีข่าวในระบบเลย (0 articles ใน 24 ชม.) → return `has_highlights: false` โดยไม่ต้องเรียก AI

## Database

### Table: `daily_highlights`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key, default gen_random_uuid() |
| highlights_data | jsonb | AI response (see JSON format below) |
| article_count | integer | จำนวนข่าวที่ส่งให้ AI วิเคราะห์ |
| generated_at | timestamptz | เวลาที่ generate |
| expires_at | timestamptz | generated_at + 4 hours |
| created_by | uuid | User ที่ trigger generation (nullable) |

RLS: ทุก authenticated user อ่านได้ แต่ insert/update ผ่าน API เท่านั้น (service role)

## AI Integration

### Input to LLM

ส่งข่าว 24 ชม. ล่าสุด (สูงสุด 30 ชิ้น เรียงตาม severity + published_at DESC) ในรูปแบบ:

```
[ID:uuid] "title" (severity) tags:[tag1,tag2] — excerpt (max 200 chars)
```

### LLM Prompt (Thai)

```
คุณเป็นผู้เชี่ยวชาญด้าน cybersecurity intelligence วิเคราะห์ข่าวต่อไปนี้และคัดเลือกข่าวที่สำคัญที่สุดของวันนี้

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

ตอบเป็น JSON เท่านั้น
```

### LLM Output Format

```json
{
  "has_highlights": true,
  "no_highlight_reason": null,
  "highlights": [
    {
      "article_id": "uuid",
      "reason_th": "เหตุผลที่ข่าวนี้สำคัญ ภาษาไทย 1-2 ประโยค",
      "impact_level": "critical"
    }
  ]
}
```

เมื่อไม่มีข่าวน่าสนใจ:

```json
{
  "has_highlights": false,
  "no_highlight_reason": "ข่าวทั้งหมดเป็นเหตุการณ์ทั่วไปที่ไม่มีผลกระทบสูง",
  "highlights": []
}
```

### LLM Provider

ใช้ pattern เดียวกับ summarizer.ts — อ่าน provider config จาก `app_settings` table, fallback เป็น env vars, รองรับ Gemini และ OpenRouter

## API Endpoint

### `GET /api/daily-highlights`

**Auth:** ต้อง login (authenticated user)

**Response:**

```json
{
  "has_highlights": true,
  "highlights": [
    {
      "article_id": "uuid",
      "reason_th": "...",
      "impact_level": "critical",
      "article": {
        "id": "uuid",
        "title": "...",
        "severity": "critical",
        "excerpt": "...",
        "tags": ["tag1", "tag2"],
        "published_at": "2026-04-09T10:00:00Z",
        "source_url": "..."
      }
    }
  ],
  "no_highlight_reason": null,
  "generated_at": "2026-04-09T14:30:00Z",
  "is_cached": true
}
```

**Error cases:**
- 401: Not authenticated
- 500: LLM call failed (return error message, don't cache failure)

## UI Component: `DailyHighlights`

### Props

```ts
interface DailyHighlightsProps {}
// Component fetches data internally via client-side fetch
```

### States

1. **Loading** — skeleton cards ขณะ fetch
2. **Has highlights** — แสดง highlight cards 1-5 ชิ้น
3. **No highlights** — แสดง "วันนี้ไม่มีข่าวที่น่าสนใจเป็นพิเศษ"
4. **Error** — แสดง error message กับ retry button
5. **No articles** — กรณีไม่มีข่าวในระบบเลย ซ่อน section ทั้งหมด

### Visual Design

**Header:**
- 🔥 "ข่าวเด่นประจำวัน" + "AI คัดเลือก · อัปเดตล่าสุด {time}" + badge "{n} รายการ"

**Highlight Card (แต่ละข่าว):**
- เส้นซ้ายตาม impact: แดง (#EF4444) = critical, ส้ม (#F97316) = high, น้ำเงิน (#3B82F6) = notable
- Severity badge + relative time
- Title (clickable → link to article)
- AI reason box: พื้น dark, เส้นซ้ายเหลือง, prefix "AI:" สีเหลือง
- Tags (max 3)

**No Highlights State:**
- ☕ icon + "วันนี้ไม่มีข่าวที่น่าสนใจเป็นพิเศษ"
- แสดง reason จาก AI
- "อัปเดตล่าสุด {time} · ตรวจสอบอีกครั้งใน {remaining time}"

**Theme:** ใช้ MD3 CSS variables ตาม theme หลักของระบบ, รองรับ dark/light mode

## File Structure

### New Files
- `supabase/migrations/006_add_daily_highlights.sql` — table + RLS + index
- `src/app/api/daily-highlights/route.ts` — GET endpoint (hybrid cache logic)
- `src/lib/daily-highlights/generator.ts` — LLM call logic (build prompt, parse response, validate)
- `src/components/feed/DailyHighlights.tsx` — UI component

### Modified Files
- `src/app/(protected)/page.tsx` — เพิ่ม `<DailyHighlights />` ระหว่าง HeroBriefing กับ FilteredFeed

## Testing

- Unit test สำหรับ `generator.ts` — prompt building, response parsing, validation
- ใช้ Vitest (เหมือน test suite ที่มีอยู่แล้ว)
