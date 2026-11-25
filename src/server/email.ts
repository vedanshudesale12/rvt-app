import { APP } from "@/config/brand";
import type { EventRow } from "@/domain/types";

export function fromAddress(): string | null {
  const raw = process.env.RESEND_FROM?.trim();
  if (!raw) return null;
  if (raw.includes("<")) return raw;
  return `${APP.name} <${raw}>`;
}

export async function sendEventEmail(to: string, event: EventRow): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = fromAddress();
  if (!key || !from || !to) return;
  const origin = process.env.NEXT_PUBLIC_APP_URL || "";
  const when = new Intl.DateTimeFormat(APP.locale, {
    timeZone: APP.timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(event.startsAt));
  const html = `
    <div style="background:#0a0a0a;padding:24px;font-family:Arial,sans-serif;color:#f4f4f1">
      <img src="${origin}/brand/rvt-logo.webp" alt="${APP.org}" width="240" />
      <p style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#4B1494">${APP.name}</p>
      <h1 style="font-size:28px;margin:8px 0">${event.name}</h1>
      <p>${when}<br/>${event.venue}</p>
      <p><a href="${origin}/events" style="color:#f4f4f1">Open the guest list</a></p>
    </div>`;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      subject: `${APP.name}: ${event.name}`,
      html,
    }),
  }).catch(() => undefined);
}
