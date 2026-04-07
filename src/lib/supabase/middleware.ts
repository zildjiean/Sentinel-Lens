import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/translation-lab") ||
    request.nextUrl.pathname.startsWith("/report-archive") ||
    request.nextUrl.pathname.startsWith("/report") ||
    request.nextUrl.pathname.startsWith("/settings");

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isProtectedRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role || "viewer";
    const pathname = request.nextUrl.pathname;

    if (pathname.startsWith("/settings") && role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if ((pathname.startsWith("/translation-lab") || pathname === "/report/new") && role === "viewer") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return supabaseResponse;
}
