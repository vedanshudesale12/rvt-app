import { NextResponse, type NextRequest } from "next/server";
import { canAccessPath, homeFor } from "@/domain/paths";
import type { Role, Status } from "@/domain/types";
import { createServerClient } from "@supabase/ssr";
import { contentSecurityPolicy } from "@/server/csp";
import { csrfToken, cookieBase, idleMs, readSession, seenAgeMs } from "@/server/session";

const PUBLIC = [
  "/login",
  "/signup",
  "/privacy",
  "/terms",
  "/cookies",
  "/contact",
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

const APP_PREFIXES = [
  "/login", "/signup", "/privacy", "/terms", "/cookies", "/contact",
  "/dashboard", "/guests", "/comps", "/ledger", "/settle", "/door", "/chat",
  "/leaderboard", "/events", "/ticketing", "/data", "/people", "/audit",
  "/account", "/pending", "/api", "/brand", "/icons", "/manifest.webmanifest", "/sw.js",
];

function isKnown(path: string): boolean {
  if (path === "/") return true;
  return APP_PREFIXES.some((item) => path === item || path.startsWith(`${item}/`));
}

function secureResponse(response: NextResponse, csp: string): NextResponse {
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const dev = process.env.NODE_ENV === "development";
  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy({
    dev,
    https: request.nextUrl.protocol === "https:",
    nonce,
  });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-rvt-path", path);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  let response = secureResponse(NextResponse.next({ request: { headers: requestHeaders } }), csp);

  if (!request.cookies.get("rvt_csrf")) {
    response.cookies.set("rvt_csrf", csrfToken(), {
      httpOnly: false,
      secure: cookieBase().secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  }

  if (isPublic(path)) return secureResponse(response, csp);

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
          response = secureResponse(NextResponse.next({ request: { headers: requestHeaders } }), csp);
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
    return secureResponse(redirect, csp);
  }

  if (!isKnown(path)) return secureResponse(response, csp);

  if (!userId || !role || status === "disabled") {
    if (path.startsWith("/api/")) return secureResponse(NextResponse.json({ error: "Sign in required" }, { status: 401 }), csp);
    const login = new URL("/login", request.url);
    login.searchParams.set("next", path);
    return secureResponse(NextResponse.redirect(login), csp);
  }

  if (!canAccessPath({ role, status }, path)) {
    const dest = status === "pending" ? "/pending" : homeFor(role);
    if (path.startsWith("/api/") || path.startsWith("/data")) {
      return secureResponse(NextResponse.json({ error: "You can't do that" }, { status: 403 }), csp);
    }
    return secureResponse(NextResponse.redirect(new URL(dest, request.url)), csp);
  }

  return secureResponse(response, csp);
}

export const config = {
  // Leave Next's dev socket and static assets alone. Redirecting /_next/hmr
  // to login stops Turbopack from booting the page, so nothing is clickable.
  matcher: ["/((?!_next/|__nextjs|favicon.ico).*)"],
};
