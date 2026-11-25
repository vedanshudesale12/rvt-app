import { APP } from "@/config/brand";

export function inr(paise: number | null | undefined): string {
  if (paise == null || Number.isNaN(paise)) return "—";
  return new Intl.NumberFormat(APP.locale, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export function inrExact(paise: number | null | undefined): string {
  if (paise == null || Number.isNaN(paise)) return "—";
  return new Intl.NumberFormat(APP.locale, {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(paise / 100);
}

export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees) || rupees < 0) throw new Error("Amount has to be zero or more");
  return Math.round(rupees * 100);
}

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(APP.locale, {
    timeZone: APP.timeZone,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = iso.length === 10 ? new Date(`${iso}T00:00:00+05:30`) : new Date(iso);
  return new Intl.DateTimeFormat(APP.locale, {
    timeZone: APP.timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function kolkataStamp(date: string, time: string): string {
  return new Date(`${date}T${time}:00+05:30`).toISOString();
}

/** Integer bps split. Truncates toward zero, matching Postgres integer division. */
export function bpsShare(amount: number, bps: number): number {
  return Math.trunc((amount * bps) / 10000);
}
