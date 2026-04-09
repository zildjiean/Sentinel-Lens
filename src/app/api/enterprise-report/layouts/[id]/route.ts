import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const layoutUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  layout_config: z
    .object({
      theme: z.enum(["dark", "light"]).optional(),
      primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      font_heading: z.string().min(1).optional(),
      font_body: z.string().min(1).optional(),
      cover_style: z.enum(["minimal", "branded", "full-image"]).optional(),
      logo_url: z.string().url().nullable().optional(),
      sections: z
        .array(
          z.enum([
            "cover",
            "executive_summary",
            "threat_landscape",
            "risk_matrix",
            "immediate_actions",
            "strategic_actions",
            "ioc_table",
            "references",
          ])
        )
        .min(1)
        .optional(),
      show_page_numbers: z.boolean().optional(),
      show_header_footer: z.boolean().optional(),
      classification_watermark: z.boolean().optional(),
    })
    .optional(),
});

// PUT: Update custom layout
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "viewer") {
    return NextResponse.json(
      { error: "Forbidden. Analyst or Admin role required." },
      { status: 403 }
    );
  }

  // Fetch existing layout to check ownership and preset status
  const { data: existing, error: fetchErr } = await supabase
    .from("enterprise_report_layouts")
    .select("*")
    .eq("id", params.id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Layout not found" }, { status: 404 });
  }

  if (existing.is_preset) {
    return NextResponse.json({ error: "Cannot modify preset layouts" }, { status: 403 });
  }

  if (existing.created_by !== user.id) {
    return NextResponse.json({ error: "Forbidden. You do not own this layout." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = layoutUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const updatePayload: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name;
  if (parsed.data.description !== undefined) updatePayload.description = parsed.data.description;
  if (parsed.data.layout_config !== undefined) {
    updatePayload.layout_config = {
      ...existing.layout_config,
      ...parsed.data.layout_config,
    };
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  updatePayload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("enterprise_report_layouts")
    .update(updatePayload)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ layout: data });
}
