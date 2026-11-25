"use client";

import { useEffect, useRef, useState } from "react";
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

type TurnstileAPI = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileAPI;
  }
}

/** Explicit Turnstile render so a cached api.js cannot scan and then lose the widget on hydrate. */
export function Turnstile({ resetSignal = 0 }: { resetSignal?: number }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const host = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    let timer: number | undefined;

    const tryRender = (): boolean => {
      const api = window.turnstile;
      const el = host.current;
      if (cancelled || !api || !el || widgetId.current) return Boolean(widgetId.current);
      widgetId.current = api.render(el, {
        sitekey: siteKey,
        theme: "dark",
        callback: (value: string) => setToken(value),
        "expired-callback": () => setToken(""),
        "error-callback": () => setToken(""),
      });
      return true;
    };

    if (!tryRender()) {
      timer = window.setInterval(() => {
        if (tryRender() && timer) window.clearInterval(timer);
      }, 50);
    }

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      const id = widgetId.current;
      widgetId.current = null;
      setToken("");
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [siteKey]);

  useEffect(() => {
    if (!resetSignal) return;
    setToken("");
    const id = widgetId.current;
    if (id && window.turnstile) window.turnstile.reset(id);
  }, [resetSignal]);

  if (!siteKey) return null;
  return (
    <>
      <div ref={host} className="cf-turnstile" />
      <input type="hidden" name="cf-turnstile-response" value={token} readOnly />
    </>
  );
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
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        setBusy(true);
        try {
          await api("/api/rpc", { action, payload });
          setSaved(true);
          window.setTimeout(() => window.location.reload(), 500);
        } catch (err) {
          setBusy(false);
          setError(err instanceof Error ? err.message : "That didn't work. Try again.");
        }
      }}
    >
      <button type="submit" disabled={busy} className={`border px-3 text-sm disabled:opacity-60 ${danger ? "border-danger text-danger" : "border-ink"}`}>
        {busy ? "Saving…" : label}
      </button>
      {saved && <span role="status" className="ml-2 text-sm">Saved.</span>}
      {error && <span role="alert" className="ml-2 text-sm text-danger">{error}</span>}
    </form>
  );
}
