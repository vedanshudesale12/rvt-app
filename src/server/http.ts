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

export function assertCsrf(request: Request): void {
  const header = request.headers.get("x-csrf-token") ?? "";
  const cookie = readCookie(request, "rvt_csrf") ?? "";
  if (!header || !cookie || !safeEqual(header, cookie)) {
    throw new AppError(403, "Refresh the page and try again");
  }
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    throw new AppError(403, "That request came from the wrong site");
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
    if (error instanceof Error && /phone|ticket|amount|file|form|email|password/i.test(error.message)) {
      return json({ error: error.message }, 400);
    }
    captureException(error);
    console.error(error);
    return json({ error: "Something went wrong" }, 500);
  }
}
