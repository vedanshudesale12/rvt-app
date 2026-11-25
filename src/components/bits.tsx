"use client";

import { useEffect, useState } from "react";
import { APP } from "@/config/brand";
import { api } from "@/components/use-api";

export function CookieNotice() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (document.cookie.includes("rvt_cookie_ok=1")) return;
    const id = window.setTimeout(() => setOpen(true), 0);
    return () => window.clearTimeout(id);
  }, []);
  if (!open) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-line bg-invert px-4 py-3 pr-28 text-sm text-ink">
      <p>
        {APP.name} only uses essential cookies: your session, a security token, and the event you have open.
      </p>
      <button
        type="button"
        className="shrink-0 border border-ink px-3 py-1"
        onClick={() => {
          document.cookie = "rvt_cookie_ok=1; path=/; max-age=31536000; samesite=lax";
          setOpen(false);
        }}
      >
        OK
      </button>
    </div>
  );
}

export function Turnstile() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;
  return <div className="cf-turnstile" data-sitekey={siteKey} />;
}

export function IdleNote() {
  return null;
}

export function ActionButton({
  label,
  action,
  payload,
  danger = false,
}: {
  label: string;
  action: string;
  payload: Record<string, unknown>;
  danger?: boolean;
}) {
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        try {
          await api("/api/rpc", { action, payload });
          window.location.reload();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed");
        }
      }}
    >
      <button type="submit" className={`border px-2 py-1 text-sm ${danger ? "border-danger text-danger" : "border-ink"}`}>
        {label}
      </button>
      {error && <span className="ml-2 text-sm text-danger">{error}</span>}
    </form>
  );
}
