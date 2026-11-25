import { describe, expect, it } from "vitest";

process.env.RVT_DEMO = "1";
process.env.NODE_ENV = "test";

import { assertDataAdmin, queryTable, tableFor, toCsv, type TableRow } from "@/domain/catalog";
import { Forbidden } from "@/domain/errors";
import type { Actor } from "@/domain/types";
import { dataCsv, dataDump, syncSheets } from "@/server/data";
import { demoAssignments, demoEvents, demoExpenses, demoPhones, demoProfiles, demoSales, demoTickets } from "@/server/store/demo";
import { createMemoryStore } from "@/server/store/memory";
import { sheetsConfigured } from "@/server/sheets";

function admin(): Actor {
  const profile = demoProfiles().find((row) => row.role === "admin");
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

function pr(): Actor {
  const profile = demoProfiles().find((row) => row.role === "pr");
  if (!profile?.role) throw new Error("pr");
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

describe("data catalog", () => {
  it("searches, filters, and sorts without exposing a full phone", () => {
    const rows: TableRow[] = [
      { id: "1", cells: { guest: "Asha", status: "verified", amountPaise: "100" } },
      { id: "2", cells: { guest: "Dev", status: "pending", amountPaise: "50" } },
    ];
    expect(queryTable(rows, { q: "ash" })).toHaveLength(1);
    expect(queryTable(rows, { status: "pending" })[0]?.id).toBe("2");
    expect(queryTable(rows, { sort: "amountPaise", dir: "desc" })[0]?.id).toBe("1");
    const csv = toCsv(rows);
    expect(csv.split("\n")[0]).toBe("guest,status,amountPaise");
    expect(csv).not.toContain("upi");
  });

  it("lets an admin export every table and refuses everyone else", async () => {
    expect(() => assertDataAdmin(pr())).toThrow(Forbidden);
    await expect(dataCsv(pr(), store(), "sales", {})).rejects.toBeInstanceOf(Forbidden);
    const csv = await dataCsv(admin(), store(), "sales", {});
    expect(csv).toContain("guest");
    expect(csv).not.toContain("ciphertext");
    const dump = await dataDump(admin(), store());
    expect(Object.keys(dump).sort()).toEqual(["attendees", "audit", "checkins", "comps", "events", "ledger", "partners", "sales", "settlements", "users"]);
    const users = tableFor("users", {
      profiles: demoProfiles(),
      events: [],
      tickets: [],
      assignments: [],
      sales: [],
      expenses: [],
      audit: [],
    });
    expect(users.some((row) => row.cells.email?.includes("@"))).toBe(true);
    expect(users.every((row) => !row.cells.phone && (row.cells.phoneLast4 ?? "").length <= 4)).toBe(true);
    const memory = store();
    await dataCsv(admin(), memory, "events", {});
    const audit = await memory.audit(20);
    expect(audit.some((row) => row.action === "export")).toBe(true);
  });

  it("does not call Google Sheets unless it is configured", async () => {
    delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    expect(sheetsConfigured()).toBe(false);
    await expect(syncSheets(admin(), store())).rejects.toMatchObject({ status: 503 });
  });
});
