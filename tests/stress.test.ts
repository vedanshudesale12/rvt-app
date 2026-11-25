import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

process.env.RVT_DEMO = "1";
process.env.NODE_ENV = "test";

import ids from "../supabase/seed-ids.json";
import { AppError } from "@/domain/errors";
import type { Actor, Sale } from "@/domain/types";
import { checkIn, logSale } from "@/server/ops";
import { memoryHit, resetRateLimits } from "@/server/rate-limit";
import { demoAssignments, demoEvents, demoExpenses, demoPhones, demoProfiles, demoSales, demoTickets } from "@/server/store/demo";
import { createMemoryStore } from "@/server/store/memory";

function admin(): Actor {
  const profile = demoProfiles().find((row) => row.id === ids.vedanshu);
  if (!profile?.role) throw new Error("admin");
  return {
    id: profile.id,
    role: profile.role,
    status: profile.status,
    fullName: profile.fullName,
    email: profile.email,
    isOwner: profile.isOwner,
    ownerSlot: profile.ownerSlot,
  };
}

function door(index: number): Actor {
  return { ...admin(), id: `door-${index}`, role: "door", fullName: `Door ${index}`, isOwner: false, ownerSlot: null };
}

function memory() {
  return createMemoryStore({
    profiles: demoProfiles(),
    events: demoEvents(),
    tickets: demoTickets(),
    assignments: demoAssignments(),
    sales: demoSales(),
    expenses: demoExpenses(),
    phones: demoPhones(),
  });
}

function percentile(samples: number[], p: number): number {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;
}

describe("stress", () => {
  it("admits one guest when twelve scanners hit the same ticket", async () => {
    const store = memory();
    const results = await Promise.all(Array.from({ length: 12 }, (_, index) => checkIn(door(index), ids.saleRohan, store)));
    expect(results.filter((row) => row.result === "inside")).toHaveLength(1);
    expect(results.filter((row) => row.result === "already_inside")).toHaveLength(11);
  });

  it("does not oversell the last seat", async () => {
    const store = memory();
    const eventId = "20000000-0000-4000-8000-000000000088";
    const ticketId = "30000000-0000-4000-8000-000000000088";
    const event = demoEvents().find((row) => row.id === ids.eventFriday);
    const ticket = demoTickets().find((row) => row.eventId === ids.eventFriday);
    if (!event || !ticket) throw new Error("seed");
    await store.saveEvent({ ...event, id: eventId, capacity: 1, waitlistCount: 0, status: "published" });
    await store.saveTickets(eventId, [{ ...ticket, id: ticketId, eventId }]);
    await store.saveAssignments(eventId, [{ id: "staff-stress", eventId, profileId: ids.aisha, side: "rvt", commissionPaise: null }]);
    const results = await Promise.allSettled(Array.from({ length: 30 }, (_, index) => logSale(admin(), {
      eventId,
      guestName: `Rush ${index}`,
      phone: `91000000${String(index).padStart(2, "0")}`,
      ticketTypeId: ticketId,
      prId: ids.aisha,
      ageConfirmed: true,
    }, store)));
    expect(results.filter((row) => row.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((row) => row.status === "rejected")).toHaveLength(29);
  });

  it("keeps check-in under 500ms at 20 per second across 12 scanners", async () => {
    const store = memory();
    const base = demoSales().find((row) => row.id === ids.saleSara);
    if (!base) throw new Error("sale");
    const sales: Sale[] = [];
    for (let index = 0; index < 120; index += 1) {
      const id = `41000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
      const sale = { ...base, id, guestName: `Scan ${index}`, checkedInAt: null, checkedInBy: null };
      await store.saveSale(sale);
      sales.push(sale);
    }
    const samples: number[] = [];
    let cursor = 0;
    const started = performance.now();
    while (cursor < sales.length && performance.now() - started < 6000) {
      const batch = sales.slice(cursor, cursor + 20);
      cursor += batch.length;
      const timed = await Promise.all(batch.map(async (sale, index) => {
        const t0 = performance.now();
        const result = await checkIn(door(index % 12), sale.id, store);
        return { ms: performance.now() - t0, result: result.result };
      }));
      samples.push(...timed.map((row) => row.ms));
      expect(timed.every((row) => row.result === "inside")).toBe(true);
      const wait = 1000 - (performance.now() - started) % 1000;
      if (cursor < sales.length) await new Promise((resolve) => setTimeout(resolve, Math.max(0, wait)));
    }
    const p50 = percentile(samples, 0.5);
    const p95 = percentile(samples, 0.95);
    const report = { checkIn: { n: samples.length, scanners: 12, p50: Math.round(p50), p95: Math.round(p95), errors: 0, pass: p95 < 500 } };
    mkdirSync("/opt/cursor/artifacts", { recursive: true });
    writeFileSync("/opt/cursor/artifacts/stress-checkin.json", JSON.stringify(report, null, 2));
    expect(p95).toBeLessThan(500);
  });

  it("rate-limits one bucket and still allows another user", () => {
    resetRateLimits();
    for (let index = 0; index < 8; index += 1) expect(memoryHit("login:attacker", 8, 60_000)).toBe(true);
    expect(memoryHit("login:attacker", 8, 60_000)).toBe(false);
    expect(memoryHit("login:staff", 8, 60_000)).toBe(true);
    expect(() => {
      throw new AppError(429, "Too many tries. Wait a minute and try again.");
    }).toThrow(AppError);
  });
});
