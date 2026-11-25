import { describe, expect, it } from "vitest";

process.env.RVT_DEMO = "1";
process.env.NODE_ENV = "test";
import ids from "../supabase/seed-ids.json";
import { evaluateCheckIn, resolveLogger } from "@/domain/access";
import { parseGuestList } from "@/domain/guest-parse";
import { logSaleSchema, signupSchema } from "@/domain/schemas";
import { computeSettlement } from "@/domain/settlement";
import { isAdminCommand } from "@/domain/text";
import type { Actor } from "@/domain/types";
import { chat, checkIn, dashboard, guestList, ledger, logSale, reviewSale, settlementView } from "@/server/ops";
import {
  demoAssignments,
  demoEvents,
  demoExpenses,
  demoPhones,
  demoProfiles,
  demoSales,
  demoTickets,
} from "@/server/store/demo";
import { createMemoryStore } from "@/server/store/memory";

function actor(id: string): Actor {
  const profile = demoProfiles().find((row) => row.id === id);
  if (!profile?.role) throw new Error("missing actor");
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

function store() {
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

describe("PR isolation", () => {
  it("does not return another PR's guests", async () => {
    const list = await guestList(actor(ids.aisha), store(), ids.eventFriday);
    const names = list.sales.map((sale) => sale.guestName);
    expect(names).toContain("Rohan Mehta");
    expect(names).not.toContain("Neha Kulkarni");
    expect(names).not.toContain("Arjun Patel");
    expect(JSON.stringify(list)).not.toContain("Kabir");
  });

  it("refuses a copied sale id and a tampered pr id", async () => {
    await expect(reviewSale(actor(ids.aisha), ids.saleNehaK, "verified", store())).rejects.toThrow(/admin/i);
    expect(() => resolveLogger(actor(ids.aisha), ids.kabir, "rvt")).toThrow(/own guests/);
    const saved = await logSale(
      actor(ids.aisha),
      { eventId: ids.eventFriday, guestName: "New Guest", phone: "9876543210", ticketTypeId: ids.ttMale, ageConfirmed: true as const },
      store(),
    );
    expect(saved.amountPaise).toBe(150000);
    expect(saved.prName).toBe("Aisha Kulkarni");
    expect(saved.status).toBe("pending");
  });
});

describe("collab and data entry views", () => {
  it("shows RVT only as a team total", async () => {
    const list = await guestList(actor(ids.northline), store(), ids.eventCollab);
    const body = JSON.stringify(list);
    expect(list.sales.map((sale) => sale.guestName)).toEqual(["Tara Nair"]);
    expect(list.rvtTeam).toEqual({ label: "RVT team", tickets: 1, amountPaise: 150000 });
    expect(body).not.toMatch(/Aisha|Kabir|Meher/);
    const board = await dashboard(actor(ids.northline), store(), ids.eventCollab);
    expect(JSON.stringify(board)).not.toMatch(/Aisha|Kabir|Meher/);
    expect(board.rvtTeam?.label).toBe("RVT team");
  });

  it("omits profit for data entry", async () => {
    const books = await ledger(actor(ids.neha), store(), ids.eventFriday);
    expect(books.expenses.length).toBeGreaterThan(0);
    expect(books).not.toHaveProperty("profitPaise");
    expect(JSON.stringify(books)).not.toMatch(/profit|vedanshu|rishab/i);
    const home = await dashboard(actor(ids.neha), store(), ids.eventFriday);
    expect(home.cards.profitPaise).toBeUndefined();
    expect(home.cards.revenuePaise).toBeUndefined();
    expect(home.revenueVsExpenses).toBeUndefined();
  });
});

describe("door and comps", () => {
  it("says already inside with the time", async () => {
    const result = await checkIn(actor(ids.imran), ids.saleNehaK, store());
    expect(result).toEqual({ result: "already_inside", checkedInAt: "2026-11-28T16:05:00.000Z" });
  });

  it("does not let a pending comp in", async () => {
    const result = await checkIn(actor(ids.imran), ids.saleRiya, store());
    expect(result).toEqual({ result: "not_approved" });
    const event = demoEvents()[0];
    const sale = demoSales().find((row) => row.id === ids.saleRiya);
    expect(sale && evaluateCheckIn(actor(ids.imran), sale, event, demoAssignments())).toEqual({ result: "not_approved" });
  });
});

describe("settle-up math", () => {
  it("takes the collab split before the 50-50", () => {
    const result = computeSettlement({
      ticketRevenuePaise: 100000,
      expensesPaise: 10000,
      barRevenuePaise: 50000,
      barSplitBps: 4000,
      barPartnerName: "Venue bar",
      prLines: [{ id: "a", name: "Aisha Kulkarni", paidTickets: 2, commissionEachPaise: 5000, collectedPaise: 40000 }],
      ticketingLines: [{ id: "t", name: "Box Office", revenuePaise: 20000, commissionBps: 1000, collectedPaise: 20000 }],
      collab: { brand: "Northline", splitBps: 5000, partnerId: "c" },
    });
    expect(result.profitPaise).toBe(108000);
    expect(result.collabSharePaise).toBe(54000);
    expect(result.rvtSharePaise).toBe(54000);
    expect(result.vedanshuPaise).toBe(27000);
    expect(result.rishabPaise).toBe(27000);
  });

  it("gives the odd paise to Vedanshu and matches the Friday books", async () => {
    const odd = computeSettlement({
      ticketRevenuePaise: 101,
      expensesPaise: 0,
      barRevenuePaise: 0,
      barSplitBps: 0,
      barPartnerName: "",
      prLines: [],
      ticketingLines: [],
      collab: null,
    });
    expect(odd.vedanshuPaise).toBe(51);
    expect(odd.rishabPaise).toBe(50);
    const view = await settlementView(actor(ids.vedanshu), store(), ids.eventFriday);
    expect(view.profitPaise).toBe(645000);
    expect(view.vedanshuPaise).toBe(322500);
    expect(view.prLines?.find((line) => line.name === "Aisha Kulkarni")?.dueToCompanyPaise).toBe(210000);
  });
});

describe("chat and validation", () => {
  it("blocks admin commands for a PR and parses a pasted list", async () => {
    expect(isAdminCommand("approve Rohan")).toBe(true);
    const reply = await chat(actor(ids.aisha), store(), ids.eventFriday, "approve all comps");
    expect(reply).toEqual({ type: "answer", text: "That needs an admin." });
    const preview = await chat(actor(ids.aisha), store(), ids.eventFriday, "Aman Joshi, 9988776655, Male\nLata K, 9876500000, Female");
    expect(preview.type).toBe("preview");
    if (preview.type === "preview") expect(preview.rows).toHaveLength(2);
    const tickets = demoTickets().filter((ticket) => ticket.eventId === ids.eventFriday);
    expect(parseGuestList("Aman Joshi, 9988776655, Male", tickets).rows[0].ticketTypeId).toBe(ids.ttMale);
    const slash = parseGuestList("test one / 45823983498 / pr me", tickets);
    expect(slash.errors).toEqual([]);
    expect(slash.rows[0]?.guestName).toBe("test one");
    expect(slash.rows[0]?.phone.replace(/\D/g, "")).toContain("45823983498");
    const glued = parseGuestList("test one 45823983498pr me", tickets);
    expect(glued.errors).toEqual([]);
    expect(glued.rows[0]?.guestName).toBe("test one");
  });

  it("rejects tampered money, role, and status fields", () => {
    expect(() =>
      logSaleSchema.parse({
        eventId: ids.eventFriday,
        guestName: "Aman",
        phone: "9988776655",
        ticketTypeId: ids.ttMale,
        amountPaise: 1,
        status: "verified",
        role: "admin",
      }),
    ).toThrow();
    expect(() =>
      signupSchema.parse({
        fullName: "A",
        phone: "9988776655",
        email: "a@b.co",
        password: "password1",
        role: "admin",
        agreed: true,
      }),
    ).toThrow();
  });
});
