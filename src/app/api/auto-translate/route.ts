// src/app/api/auto-translate/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { autoTranslateBatch } from "@/lib/translation/auto-translate";

export const maxDuration = 300;

export async function POST(request: Request) {
  // Verify internal secret if configured
  const body = await request.json().catch(() => ({}));
  const expectedSecret = process.env.AUTO_TRANSLATE_SECRET;
  if (expectedSecret && body.secret !== expectedSecret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const supabase = await createClient();
    const result = await autoTranslateBatch(supabase);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
