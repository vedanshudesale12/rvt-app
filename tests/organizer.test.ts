import { describe, expect, it } from "vitest";
import { eventSwitcherLabel, organizerKind, partnerNames } from "@/domain/organizer";
import type { Assignment, EventRow, Profile } from "@/domain/types";

const event = {
  id: "e1",
  name: "test demo",
  eventDate: "2026-12-12",
  isCollab: true,
  collabBrand: "Test Collab",
  collabPartnerId: "c1",
  collabSplitBps: 3000,
  collabShares: [{ brand: "Test Collab", splitBps: 3000, partnerId: "c1" }],
} as EventRow;

const assignments: Assignment[] = [
  { id: "a1", eventId: "e1", profileId: "c1", side: "collab", commissionPaise: null },
  { id: "a2", eventId: "e1", profileId: "t1", side: "rvt", commissionPaise: 10_000, commissionBps: 1000 },
];

const profiles = [
  { id: "c1", fullName: "Test Collab", role: "collab_partner" },
  { id: "t1", fullName: "Test Ticketing Partner", role: "ticketing_partner" },
] as Profile[];

describe("organizer labels", () => {
  it("names the organizer mix and partners for admins", () => {
    expect(organizerKind(event, assignments, profiles)).toBe("RVT + Collab + Ticketing");
    expect(partnerNames(event, assignments, profiles)).toEqual(["Test Collab", "Test Ticketing Partner"]);
    expect(eventSwitcherLabel("test demo", "2026-12-12", "Test Collab")).toBe("test demo · 2026-12-12 · Test Collab");
  });
});
