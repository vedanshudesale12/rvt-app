import ids from "../../../supabase/seed-ids.json";
import type { Assignment, EventRow, Expense, Profile, Sale, TicketType } from "@/domain/types";

export const DEMO_PASSWORD = "demo-pass-123";

const now = "2026-11-20T12:00:00.000Z";

function profile(partial: Profile): Profile {
  return partial;
}

export function demoProfiles(): Profile[] {
  return [
    profile({ id: ids.vedanshu, fullName: "Vedanshu", email: "vedanshu@rvt.demo", role: "admin", status: "active", isOwner: true, ownerSlot: "vedanshu", commissionBps: 0, instagram: "vedanshu", college: "", area: "Koregaon Park", referrer: "", photoPath: null, phoneLast4: "1001", createdAt: now, deletedAt: null }),
    profile({ id: ids.rishab, fullName: "Rishab Pawar", email: "rishab@rvt.demo", role: "admin", status: "active", isOwner: true, ownerSlot: "rishab", commissionBps: 0, instagram: "rishab", college: "", area: "Kalyani Nagar", referrer: "", photoPath: null, phoneLast4: "1002", createdAt: now, deletedAt: null }),
    profile({ id: ids.aisha, fullName: "Aisha Kulkarni", email: "aisha@rvt.demo", role: "pr", status: "active", isOwner: false, ownerSlot: null, commissionBps: 0, instagram: "aisha.plans", college: "Fergusson", area: "Deccan", referrer: "Vedanshu", photoPath: null, phoneLast4: "1111", createdAt: now, deletedAt: null }),
    profile({ id: ids.kabir, fullName: "Kabir Shah", email: "kabir@rvt.demo", role: "pr", status: "active", isOwner: false, ownerSlot: null, commissionBps: 0, instagram: "kabir.out", college: "Symbiosis", area: "Viman Nagar", referrer: "Aisha", photoPath: null, phoneLast4: "2222", createdAt: now, deletedAt: null }),
    profile({ id: ids.neha, fullName: "Neha Deshpande", email: "neha@rvt.demo", role: "data_entry", status: "active", isOwner: false, ownerSlot: null, commissionBps: 0, instagram: "", college: "", area: "Camp", referrer: "", photoPath: null, phoneLast4: "3333", createdAt: now, deletedAt: null }),
    profile({ id: ids.imran, fullName: "Imran Shaikh", email: "imran@rvt.demo", role: "door", status: "active", isOwner: false, ownerSlot: null, commissionBps: 0, instagram: "", college: "", area: "Camp", referrer: "", photoPath: null, phoneLast4: "4444", createdAt: now, deletedAt: null }),
    profile({ id: ids.boxoffice, fullName: "Box Office", email: "boxoffice@rvt.demo", role: "ticketing_partner", status: "active", isOwner: false, ownerSlot: null, commissionBps: 1000, instagram: "boxoffice.pune", college: "", area: "FC Road", referrer: "", photoPath: null, phoneLast4: "5555", createdAt: now, deletedAt: null }),
    profile({ id: ids.northline, fullName: "Northline", email: "northline@rvt.demo", role: "collab_partner", status: "active", isOwner: false, ownerSlot: null, commissionBps: 0, instagram: "northline", college: "", area: "Baner", referrer: "", photoPath: null, phoneLast4: "6666", createdAt: now, deletedAt: null }),
  ];
}

export function demoEvents(): EventRow[] {
  return [
    {
      id: ids.eventFriday,
      name: "Warehouse Friday",
      eventDate: "2026-11-28",
      venue: "The Warehouse, Kalyani Nagar",
      startsAt: "2026-11-28T15:30:00.000Z",
      status: "published",
      prCommissionPaise: 20000,
      barRevenuePaise: 2_000_000,
      barSplitBps: 4000,
      barPartnerName: "Venue bar",
      isCollab: false,
      collabBrand: "",
      collabPartnerId: null,
      collabSplitBps: 0,
      settledAt: null,
      createdBy: ids.vedanshu,
      deletedAt: null,
    },
    {
      id: ids.eventCollab,
      name: "RVT x Northline",
      eventDate: "2026-12-12",
      venue: "Northline, Baner",
      startsAt: "2026-12-12T15:30:00.000Z",
      status: "published",
      prCommissionPaise: 15000,
      barRevenuePaise: 0,
      barSplitBps: 0,
      barPartnerName: "",
      isCollab: true,
      collabBrand: "Northline",
      collabPartnerId: ids.northline,
      collabSplitBps: 4000,
      settledAt: null,
      createdBy: ids.vedanshu,
      deletedAt: null,
    },
    {
      id: ids.eventPast,
      name: "October Basement",
      eventDate: "2026-10-17",
      venue: "Basement, FC Road",
      startsAt: "2026-10-17T15:30:00.000Z",
      status: "settled",
      prCommissionPaise: 15000,
      barRevenuePaise: 1_000_000,
      barSplitBps: 5000,
      barPartnerName: "Basement bar",
      isCollab: false,
      collabBrand: "",
      collabPartnerId: null,
      collabSplitBps: 0,
      settledAt: "2026-10-18T06:00:00.000Z",
      createdBy: ids.vedanshu,
      deletedAt: null,
    },
  ];
}

export function demoTickets(): TicketType[] {
  return [
    { id: ids.ttMale, eventId: ids.eventFriday, name: "Male", pricePaise: 150000, sortOrder: 1 },
    { id: ids.ttFemale, eventId: ids.eventFriday, name: "Female", pricePaise: 100000, sortOrder: 2 },
    { id: ids.ttCouple, eventId: ids.eventFriday, name: "Couple", pricePaise: 200000, sortOrder: 3 },
    { id: ids.ttCollabMale, eventId: ids.eventCollab, name: "Male", pricePaise: 150000, sortOrder: 1 },
    { id: ids.ttCollabFemale, eventId: ids.eventCollab, name: "Female", pricePaise: 100000, sortOrder: 2 },
    { id: ids.ttPastMale, eventId: ids.eventPast, name: "Male", pricePaise: 120000, sortOrder: 1 },
  ];
}

export function demoAssignments(): Assignment[] {
  const rows: Assignment[] = [
    { id: "61000000-0000-4000-8000-000000000001", eventId: ids.eventFriday, profileId: ids.aisha, side: "rvt", commissionPaise: null },
    { id: "61000000-0000-4000-8000-000000000002", eventId: ids.eventFriday, profileId: ids.kabir, side: "rvt", commissionPaise: null },
    { id: "61000000-0000-4000-8000-000000000003", eventId: ids.eventFriday, profileId: ids.boxoffice, side: "rvt", commissionPaise: null },
    { id: "61000000-0000-4000-8000-000000000004", eventId: ids.eventCollab, profileId: ids.aisha, side: "rvt", commissionPaise: null },
    { id: "61000000-0000-4000-8000-000000000005", eventId: ids.eventPast, profileId: ids.aisha, side: "rvt", commissionPaise: null },
    { id: "61000000-0000-4000-8000-000000000006", eventId: ids.eventPast, profileId: ids.kabir, side: "rvt", commissionPaise: null },
  ];
  return rows;
}

function sale(partial: Sale): Sale {
  return partial;
}

export function demoSales(): Sale[] {
  return [
    sale({ id: ids.saleRohan, eventId: ids.eventFriday, prId: ids.aisha, promoterName: null, side: "rvt", guestName: "Rohan Mehta", ticketTypeId: ids.ttMale, amountPaise: 150000, status: "verified", isComp: false, compStatus: null, collectedBy: "pr", ticketingPartnerId: null, loggedBy: ids.aisha, proofPath: null, checkedInAt: null, checkedInBy: null, source: "manual", notes: "", phoneLast4: "9001", createdAt: "2026-11-21T08:00:00.000Z", deletedAt: null }),
    sale({ id: ids.saleSara, eventId: ids.eventFriday, prId: ids.aisha, promoterName: null, side: "rvt", guestName: "Sara Iqbal", ticketTypeId: ids.ttFemale, amountPaise: 100000, status: "verified", isComp: false, compStatus: null, collectedBy: "pr", ticketingPartnerId: null, loggedBy: ids.aisha, proofPath: null, checkedInAt: null, checkedInBy: null, source: "manual", notes: "", phoneLast4: "9002", createdAt: "2026-11-21T09:00:00.000Z", deletedAt: null }),
    sale({ id: ids.saleDev, eventId: ids.eventFriday, prId: ids.aisha, promoterName: null, side: "rvt", guestName: "Dev Sharma", ticketTypeId: ids.ttMale, amountPaise: 150000, status: "pending", isComp: false, compStatus: null, collectedBy: "pr", ticketingPartnerId: null, loggedBy: ids.aisha, proofPath: null, checkedInAt: null, checkedInBy: null, source: "manual", notes: "", phoneLast4: "9003", createdAt: "2026-11-22T08:00:00.000Z", deletedAt: null }),
    sale({ id: ids.saleRiya, eventId: ids.eventFriday, prId: ids.aisha, promoterName: null, side: "rvt", guestName: "Riya Sen", ticketTypeId: ids.ttFemale, amountPaise: 0, status: "pending", isComp: true, compStatus: "pending", collectedBy: "company", ticketingPartnerId: null, loggedBy: ids.aisha, proofPath: null, checkedInAt: null, checkedInBy: null, source: "manual", notes: "College fest contact", phoneLast4: "9004", createdAt: "2026-11-22T10:00:00.000Z", deletedAt: null }),
    sale({ id: ids.saleNehaK, eventId: ids.eventFriday, prId: ids.kabir, promoterName: null, side: "rvt", guestName: "Neha Kulkarni", ticketTypeId: ids.ttFemale, amountPaise: 100000, status: "verified", isComp: false, compStatus: null, collectedBy: "pr", ticketingPartnerId: null, loggedBy: ids.kabir, proofPath: null, checkedInAt: "2026-11-28T16:05:00.000Z", checkedInBy: ids.imran, source: "manual", notes: "", phoneLast4: "9005", createdAt: "2026-11-21T11:00:00.000Z", deletedAt: null }),
    sale({ id: ids.saleArjun, eventId: ids.eventFriday, prId: ids.kabir, promoterName: null, side: "rvt", guestName: "Arjun Patel", ticketTypeId: ids.ttMale, amountPaise: 150000, status: "verified", isComp: false, compStatus: null, collectedBy: "ticketing_partner", ticketingPartnerId: ids.boxoffice, loggedBy: ids.neha, proofPath: null, checkedInAt: null, checkedInBy: null, source: "manual", notes: "", phoneLast4: "9006", createdAt: "2026-11-23T08:00:00.000Z", deletedAt: null }),
    sale({ id: ids.saleCollabRvt, eventId: ids.eventCollab, prId: ids.aisha, promoterName: null, side: "rvt", guestName: "Meher Joshi", ticketTypeId: ids.ttCollabMale, amountPaise: 150000, status: "verified", isComp: false, compStatus: null, collectedBy: "pr", ticketingPartnerId: null, loggedBy: ids.aisha, proofPath: null, checkedInAt: null, checkedInBy: null, source: "manual", notes: "", phoneLast4: "8001", createdAt: "2026-11-24T08:00:00.000Z", deletedAt: null }),
    sale({ id: ids.saleCollabSide, eventId: ids.eventCollab, prId: null, promoterName: "Neel Varghese", side: "collab", guestName: "Tara Nair", ticketTypeId: ids.ttCollabFemale, amountPaise: 100000, status: "verified", isComp: false, compStatus: null, collectedBy: "company", ticketingPartnerId: null, loggedBy: ids.vedanshu, proofPath: null, checkedInAt: null, checkedInBy: null, source: "manual", notes: "", phoneLast4: "8002", createdAt: "2026-11-24T09:00:00.000Z", deletedAt: null }),
  ];
}

export function demoExpenses(): Expense[] {
  return [
    { id: ids.expenseSound, eventId: ids.eventFriday, category: "Sound", description: "DJ and sound hire", amountPaise: 800000, createdBy: ids.vedanshu, receiptPath: null, createdAt: now, deletedAt: null },
    { id: ids.expensePrint, eventId: ids.eventFriday, category: "Print", description: "Wristbands and cards", amountPaise: 150000, createdBy: ids.neha, receiptPath: null, createdAt: now, deletedAt: null },
  ];
}

export function demoPhones(): Record<string, string> {
  return {
    [ids.saleRohan]: "919800000001",
    [ids.saleSara]: "919800000002",
    [ids.saleDev]: "919800000003",
    [ids.saleRiya]: "919800000004",
    [ids.saleNehaK]: "919800000005",
    [ids.saleArjun]: "919800000006",
    [ids.saleCollabRvt]: "919800000007",
    [ids.saleCollabSide]: "919800000008",
  };
}

export function demoPasswords(): Record<string, string> {
  return Object.fromEntries(demoProfiles().map((profile) => [profile.email, DEMO_PASSWORD]));
}
