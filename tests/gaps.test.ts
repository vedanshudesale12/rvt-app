import { describe, expect, it } from "vitest";

process.env.RVT_DEMO = "1";
process.env.NODE_ENV = "test";

import ids from "../supabase/seed-ids.json";
import { canReadEvent } from "@/domain/access";
import { presentLedger } from "@/domain/present";
import { reviewCompSchema } from "@/domain/schemas";
import { cleanText } from "@/domain/text";
import type { Actor } from "@/domain/types";
import { dashboard, doorSearch, guestList, leaderboard, logSale, reviewSale, saveEvent } from "@/server/ops";
import { demoAssignments, demoEvents, demoExpenses, demoPhones, demoProfiles, demoSales, demoTickets } from "@/server/store/demo";
import { createMemoryStore } from "@/server/store/memory";

function actor(id: string): Actor {
  const profile = demoProfiles().find((row) => row.id === id);
  if (!profile?.role) throw new Error("missing");
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

describe("collab logging", () => {
  it("lets a collab partner add a guest on their side only", async () => {
    const store = memory();
    const saved = await logSale(actor(ids.northline), {
      eventId: ids.eventCollab,
      guestName: "Collab Guest",
      phone: "9988776655",
      ticketTypeId: ids.ttCollabFemale,
      side: "collab",
      ageConfirmed: true,
    }, store);
    expect(saved.side).toBe("collab");
    expect(saved.promoterName).toBe("Northline");
    expect(saved.prName).toBeUndefined();
    await expect(logSale(actor(ids.northline), {
      eventId: ids.eventCollab,
      guestName: "Stolen",
      phone: "9988776654",
      ticketTypeId: ids.ttCollabFemale,
      side: "rvt",
      prId: ids.aisha,
      ageConfirmed: true,
    }, store)).rejects.toThrow(/own guests/);
    await expect(reviewSale(actor(ids.northline), ids.saleCollabRvt, "rejected", store)).rejects.toThrow(/admin/i);
    const list = await guestList(actor(ids.northline), store, ids.eventCollab);
    expect(JSON.stringify(list)).not.toMatch(/Aisha|Kabir|Meher/);
    expect(list.sales.some((sale) => sale.guestName === "Collab Guest")).toBe(true);
  });

  it("hides another collab partner's guests", async () => {
    const store = memory();
    const profiles = demoProfiles();
    const south = { ...profiles[0], id: "10000000-0000-4000-8000-000000000099", fullName: "Southline", email: "south@rvt.demo", role: "collab_partner" as const, isOwner: false, ownerSlot: null };
    await store.saveProfile(south);
    const event = demoEvents().find((row) => row.id === ids.eventCollab);
    if (!event) throw new Error("event");
    await store.saveEvent({
      ...event,
      collabShares: [
        { brand: "Northline", splitBps: 2000, partnerId: ids.northline },
        { brand: "Southline", splitBps: 2000, partnerId: south.id },
      ],
    });
    const southActor: Actor = {
      id: south.id,
      role: "collab_partner",
      status: "active",
      fullName: "Southline",
      email: south.email,
      isOwner: false,
      ownerSlot: null,
    };
    const tara = (await store.sales()).find((sale) => sale.guestName === "Tara Nair");
    if (tara) await store.saveSale({ ...tara, collabPartnerId: ids.northline });
    await logSale(southActor, {
      eventId: ids.eventCollab,
      guestName: "South Guest",
      phone: "9988776600",
      ticketTypeId: ids.ttCollabFemale,
      side: "collab",
      promoterName: "South Desk",
      ageConfirmed: true,
    }, store);
    const north = await guestList(actor(ids.northline), store, ids.eventCollab);
    expect(north.sales.map((sale) => sale.guestName)).not.toContain("South Guest");
    expect(JSON.stringify(north)).not.toMatch(/South Desk/);
    const southList = await guestList(southActor, store, ids.eventCollab);
    expect(southList.sales.map((sale) => sale.guestName)).toEqual(["South Guest"]);
    expect(JSON.stringify(southList)).not.toMatch(/Aisha|Kabir|Tara|Neel/);
  });
});

describe("ticketing partners on an event", () => {
  it("attaches more than one and they can open the event", async () => {
    const store = memory();
    const district = {
      ...demoProfiles()[0],
      id: "10000000-0000-4000-8000-000000000098",
      fullName: "District Desk",
      email: "district@rvt.demo",
      role: "ticketing_partner" as const,
      isOwner: false,
      ownerSlot: null,
      commissionBps: 500,
    };
    await store.saveProfile(district);
    const event = await saveEvent(actor(ids.vedanshu), {
      name: "Two desks",
      eventDate: "2026-12-20",
      venue: "Camp",
      time: "21:00",
      status: "published",
      prCommissionRupees: 200,
      barRevenueRupees: 0,
      barSplitPercent: 0,
      isCollab: false,
      collabSplitPercent: 0,
      ticketTypes: [{ name: "Male", priceRupees: 1000 }],
      prIds: [ids.aisha],
      ticketingPartners: [
        { id: ids.boxoffice, flatRupees: 100, percent: null },
        { id: district.id, flatRupees: 50, percent: 5 },
      ],
    }, store);
    const assignments = await store.assignments();
    expect(assignments.filter((row) => row.eventId === event.id && (row.profileId === ids.boxoffice || row.profileId === district.id))).toHaveLength(2);
    const events = await store.events();
    const saved = events.find((row) => row.id === event.id);
    if (!saved) throw new Error("saved");
    const districtActor: Actor = {
      id: district.id,
      role: "ticketing_partner",
      status: "active",
      fullName: district.fullName,
      email: district.email,
      isOwner: false,
      ownerSlot: null,
    };
    expect(canReadEvent(actor(ids.boxoffice), saved, assignments)).toBe(true);
    expect(canReadEvent(districtActor, saved, assignments)).toBe(true);
  });
});

describe("admin collab names and expense notes", () => {
  it("shows collab promoters to admin and hides notes from collab", async () => {
    const home = await dashboard(actor(ids.vedanshu), memory(), ids.eventCollab);
    expect(home.byPr.some((row) => row.name === "Neel Varghese")).toBe(true);
    const board = await leaderboard(actor(ids.vedanshu), memory());
    expect(board.collabRows.some((row) => row.name === "Neel Varghese")).toBe(true);
    const hidden = presentLedger(actor(ids.northline), demoExpenses().map((row) => ({ ...row, eventId: ids.eventCollab })), null);
    expect(hidden.expenses.every((row) => row.description === "")).toBe(true);
    const prBoard = await leaderboard(actor(ids.aisha), memory());
    expect(prBoard.collabRows).toEqual([]);
  });
});

describe("guest text and age", () => {
  it("strips markup from a guest name", async () => {
    expect(cleanText("<script>alert(1)</script>", 80)).toBe("scriptalert(1)/script");
    const saved = await logSale(actor(ids.aisha), {
      eventId: ids.eventFriday,
      guestName: "<img src=x onerror=alert(1)>",
      phone: "9876501234",
      ticketTypeId: ids.ttMale,
      ageConfirmed: true,
    }, memory());
    expect(saved.guestName).not.toMatch(/[<>]/);
    await expect(logSale(actor(ids.aisha), {
      eventId: ids.eventFriday,
      guestName: "No age",
      phone: "9876501235",
      ticketTypeId: ids.ttMale,
      ageConfirmed: undefined as unknown as true,
    }, memory())).rejects.toThrow(/18/);
  });

  it("rejects extra fields on a comp review", () => {
    expect(reviewCompSchema.safeParse({ id: ids.saleRiya, decision: "approved", role: "admin" }).success).toBe(false);
    expect(reviewCompSchema.safeParse({ id: ids.saleRiya, decision: "approved" }).success).toBe(true);
  });
});

describe("door search", () => {
  it("returns a live inside count without scanning every phone", async () => {
    let phones = 0;
    const store = memory();
    const wrapped = new Proxy(store, {
      get(target, prop, receiver) {
        if (prop === "salePhone") {
          return async (id: string) => {
            phones += 1;
            return target.salePhone(id);
          };
        }
        const value = Reflect.get(target, prop, receiver);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const result = await doorSearch(actor(ids.imran), wrapped, ids.eventFriday, "Rohan");
    expect(result.guests.map((row) => row.guestName)).toContain("Rohan Mehta");
    expect(result.checkedIn).toBeGreaterThan(0);
    expect(phones).toBe(0);
  });
});
