import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { paths } = await request.json();
  const pathsToRevalidate = Array.isArray(paths) ? paths : ["/"];

  for (const path of pathsToRevalidate) {
    if (typeof path === "string") {
      revalidatePath(path);
    }
  }

  return NextResponse.json({ revalidated: true, paths: pathsToRevalidate });
}
