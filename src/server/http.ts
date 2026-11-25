import { ZodError } from "zod";
import { AppError } from "@/domain/errors";
import { safeEqual } from "@/server/bytes";
import { cookieBase, csrfToken } from "@/server/session";
import { captureException } from "@/server/sentry";

export function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(data, { status, headers });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError(400, "Send JSON");
  }
}

const DEV_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|::1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/;

function hostnameOf(host: string): string {
  return host.replace(/:\d+$/, "");
}

/** In dev, localhost and a LAN address (for example 192.168.1.5) are the same app. */
export function devHostsCompatible(originHost: string, requestHost: string): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return DEV_HOST.test(hostnameOf(originHost)) && DEV_HOST.test(hostnameOf(requestHost));
}

export function assertCsrf(request: Request): void {
  const header = request.headers.get("x-csrf-token") ?? "";
  const cookie = readCookie(request, "rvt_csrf") ?? "";
  if (!header || !cookie || !safeEqual(header, cookie)) {
    throw new AppError(403, "Refresh the page and try again");
  }
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host) {
    const originHost = new URL(origin).host;
    if (originHost !== host && !devHostsCompatible(originHost, host)) {
      throw new AppError(403, "That request came from the wrong site");
    }
  }
}

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie") ?? "";
  const found = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : undefined;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}

export function withCsrf(response: Response): Response {
  if (response.headers.get("set-cookie")?.includes("rvt_csrf=")) return response;
  return response;
}

export function csrfCookie(token = csrfToken()): string {
  const secure = cookieBase().secure ? "; Secure" : "";
  return `rvt_csrf=${token}; Path=/; Max-Age=86400; SameSite=Lax${secure}`;
}

export async function handle(work: () => Promise<unknown>): Promise<Response> {
  try {
    const data = await work();
    return json(data ?? { ok: true });
  } catch (error) {
    if (error instanceof AppError) return json({ error: error.message }, error.status);
    if (error instanceof ZodError) return json({ error: "Check the form and try again." }, 400);
    if (error instanceof Error && /phone|ticket|amount|file|form|email|password/i.test(error.message)) {
      return json({ error: error.message }, 400);
    }
    captureException(error);
    console.error(error);
    return json({ error: "Something went wrong" }, 500);
  }
}
