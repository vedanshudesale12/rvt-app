import { describe, expect, it } from "vitest";

process.env.RVT_DEMO = "1";
process.env.NODE_ENV = "test";

import ids from "../supabase/seed-ids.json";
import { AppError } from "@/domain/errors";
import type { Actor } from "@/domain/types";
import { checkIn, logSale } from "@/server/ops";
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

describe("concurrency", () => {
  it("admits a ticket once when two doors scan together", async () => {
    const store = memory();
    const results = await Promise.all(Array.from({ length: 20 }, () => checkIn(admin(), ids.saleRohan, store)));
    expect(results.filter((row) => row.result === "inside")).toHaveLength(1);
    expect(results.filter((row) => row.result === "already_inside")).toHaveLength(19);
  });

  it("does not sell the last seat twice", async () => {
    const store = memory();
    const eventId = "20000000-0000-4000-8000-000000000099";
    const ticketId = "30000000-0000-4000-8000-000000000099";
    const event = demoEvents().find((row) => row.id === ids.eventFriday);
    const ticket = demoTickets().find((row) => row.eventId === ids.eventFriday);
    if (!event || !ticket) throw new Error("seed");
    await store.saveEvent({ ...event, id: eventId, name: "Last seat", capacity: 1, waitlistCount: 0, status: "published" });
    await store.saveTickets(eventId, [{ ...ticket, id: ticketId, eventId }]);
    await store.saveAssignments(eventId, [{ id: "staff-cap", eventId, profileId: ids.aisha, side: "rvt", commissionPaise: null }]);
    const results = await Promise.allSettled(Array.from({ length: 20 }, (_, index) => logSale(admin(), {
      eventId,
      guestName: `Seat ${index}`,
      phone: `90000000${String(index).padStart(2, "0")}`,
      ticketTypeId: ticketId,
      prId: ids.aisha,
      notes: "",
      ageConfirmed: true as const,
    }, store)));
    const saved = results.filter((row) => row.status === "fulfilled");
    const refused = results.filter((row) => row.status === "rejected");
    expect(saved).toHaveLength(1);
    expect(refused).toHaveLength(19);
    for (const row of refused) {
      expect((row as PromiseRejectedResult).reason).toBeInstanceOf(AppError);
      expect((row as PromiseRejectedResult).reason.status).toBe(409);
    }
    const updated = (await store.events()).find((row) => row.id === eventId);
    expect(updated?.waitlistCount).toBe(19);
    const sales = (await store.sales()).filter((row) => row.eventId === eventId);
    expect(sales).toHaveLength(1);
  });

  it("checks in under 500ms at a door rush", async () => {
    const store = memory();
    const base = demoSales().find((row) => row.id === ids.saleRohan);
    if (!base) throw new Error("sale");
    const samples: number[] = [];
    for (let index = 0; index < 40; index += 1) {
      const id = `40000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
      await store.saveSale({ ...base, id, guestName: `Rush ${index}`, checkedInAt: null, checkedInBy: null });
      const started = performance.now();
      const result = await checkIn(admin(), id, store);
      samples.push(performance.now() - started);
      expect(result.result).toBe("inside");
    }
    samples.sort((a, b) => a - b);
    const p50 = samples[Math.floor(samples.length * 0.5)] ?? 0;
    const p95 = samples[Math.floor(samples.length * 0.95)] ?? 0;
    expect(p95).toBeLessThan(500);
    expect(p50).toBeLessThan(500);
  });
});
