import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mergeLayoutConfig } from "@/lib/enterprise-report/merge-layout";
import type { LayoutConfig } from "@/lib/types/enterprise";

// GET: Fetch report by ID with layout and articles
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch report
  const { data: report, error: reportErr } = await supabase
    .from("enterprise_reports")
    .select("*")
    .eq("id", id)
    .single();

  if (reportErr || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // Fetch layout if layout_id is set
  let layout = null;
  if (report.layout_id) {
    const { data: layoutData } = await supabase
      .from("enterprise_report_layouts")
      .select("*")
      .eq("id", report.layout_id)
      .single();
    layout = layoutData ?? null;
  }

  // Fetch junction articles with article details
  const { data: junctionRows } = await supabase
    .from("enterprise_report_articles")
    .select(
      `display_order, article_id, articles ( id, title, severity, excerpt, source_url, published_at, tags )`
    )
    .eq("report_id", id)
    .order("display_order", { ascending: true });

  const articles = (junctionRows ?? []).map((row) => ({
    article_id: row.article_id,
    display_order: row.display_order,
    article: row.articles,
  }));

  // Merge layout config
  const baseLayoutConfig = layout?.layout_config as LayoutConfig | undefined | null;
  const override = report.layout_config_override as Partial<LayoutConfig> | undefined | null;
  const merged_layout_config = mergeLayoutConfig(baseLayoutConfig, override);

  return NextResponse.json({
    report,
    layout,
    articles,
    merged_layout_config,
  });
}

// PUT: Update report fields
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch existing report to verify it exists
  const { data: existing, error: fetchErr } = await supabase
    .from("enterprise_reports")
    .select("id, created_by")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const body = await request.json();

  // Only allow specific fields to be updated
  const allowedFields = [
    "title",
    "subtitle",
    "content_en",
    "content_th",
    "layout_config_override",
    "status",
    "export_history",
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data: updatedReport, error: updateErr } = await supabase
    .from("enterprise_reports")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ report: updatedReport });
}

// DELETE: Delete report and insert audit log
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch existing report for audit details
  const { data: existing, error: fetchErr } = await supabase
    .from("enterprise_reports")
    .select("id, title, created_by")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // Delete junction records first
  await supabase.from("enterprise_report_articles").delete().eq("report_id", id);

  // Delete the report
  const { error: deleteErr } = await supabase
    .from("enterprise_reports")
    .delete()
    .eq("id", id);

  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  // Insert audit log
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "enterprise_report_deleted",
    entity_type: "enterprise_report",
    entity_id: id,
    details: {
      title: existing.title,
      created_by: existing.created_by,
    },
  });

  return NextResponse.json({ success: true });
}
