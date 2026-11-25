import { APP } from "@/config/brand";
import { b64UrlToBytes, bytesToB64Url, safeEqual } from "@/server/bytes";

const text = new TextEncoder();

export function cookieSecure(): boolean {
  return process.env.COOKIE_SECURE === "1";
}

export function sessionSecret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV !== "production" && process.env.RVT_DEMO === "1") {
    return "rvt-demo-session-secret-not-for-production";
  }
  throw new Error("SESSION_SECRET is required");
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", text.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, text.encode(value)));
  return bytesToB64Url(sig);
}

export async function seal(payload: Record<string, unknown>, secret = sessionSecret()): Promise<string> {
  const body = bytesToB64Url(text.encode(JSON.stringify(payload)));
  return `${body}.${await sign(body, secret)}`;
}

export async function open<T>(token: string | undefined, secret = sessionSecret()): Promise<T | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = await sign(body, secret);
  if (!safeEqual(sig, expected)) return null;
  try {
    return JSON.parse(new TextDecoder().decode(b64UrlToBytes(body))) as T;
  } catch {
    return null;
  }
}

export async function sealSession(userId: string): Promise<string> {
  const now = Date.now();
  return seal({
    uid: userId,
    iat: now,
    exp: now + APP.sessionHours * 60 * 60 * 1000,
  });
}

export async function readSession(token: string | undefined): Promise<{ uid: string } | null> {
  const payload = await open<{ uid: string; exp: number }>(token);
  if (!payload?.uid || payload.exp < Date.now()) return null;
  return { uid: payload.uid };
}

export async function sealSeen(at = Date.now()): Promise<string> {
  return seal({ at });
}

export async function seenAgeMs(token: string | undefined): Promise<number | null> {
  const payload = await open<{ at: number }>(token);
  if (!payload?.at) return null;
  return Date.now() - payload.at;
}

export function idleMs(): number {
  return APP.idleMinutes * 60 * 1000;
}

export function csrfToken(): string {
  return bytesToB64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export function cookieBase() {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax" as const,
    path: "/",
  };
}
