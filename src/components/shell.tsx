"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { APP } from "@/config/brand";
import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/footer";
import { api } from "@/components/use-api";
import type { NavItem } from "@/domain/paths";

type EventOption = { id: string; name: string; date: string };
type Note = { id: string; title: string; body: string };

export function Shell({
  name,
  roleLabel,
  nav,
  events,
  eventId,
  notices,
  children,
}: {
  name: string;
  roleLabel: string;
  nav: NavItem[];
  events: EventOption[];
  eventId: string | null;
  notices: Note[];
  children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState("");
  const [banner, setBanner] = useState<Note | null>(notices[0] ?? null);

  useEffect(() => {
    let idle = 0;
    let pulse = 0;
    const arm = () => {
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        api("/api/auth/logout").finally(() => {
          router.push("/login");
          router.refresh();
        });
      }, APP.idleMinutes * 60 * 1000);
    };
    const onActivity = () => {
      arm();
      window.clearTimeout(pulse);
      pulse = window.setTimeout(() => {
        api("/api/auth/pulse").catch(() => undefined);
      }, 60_000);
    };
    arm();
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);
    return () => {
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.clearTimeout(idle);
      window.clearTimeout(pulse);
    };
  }, [path, router]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  const door = path.startsWith("/door");

  return (
    <div className="min-h-screen bg-paper text-ink md:grid md:grid-cols-[232px_1fr]">
      <aside className={`${open ? "block" : "hidden"} border-b border-line bg-invert text-ink md:block md:min-h-screen md:border-b-0 md:border-r`}>
        <div className="flex items-center gap-3 px-4 py-4">
          <Logo href={door ? "/door" : "/dashboard"} className="h-10 w-10" />
          <div>
            <p className="display text-lg leading-none">{APP.shortName}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-invert-muted">{APP.org}</p>
          </div>
        </div>
        <nav id="app-nav" className="flex flex-col">
          {nav.map((item) => {
            const active = path === item.href || path.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`inline-flex min-h-11 items-center border-l-2 px-4 py-3 text-sm ${active ? "border-ink bg-accent text-ink" : "border-transparent text-invert-muted"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center gap-3 border-b border-line bg-panel px-4 py-3">
          <button
            type="button"
            className="min-w-11 border border-ink px-3 text-sm md:hidden"
            aria-expanded={open}
            aria-controls="app-nav"
            onClick={() => setOpen((value) => !value)}
          >
            Menu
          </button>
          {!door && events.length > 0 && (
            <label className="min-w-0 flex-1 text-sm">
              <span className="sr-only">Event</span>
              <select
                className="w-full border border-line bg-panel px-2 py-2"
                value={eventId ?? ""}
                onChange={async (event) => {
                  await api("/api/rpc", { action: "setEvent", payload: { eventId: event.target.value } });
                  router.refresh();
                }}
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name} · {event.date}
                  </option>
                ))}
              </select>
            </label>
          )}
          {door && <p className="display flex-1 text-xl">Door</p>}
          <div className="min-w-0 text-right text-sm">
            <p className="truncate font-medium">{name}</p>
            <p className="text-xs uppercase tracking-wider text-muted">{roleLabel}</p>
          </div>
          <button
            type="button"
            disabled={leaving}
            className="border border-ink px-3 text-sm disabled:opacity-60"
            onClick={async () => {
              setLeaving(true);
              try {
                await api("/api/auth/logout");
                router.push("/login");
                router.refresh();
              } catch (err) {
                setLeaving(false);
                setLeaveError(err instanceof Error ? err.message : "Could not log out. Try again.");
              }
            }}
          >
            {leaving ? "Signing out…" : "Log out"}
          </button>
          {leaveError && <p role="alert" className="text-sm text-danger">{leaveError}</p>}
        </header>
        {banner && (
          <div className="flex items-start justify-between gap-4 border-b border-line bg-panel px-4 py-3">
            <p>
              <span className="display border border-ink bg-accent px-1 text-ink">{banner.title}</span>
              <span className="mt-1 block text-sm text-muted">{banner.body}</span>
            </p>
            <button
              type="button"
              className="border border-ink px-2 py-1 text-sm"
              onClick={async () => {
                await api("/api/rpc", { action: "markNotice", payload: { id: banner.id } });
                setBanner(null);
              }}
            >
              Dismiss
            </button>
          </div>
        )}
        <main className={`min-w-0 ${door ? "p-3" : "p-4 md:p-6"}`}>{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}
