import { NextResponse, type NextRequest } from "next/server";
import { canAccessPath, homeFor } from "@/domain/paths";
import type { Role, Status } from "@/domain/types";
import { createServerClient } from "@supabase/ssr";
import { csrfToken, cookieBase, idleMs, readSession, seenAgeMs } from "@/server/session";

const PUBLIC = [
  "/login",
  "/signup",
  "/privacy",
  "/terms",
  "/cookies",
  "/manifest.webmanifest",
  "/sw.js",
  "/api/health",
  "/api/cron/keepalive",
  "/api/auth/login",
  "/api/auth/signup",
];

function isPublic(path: string): boolean {
  return PUBLIC.some((item) => path === item) || path.startsWith("/brand/") || path.startsWith("/icons/");
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-rvt-path", path);
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  if (!request.cookies.get("rvt_csrf")) {
    response.cookies.set("rvt_csrf", csrfToken(), {
      httpOnly: false,
      secure: cookieBase().secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  }

  if (isPublic(path)) return response;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let userId: string | null = null;
  let role: Role | null = null;
  let status: Status = "disabled";

  if (supabaseUrl && supabaseKey) {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookieOptions: cookieBase(),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
    if (userId) {
      const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", userId).maybeSingle();
      role = (profile?.role as Role | null) ?? null;
      status = (profile?.status as Status | undefined) ?? "disabled";
    }
  } else if (process.env.RVT_DEMO === "1" && process.env.NODE_ENV !== "production") {
    const session = await readSession(request.cookies.get("rvt_demo")?.value);
    userId = session?.uid ?? null;
    const roleCookie = request.cookies.get("rvt_role")?.value;
    const statusCookie = request.cookies.get("rvt_status")?.value;
    role = (roleCookie as Role | undefined) ?? null;
    status = (statusCookie as Status | undefined) ?? "active";
  }

  const age = await seenAgeMs(request.cookies.get("rvt_seen")?.value);
  if (userId && age != null && age > idleMs()) {
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    redirect.cookies.delete("rvt_demo");
    redirect.cookies.delete("rvt_role");
    redirect.cookies.delete("rvt_status");
    redirect.cookies.delete("rvt_seen");
    return redirect;
  }

  if (!userId || !role || status === "disabled") {
    if (path.startsWith("/api/")) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    const login = new URL("/login", request.url);
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  if (!canAccessPath({ role, status }, path)) {
    const dest = status === "pending" ? "/pending" : homeFor(role);
    if (path.startsWith("/api/")) return NextResponse.json({ error: "You can't do that" }, { status: 403 });
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
