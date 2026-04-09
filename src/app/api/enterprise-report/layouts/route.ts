import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const layoutSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().default(""),
  layout_config: z.object({
    theme: z.enum(["dark", "light"]),
    primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    font_heading: z.string().min(1),
    font_body: z.string().min(1),
    cover_style: z.enum(["minimal", "branded", "full-image"]),
    logo_url: z.string().url().nullable().optional().default(null),
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
      .min(1),
    show_page_numbers: z.boolean(),
    show_header_footer: z.boolean(),
    classification_watermark: z.boolean(),
  }),
});

// GET: List all layouts (presets + user-created)
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("enterprise_report_layouts")
    .select("*")
    .order("is_preset", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ layouts: data ?? [] });
}

// POST: Create custom layout
export async function POST(request: Request) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = layoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { name, description, layout_config } = parsed.data;

  const { data, error } = await supabase
    .from("enterprise_report_layouts")
    .insert({
      name,
      description,
      layout_config,
      is_preset: false,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ layout: data }, { status: 201 });
}
