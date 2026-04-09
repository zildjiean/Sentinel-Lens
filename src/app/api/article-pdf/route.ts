import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const severityColors: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
  info: "#6b7280",
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const articleId = url.searchParams.get("id");

  if (!articleId) {
    return NextResponse.json({ error: "Missing article id" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: article } = await supabase
    .from("articles")
    .select("*, translations(*), rss_sources(name)")
    .eq("id", articleId)
    .single();

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  const translation = Array.isArray(article.translations)
    ? article.translations[0]
    : article.translations;

  const sourceName = (article.rss_sources as { name: string } | null)?.name || "Manual Entry";
  const sevColor = severityColors[article.severity] || "#6b7280";
  const publishDate = new Date(article.published_at).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>${article.title} - Sentinel Lens Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', 'Sarabun', sans-serif;
      background: #ffffff;
      color: #1a1a2e;
      line-height: 1.7;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }

    .header {
      border-bottom: 3px solid ${sevColor};
      padding-bottom: 24px;
      margin-bottom: 32px;
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .logo {
      font-size: 18px;
      font-weight: 700;
      color: #0a0e1a;
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    .logo span {
      color: ${sevColor};
    }

    .severity-badge {
      display: inline-block;
      background: ${sevColor};
      color: white;
      padding: 4px 16px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .title {
      font-size: 28px;
      font-weight: 700;
      color: #0a0e1a;
      margin-bottom: 8px;
      line-height: 1.3;
    }

    .thai-title {
      font-family: 'Sarabun', sans-serif;
      font-size: 22px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 16px;
    }

    .meta {
      display: flex;
      gap: 24px;
      font-size: 12px;
      color: #6b7280;
    }

    .meta strong { color: #374151; }

    .section {
      margin-bottom: 28px;
    }

    .section-header {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 12px;
      padding-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-header .accent {
      width: 4px;
      height: 18px;
      border-radius: 2px;
    }

    .accent-blue { background: #3b82f6; }
    .section-header.blue { color: #3b82f6; }

    .accent-purple { background: #8b5cf6; }
    .section-header.purple { color: #8b5cf6; }

    .accent-orange { background: #f97316; }
    .section-header.orange { color: #f97316; }

    .accent-green { background: #22c55e; }
    .section-header.green { color: #22c55e; }

    .section-content {
      font-size: 14px;
      color: #374151;
      white-space: pre-line;
    }

    .section-content.thai {
      font-family: 'Sarabun', sans-serif;
      font-size: 15px;
    }

    .reference-box {
      background: #f3f4f6;
      border-left: 4px solid #3b82f6;
      padding: 12px 16px;
      margin-top: 24px;
      border-radius: 0 8px 8px 0;
    }

    .reference-box a {
      color: #3b82f6;
      text-decoration: none;
      word-break: break-all;
    }

    .footer {
      border-top: 2px solid #e5e7eb;
      padding-top: 16px;
      margin-top: 40px;
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
    }

    .footer .classification {
      font-weight: 700;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: ${sevColor};
      margin-bottom: 4px;
    }

    .dual-lang {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .lang-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .lang-en { color: #3b82f6; }
    .lang-th { color: #22c55e; }

    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-top">
      <div class="logo">Sentinel <span>Lens</span></div>
      <span class="severity-badge">${article.severity.toUpperCase()}</span>
    </div>
    <h1 class="title">${escapeHtml(article.title)}</h1>
    ${translation?.title_th ? `<p class="thai-title">${escapeHtml(translation.title_th)}</p>` : ""}
    <div class="meta">
      <span><strong>Source:</strong> ${escapeHtml(sourceName)}</span>
      <span><strong>Published:</strong> ${publishDate}</span>
      ${article.author ? `<span><strong>Author:</strong> ${escapeHtml(article.author)}</span>` : ""}
    </div>
  </div>

  <!-- Executive Summary -->
  <div class="section">
    <div class="section-header blue">
      <span class="accent accent-blue"></span>
      Executive Summary / สรุปสำหรับผู้บริหาร
    </div>
    <div class="dual-lang">
      <div>
        <p class="lang-label lang-en">English</p>
        <div class="section-content">${escapeHtml(article.excerpt || "")}</div>
      </div>
      <div>
        <p class="lang-label lang-th">ภาษาไทย</p>
        <div class="section-content thai">${escapeHtml(translation?.excerpt_th || "ยังไม่มีคำแปล")}</div>
      </div>
    </div>
  </div>

  <!-- Full Content -->
  <div class="section">
    <div class="section-header purple">
      <span class="accent accent-purple"></span>
      Full Content / เนื้อหาฉบับเต็ม
    </div>
    <div class="dual-lang">
      <div>
        <p class="lang-label lang-en">English</p>
        <div class="section-content">${escapeHtml(article.content || "")}</div>
      </div>
      <div>
        <p class="lang-label lang-th">ภาษาไทย</p>
        <div class="section-content thai">${escapeHtml(translation?.content_th || "ยังไม่มีคำแปล")}</div>
      </div>
    </div>
  </div>

  <!-- Reference -->
  ${article.url ? `
  <div class="reference-box">
    <strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Reference Source</strong><br>
    <a href="${escapeHtml(article.url)}" target="_blank">${escapeHtml(article.url)}</a>
  </div>
  ` : ""}

  <!-- Tags -->
  ${article.tags?.length ? `
  <div class="section" style="margin-top: 24px;">
    <div class="section-header green">
      <span class="accent accent-green"></span>
      Tags
    </div>
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      ${article.tags.map((tag: string) => `<span style="background: #e5e7eb; padding: 2px 10px; border-radius: 12px; font-size: 12px; color: #374151;">${escapeHtml(tag)}</span>`).join("")}
    </div>
  </div>
  ` : ""}

  <div class="footer">
    <p class="classification">CONFIDENTIAL</p>
    <p>Generated by Sentinel Lens Cybersecurity Intelligence • ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
    <p>This document is for authorized personnel only. Handle according to classification level.</p>
  </div>

  <script class="no-print">
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
