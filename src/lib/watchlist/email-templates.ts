// src/lib/watchlist/email-templates.ts

// Severity color mapping
const SEVERITY_COLORS: Record<string, string> = {
  critical: "#EF4444",
  high: "#F97316",
  medium: "#EAB308",
  low: "#22C55E",
  info: "#3B82F6",
};

function getSeverityColor(severity: string): string {
  return SEVERITY_COLORS[severity?.toLowerCase()] ?? "#6B7280";
}

function severityBadge(severity: string): string {
  const color = getSeverityColor(severity);
  return `<span style="display:inline-block;background:${color};color:#fff;font-size:11px;font-weight:700;padding:2px 10px;border-radius:4px;letter-spacing:0.5px;text-transform:uppercase;">${severity}</span>`;
}

// ---- Base layout wrappers ----

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sentinel Lens Alert</title>
</head>
<body style="margin:0;padding:0;background:#0F172A;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F172A;min-height:100vh;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:#1E293B;border-radius:12px 12px 0 0;padding:24px 32px;border-bottom:1px solid #334155;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:20px;font-weight:800;color:#F1F5F9;letter-spacing:0.5px;">
                      🛡️ Sentinel Lens
                    </span>
                    <span style="display:block;font-size:12px;color:#94A3B8;margin-top:2px;">Cybersecurity Intelligence Platform</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#1E293B;padding:32px;border-radius:0 0 12px 12px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 0;text-align:center;">
              <p style="color:#475569;font-size:12px;margin:0;">
                คุณได้รับอีเมลนี้เพราะมีการตั้งค่า Watchlist ใน Sentinel Lens<br />
                หากต้องการยกเลิก กรุณาเข้าไปจัดการที่ Settings &gt; Watchlists
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---- Single Match Email ----

export interface SingleMatchEmailData {
  watchlistName: string;
  article: {
    id: string;
    title: string;
    severity: string;
    excerpt: string | null;
    source_url: string | null;
    published_at: string | null;
  };
  matchedKeyword: string;
  matchedIn: string;
  summaryTh: string | null;
  articleUrl?: string;
}

export function buildSingleMatchEmail(data: SingleMatchEmailData): {
  subject: string;
  html: string;
} {
  const {
    watchlistName,
    article,
    matchedKeyword,
    matchedIn,
    summaryTh,
    articleUrl,
  } = data;

  const severityColor = getSeverityColor(article.severity);
  const pubDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const subject = `[Sentinel Lens] แจ้งเตือน: "${matchedKeyword}" — ${article.title.substring(0, 60)}${article.title.length > 60 ? "…" : ""}`;

  const body = `
    <!-- Alert banner -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background:${severityColor}22;border-left:4px solid ${severityColor};border-radius:4px;padding:12px 16px;">
          <p style="margin:0;color:#F1F5F9;font-size:13px;font-weight:600;">
            ⚠️ Watchlist Alert: <strong>${watchlistName}</strong>
          </p>
          <p style="margin:4px 0 0;color:#94A3B8;font-size:12px;">
            พบคีย์เวิร์ด <strong style="color:#E2E8F0;">"${matchedKeyword}"</strong> ใน <em>${matchedIn}</em>
          </p>
        </td>
      </tr>
    </table>

    <!-- Article card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F172A;border-radius:8px;border:1px solid #334155;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 8px;font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;">บทความที่ตรวจพบ</p>
          <h2 style="margin:0 0 12px;font-size:18px;color:#F1F5F9;line-height:1.4;">${article.title}</h2>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
            <tr>
              <td style="padding-right:12px;">${severityBadge(article.severity)}</td>
              ${pubDate ? `<td style="font-size:12px;color:#64748B;">${pubDate}</td>` : ""}
            </tr>
          </table>
          ${article.excerpt ? `<p style="margin:0 0 16px;color:#94A3B8;font-size:14px;line-height:1.6;">${article.excerpt}</p>` : ""}
          ${
            articleUrl || article.source_url
              ? `<a href="${articleUrl ?? article.source_url}" style="display:inline-block;background:#3B82F6;color:#fff;font-size:13px;font-weight:600;padding:8px 20px;border-radius:6px;text-decoration:none;">อ่านบทความเต็ม →</a>`
              : ""
          }
        </td>
      </tr>
    </table>

    ${
      summaryTh
        ? `<!-- Thai Summary -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F172A;border-radius:8px;border:1px solid #334155;margin-bottom:8px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 8px;font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;">สรุปภาษาไทย (AI)</p>
          <p style="margin:0;color:#CBD5E1;font-size:14px;line-height:1.8;white-space:pre-wrap;">${summaryTh}</p>
        </td>
      </tr>
    </table>`
        : ""
    }
  `;

  return { subject, html: emailWrapper(body) };
}

// ---- Digest Email ----

export interface DigestMatchItem {
  article: {
    id: string;
    title: string;
    severity: string;
    excerpt: string | null;
    source_url: string | null;
    published_at: string | null;
  };
  matchedKeyword: string;
  matchedIn: string;
  summaryTh: string | null;
  articleUrl?: string;
}

export interface DigestEmailData {
  watchlistName: string;
  periodLabel: string; // e.g. "ช่วง 30 นาทีที่ผ่านมา"
  matches: DigestMatchItem[];
}

export function buildDigestEmail(data: DigestEmailData): {
  subject: string;
  html: string;
} {
  const { watchlistName, periodLabel, matches } = data;

  const subject = `[Sentinel Lens] Watchlist Digest: "${watchlistName}" — ${matches.length} รายการใหม่ (${periodLabel})`;

  const matchRows = matches
    .map(
      (m, idx) => `
    <tr>
      <td style="padding:0 0 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F172A;border-radius:8px;border:1px solid #334155;">
          <tr>
            <td style="padding:16px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr>
                  <td>
                    <span style="font-size:11px;color:#64748B;font-weight:600;">#${idx + 1}</span>
                    &nbsp;
                    ${severityBadge(m.article.severity)}
                  </td>
                  <td align="right" style="font-size:12px;color:#64748B;">
                    คีย์เวิร์ด: <strong style="color:#94A3B8;">${m.matchedKeyword}</strong> (${m.matchedIn})
                  </td>
                </tr>
              </table>
              <h3 style="margin:0 0 8px;font-size:15px;color:#F1F5F9;line-height:1.4;">${m.article.title}</h3>
              ${m.article.excerpt ? `<p style="margin:0 0 10px;color:#94A3B8;font-size:13px;line-height:1.6;">${m.article.excerpt.substring(0, 200)}${m.article.excerpt.length > 200 ? "…" : ""}</p>` : ""}
              ${
                m.summaryTh
                  ? `<p style="margin:0 0 12px;color:#CBD5E1;font-size:13px;line-height:1.7;padding:10px 14px;background:#1E293B;border-radius:6px;border-left:3px solid #3B82F6;white-space:pre-wrap;">${m.summaryTh}</p>`
                  : ""
              }
              ${
                m.articleUrl || m.article.source_url
                  ? `<a href="${m.articleUrl ?? m.article.source_url}" style="font-size:12px;color:#60A5FA;text-decoration:none;">อ่านบทความเต็ม →</a>`
                  : ""
              }
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `
    )
    .join("");

  const body = `
    <!-- Digest header -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background:#1D4ED822;border-left:4px solid #3B82F6;border-radius:4px;padding:14px 18px;">
          <p style="margin:0;font-size:15px;font-weight:700;color:#F1F5F9;">
            📋 Watchlist Digest: <span style="color:#60A5FA;">${watchlistName}</span>
          </p>
          <p style="margin:4px 0 0;color:#94A3B8;font-size:12px;">
            พบบทความที่ตรงกับคีย์เวิร์ด <strong style="color:#E2E8F0;">${matches.length} รายการ</strong> ${periodLabel}
          </p>
        </td>
      </tr>
    </table>

    <!-- Match list -->
    <table width="100%" cellpadding="0" cellspacing="0">
      ${matchRows}
    </table>
  `;

  return { subject, html: emailWrapper(body) };
}
