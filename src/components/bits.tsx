"use client";

import { useEffect, useRef, useState } from "react";
import { APP } from "@/config/brand";
import { api } from "@/components/use-api";

export function CookieNotice() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (document.cookie.includes("rvt_cookie_ok=1") && ref.current) ref.current.hidden = true;
  }, []);
  return (
    <div ref={ref} className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-invert px-4 py-3 text-sm text-paper">
      <p>
        {APP.name} only uses essential cookies: your session, a security token, and the event you have open.
      </p>
      <button
        type="button"
        className="mt-2 border border-paper px-3 py-1"
        onClick={() => {
          document.cookie = "rvt_cookie_ok=1; path=/; max-age=31536000; samesite=lax";
          if (ref.current) ref.current.hidden = true;
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
