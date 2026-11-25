import { AppError } from "@/domain/errors";

export async function verifyTurnstile(token: string | undefined, ip: string): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV !== "production" && (process.env.RVT_DEMO === "1" || process.env.TURNSTILE_BYPASS === "1")) {
      return;
    }
    throw new AppError(503, "Turnstile is not configured");
  }
  if (process.env.NODE_ENV === "production" && process.env.TURNSTILE_BYPASS === "1") {
    throw new AppError(503, "Turnstile bypass is not allowed in production");
  }
  if (!token) throw new AppError(400, "Complete the check");
  const body = new URLSearchParams({ secret, response: token, remoteip: ip });
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  const result = (await response.json()) as { success?: boolean };
  if (!result.success) throw new AppError(400, "The check failed. Try again.");
}
