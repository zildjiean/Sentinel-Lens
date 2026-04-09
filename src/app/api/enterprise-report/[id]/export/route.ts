import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mergeLayoutConfig } from "@/lib/enterprise-report/merge-layout";
import { buildReportHTML } from "@/lib/enterprise-report/generate-pdf";
import type { LayoutConfig, ReportContentEN } from "@/lib/types/enterprise";
import chromium from "@sparticuz/chromium-min";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const format: string = body.format ?? "pdf";
  const language: "en" | "th" = body.language === "th" ? "th" : "en";

  if (format !== "pdf") {
    return NextResponse.json(
      { error: "Only PDF format is supported server-side. Use client-side DOCX generation for Word format." },
      { status: 400 }
    );
  }

  // Fetch report
  const { data: report, error: reportErr } = await supabase
    .from("enterprise_reports")
    .select("*")
    .eq("id", id)
    .single();

  if (reportErr || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // Fetch layout
  let layout = null;
  if (report.layout_id) {
    const { data: layoutData } = await supabase
      .from("enterprise_report_layouts")
      .select("*")
      .eq("id", report.layout_id)
      .single();
    layout = layoutData ?? null;
  }

  // Merge layout config
  const baseLayoutConfig = layout?.layout_config as LayoutConfig | undefined | null;
  const override = report.layout_config_override as Partial<LayoutConfig> | undefined | null;
  const mergedLayout = mergeLayoutConfig(baseLayoutConfig, override);

  // Select content based on language
  const content = (language === "th" ? report.content_th : report.content_en) as ReportContentEN | null;
  if (!content) {
    return NextResponse.json(
      { error: `No ${language.toUpperCase()} content available for this report` },
      { status: 422 }
    );
  }

  // Build HTML
  const html = buildReportHTML({
    title: report.title,
    subtitle: report.subtitle,
    classification: report.classification,
    severity: report.severity,
    report_type: report.report_type,
    content,
    layout: mergedLayout,
    created_at: report.created_at,
    language,
  });

  // Launch Puppeteer
  let pdfBuffer: Buffer;
  try {
    const puppeteer = await import("puppeteer-core");

    const executablePath = await chromium.executablePath(
      "https://github.com/nichochar/chromium-binaries/raw/main/chromium-v131.0.0-pack.tar"
    );

    const browser = await puppeteer.default.launch({
      headless: true,
      executablePath,
      args: chromium.args,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfOptions: Parameters<typeof page.pdf>[0] = {
      format: "A4",
      printBackground: true,
    };

    if (mergedLayout.show_header_footer) {
      pdfOptions.displayHeaderFooter = true;
      pdfOptions.headerTemplate = `<div style="font-size:9px;color:#888;padding:0 20mm;width:100%;text-align:right;">${report.classification}</div>`;
      pdfOptions.footerTemplate = mergedLayout.show_page_numbers
        ? `<div style="font-size:9px;color:#888;padding:0 20mm;width:100%;display:flex;justify-content:space-between;"><span>${report.title}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`
        : `<div style="font-size:9px;color:#888;padding:0 20mm;width:100%;text-align:left;">${report.title}</div>`;
    }

    const pdfRaw = await page.pdf(pdfOptions);
    await browser.close();

    pdfBuffer = Buffer.from(pdfRaw);
  } catch (err) {
    return NextResponse.json(
      { error: `PDF generation failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }

  // Update export_history
  const exportEntry = {
    format: "pdf",
    language,
    exported_at: new Date().toISOString(),
    file_size: pdfBuffer.byteLength,
  };

  const existingHistory = Array.isArray(report.export_history) ? report.export_history : [];
  await supabase
    .from("enterprise_reports")
    .update({
      export_history: [...existingHistory, exportEntry],
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  // Return PDF as download
  const filename = `${report.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${language}.pdf`;

  return new NextResponse(pdfBuffer.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.byteLength),
    },
  });
}
