import { evaluateCheckIn } from "@/domain/access";
import { bpsShare } from "@/domain/money";
import { presentDashboard, presentLedger, presentPrBoard, presentSales, presentSettlement } from "@/domain/present";
import { computeSettlement, settlementFromBooks } from "@/domain/settlement";
import {
  EVENT_KINDS,
  SALES_COMBOS,
  type Actor,
  type Assignment,
  type EventKind,
  type EventRow,
  type Expense,
  type Notice,
  type Profile,
  type Sale,
  type SalesCombo,
  type TicketType,
} from "@/domain/types";

const PR_NAMES = ["Aisha Kulkarni", "Kabir Shah", "Meera Joshi", "Rohit Jain"] as const;
const NORTH_PROMOTER = "Neel Varghese";
const SOUTH_PROMOTER = "Diya Menon";
const COMMISSION = 20_000;

export type SimRow = {
  kind: EventKind;
  combo: SalesCombo;
  event: string;
  sold: number;
  checkedIn: number;
  waitlist: number;
  revenuePaise: number;
  profitPaise: number;
  vedanshuPaise: number;
  rishabPaise: number;
  collabSharePaise: number;
  reconciled: boolean;
  collabSeesPrNames: boolean;
  reason: string;
};

export type SimResult = {
  rows: SimRow[];
  ms: number;
  notices: number;
};

function hasCollab(combo: SalesCombo): boolean {
  return combo === "rvt_collab" || combo === "rvt_collab_ticketing" || combo === "multi_collab" || combo === "collab_hosted";
}

function profile(id: string, fullName: string, role: Profile["role"], commissionBps = 0): Profile {
  return {
    id,
    fullName,
    email: `${id}@sim.demo`,
    role,
    status: "active",
    isOwner: role === "admin",
    ownerSlot: id === "vedanshu" ? "vedanshu" : id === "rishab" ? "rishab" : null,
    commissionBps,
    instagram: "",
    college: "",
    area: "",
    referrer: "",
    photoPath: null,
    phoneLast4: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    deletedAt: null,
  };
}

function actor(profileRow: Profile): Actor {
  return {
    id: profileRow.id,
    role: profileRow.role ?? "pr",
    status: profileRow.status,
    fullName: profileRow.fullName,
    email: profileRow.email,
    isOwner: profileRow.isOwner,
    ownerSlot: profileRow.ownerSlot,
  };
}

function fate(index: number): "verified" | "pending" | "comp_pending" | "comp_ok" | "comp_no" | "rejected" {
  if (index % 23 === 0) return "comp_pending";
  if (index % 29 === 0) return "comp_ok";
  if (index % 31 === 0) return "comp_no";
  if (index % 17 === 0) return "pending";
  if (index % 19 === 0) return "rejected";
  return "verified";
}

export function runMatrix(): SimResult {
  const started = Date.now();
  const profiles = [
    profile("vedanshu", "Vedanshu Desale", "admin"),
    profile("rishab", "Rishab Pawar", "admin"),
    ...PR_NAMES.map((name, index) => profile(`pr-${index}`, name, "pr")),
    profile("box", "Box Office", "ticketing_partner", 1000),
    profile("district", "District Desk", "ticketing_partner", 1000),
    profile("north", "Northline", "collab_partner"),
    profile("south", "Southline", "collab_partner"),
    profile("door", "Door Lead", "door"),
  ];
  const admin = actor(profiles[0]);
  const north = actor(profiles.find((row) => row.id === "north")!);
  const door = actor(profiles.find((row) => row.id === "door")!);
  const prs = profiles.filter((row) => row.role === "pr");
  const rows: SimRow[] = [];
  let notices = 0;
  let eventIndex = 0;

  for (const kind of EVENT_KINDS) {
    for (const combo of SALES_COMBOS) {
      eventIndex += 1;
      const collab = hasCollab(combo);
      const attemptRvt = collab ? 150 : 300;
      const attemptCollab = collab ? 150 : 0;
      const capacity = kind === "sold_out" ? 100 : null;
      const free = kind === "free_rsvp" || kind === "guest_list";
      const shares = !collab
        ? []
        : combo === "multi_collab"
          ? [
              { brand: "Northline", splitBps: 2000, partnerId: "north" },
              { brand: "Southline", splitBps: 1500, partnerId: "south" },
            ]
          : combo === "collab_hosted"
            ? [{ brand: "Northline", splitBps: 7000, partnerId: "north" }]
            : [{ brand: "Northline", splitBps: 3000, partnerId: "north" }];
      const bar = combo === "venue_bar" || kind === "venue_partner";
      const event: EventRow = {
        id: `event-${eventIndex}`,
        name: `${kind} · ${combo}`,
        eventDate: "2026-12-01",
        venue: "Sim hall",
        startsAt: "2026-12-01T14:30:00.000Z",
        status: "published",
        prCommissionPaise: COMMISSION,
        barRevenuePaise: bar ? 2_000_000 : 0,
        barSplitBps: bar ? 4000 : 0,
        barPartnerName: bar ? "House bar" : "",
        isCollab: collab,
        collabBrand: shares.map((share) => share.brand).join(" + "),
        collabPartnerId: collab ? "north" : null,
        collabSplitBps: shares.reduce((sum, share) => sum + share.splitBps, 0),
        collabShares: shares,
        settledAt: null,
        createdBy: "vedanshu",
        deletedAt: null,
        kind,
        capacity,
        minAge: 18,
        alcohol: true,
        guardianRequired: false,
        waitlistCount: 0,
        postponedTo: kind === "postponed" ? "2027-01-15" : null,
      };
      const ticketDefs = free
        ? [{ name: kind === "guest_list" ? "Guest list" : "RSVP", price: 0 }]
        : [
            { name: "Female", price: 100_000 },
            { name: "Stag", price: 150_000 },
            { name: "Couple", price: 200_000 },
            { name: "Early bird", price: 80_000 },
            { name: "VIP table", price: 500_000 },
            ...(kind === "multiday_festival" ? [{ name: "Day pass", price: 120_000 }] : []),
          ];
      const tickets: TicketType[] = ticketDefs.map((ticket, index) => ({
        id: `ticket-${eventIndex}-${index}`,
        eventId: event.id,
        name: ticket.name,
        pricePaise: ticket.price,
        sortOrder: index,
      }));
      const assignments: Assignment[] = prs.map((pr, index) => ({
        id: `staff-${eventIndex}-${index}`,
        eventId: event.id,
        profileId: pr.id,
        side: "rvt",
        commissionPaise: null,
      }));
      const sales: Sale[] = [];
      const planned = attemptRvt + attemptCollab;
      let rvtMade = 0;
      let collabMade = 0;
      for (let index = 0; index < planned; index += 1) {
        if (capacity != null && sales.length >= capacity) break;
        const side: "rvt" | "collab" = !collab
          ? "rvt"
          : rvtMade >= attemptRvt
            ? "collab"
            : collabMade >= attemptCollab
              ? "rvt"
              : index % 2 === 0
                ? "rvt"
                : "collab";
        if (side === "rvt") rvtMade += 1;
        else collabMade += 1;
        const ticket = tickets[index % tickets.length];
        const outcome = fate(index);
        const partnerId = side === "collab" ? (combo === "multi_collab" && index % 2 === 0 ? "south" : "north") : null;
        const ticketing = side === "rvt" && (combo === "ticketing_only" || combo === "multi_ticketing" || combo === "rvt_ticketing" || combo === "rvt_collab_ticketing")
          && (combo === "ticketing_only" || combo === "multi_ticketing" || index % 3 === 0);
        const pr = side === "rvt" && combo !== "ticketing_only" ? prs[index % prs.length] : null;
        const isComp = outcome === "comp_pending" || outcome === "comp_ok" || outcome === "comp_no";
        let status: Sale["status"] = "verified";
        let compStatus: Sale["compStatus"] = null;
        if (outcome === "pending") status = "pending";
        if (outcome === "rejected") status = "rejected";
        if (outcome === "comp_pending") {
          status = "pending";
          compStatus = "pending";
        }
        if (outcome === "comp_ok") {
          status = "verified";
          compStatus = "approved";
        }
        if (outcome === "comp_no") {
          status = "rejected";
          compStatus = "rejected";
        }
        if (!isComp && status === "verified" && index % 41 === 0 && kind !== "cancelled") status = "refunded";
        const eligible = status === "verified" && (compStatus === null || compStatus === "approved");
        const checked = eligible && index % 5 !== 0;
        sales.push({
          id: `sale-${eventIndex}-${index}`,
          eventId: event.id,
          prId: pr?.id ?? null,
          promoterName: side === "collab" ? (partnerId === "south" ? SOUTH_PROMOTER : NORTH_PROMOTER) : null,
          side,
          guestName: index % 40 === 0 ? "Aarav Duplicate" : `Guest ${index}`,
          ticketTypeId: ticket.id,
          amountPaise: isComp ? 0 : ticket.pricePaise,
          status,
          isComp,
          compStatus,
          collectedBy: ticketing ? "ticketing_partner" : side === "collab" || isComp ? "company" : "pr",
          ticketingPartnerId: ticketing ? (index % 2 === 0 ? "box" : "district") : null,
          loggedBy: "vedanshu",
          proofPath: null,
          checkedInAt: checked ? "2026-12-01T16:00:00.000Z" : null,
          checkedInBy: checked ? "door" : null,
          source: "manual",
          notes: "18+",
          phoneLast4: index % 37 === 0 ? "1111" : String(1000 + (index % 9000)),
          createdAt: "2026-12-01T10:00:00.000Z",
          deletedAt: null,
          paymentMethod: free ? "rsvp" : ticketing ? "partner" : index % 2 === 0 ? "upi" : "cash",
          checkInCode: `QR-${eventIndex}-${index}`,
          collabPartnerId: partnerId,
        });
      }
      event.waitlistCount = planned - sales.length;
      if (kind === "cancelled") {
        for (const sale of sales) {
          if (sale.status !== "rejected") {
            sale.status = "refunded";
            sale.checkedInAt = null;
            sale.checkedInBy = null;
          }
        }
      }
      const expenses: Expense[] = [{
        id: `expense-${eventIndex}`,
        eventId: event.id,
        category: "Venue",
        description: "Hall",
        amountPaise: free ? 50_000 : 800_000,
        createdBy: "vedanshu",
        receiptPath: null,
        createdAt: "2026-12-01T09:00:00.000Z",
        deletedAt: null,
      }];
      const eventNotices: Notice[] = prs.map((pr, index) => ({
        id: `notice-${eventIndex}-${index}`,
        userId: pr.id,
        eventId: event.id,
        title: event.name,
        body: "You're on this event.",
        readAt: null,
        createdAt: "2026-12-01T08:00:00.000Z",
      }));
      notices += eventNotices.length;

      const settlement = computeSettlement(settlementFromBooks(event, sales, expenses, profiles, assignments));
      const reason = check(event, sales, expenses, profiles, assignments, settlement, admin, north, door);
      rows.push({
        kind,
        combo,
        event: event.name,
        sold: sales.length,
        checkedIn: sales.filter((sale) => sale.checkedInAt).length,
        waitlist: event.waitlistCount ?? 0,
        revenuePaise: settlement.ticketRevenuePaise,
        profitPaise: settlement.profitPaise,
        vedanshuPaise: settlement.vedanshuPaise,
        rishabPaise: settlement.rishabPaise,
        collabSharePaise: settlement.collabSharePaise,
        reconciled: reason === "",
        collabSeesPrNames: reason.includes("pr name"),
        reason,
      });
    }
  }

  return { rows, ms: Date.now() - started, notices };
}

function paid(sale: Sale): boolean {
  return !sale.deletedAt && !sale.isComp && sale.status === "verified";
}

function check(
  event: EventRow,
  sales: Sale[],
  expenses: Expense[],
  profiles: Profile[],
  assignments: Assignment[],
  settlement: ReturnType<typeof computeSettlement>,
  admin: Actor,
  north: Actor,
  door: Actor,
): string {
  const revenue = sales.filter(paid).reduce((sum, sale) => sum + sale.amountPaise, 0);
  if (settlement.ticketRevenuePaise !== revenue) return "revenue";
  const expenseTotal = expenses.filter((row) => !row.deletedAt).reduce((sum, row) => sum + row.amountPaise, 0);
  if (settlement.expensesPaise !== expenseTotal) return "expenses";
  const barShare = bpsShare(event.barRevenuePaise, event.barSplitBps);
  if (settlement.barPartnerSharePaise !== barShare) return "bar";
  const prCounts = new Map<string, { paid: number; collected: number }>();
  for (const sale of sales) {
    if (sale.side !== "rvt" || !sale.prId || !paid(sale)) continue;
    const current = prCounts.get(sale.prId) ?? { paid: 0, collected: 0 };
    current.paid += 1;
    if (sale.collectedBy === "pr") current.collected += sale.amountPaise;
    prCounts.set(sale.prId, current);
  }
  const prCommission = [...prCounts.values()].reduce((sum, row) => sum + row.paid * COMMISSION, 0);
  if (settlement.prCommissionPaise !== prCommission) return "pr commission";
  const partnerRevenue = new Map<string, { amount: number; tickets: number }>();
  for (const sale of sales.filter(paid)) {
    if (!sale.ticketingPartnerId) continue;
    const current = partnerRevenue.get(sale.ticketingPartnerId) ?? { amount: 0, tickets: 0 };
    current.amount += sale.amountPaise;
    current.tickets += 1;
    partnerRevenue.set(sale.ticketingPartnerId, current);
  }
  const ticketingCommission = [...partnerRevenue.values()].reduce(
    (sum, row) => sum + row.tickets * 10_000 + bpsShare(row.amount, 1000),
    0,
  );
  if (settlement.ticketingCommissionPaise !== ticketingCommission) return "ticketing";
  const profit = revenue + (event.barRevenuePaise - barShare) - expenseTotal - prCommission - ticketingCommission;
  if (settlement.profitPaise !== profit) return "profit";
  const expectedCollab = (event.collabShares ?? []).reduce((sum, share) => sum + bpsShare(profit, share.splitBps), 0);
  if (settlement.collabSharePaise !== expectedCollab) return "collab bps";
  if (settlement.rvtSharePaise + settlement.collabSharePaise !== settlement.profitPaise) return "remainder";
  if (settlement.vedanshuPaise + settlement.rishabPaise !== settlement.rvtSharePaise) return "owners";
  if (Math.abs(settlement.vedanshuPaise - settlement.rishabPaise) > 1) return "50-50";
  if (event.capacity != null && sales.length > event.capacity) return "oversold";
  if (event.kind === "sold_out" && (sales.length !== 100 || (event.waitlistCount ?? 0) <= 0)) return "waitlist";
  if (event.kind === "cancelled" && settlement.ticketRevenuePaise !== 0) return "refund";
  if ((event.kind === "free_rsvp" || event.kind === "guest_list") && settlement.ticketRevenuePaise !== 0) return "free";
  if (event.minAge !== 18) return "age";
  if (event.kind === "postponed" && event.postponedTo !== "2027-01-15") return "postponed";
  const duplicateNames = sales.filter((sale) => sale.guestName === "Aarav Duplicate").length;
  if (duplicateNames < 2) return "duplicate name";
  if (sales.filter((sale) => sale.phoneLast4 === "1111").length < 2) return "duplicate phone";
  const inside = sales.find((sale) => sale.checkedInAt);
  if (inside && evaluateCheckIn(door, inside, event, assignments).result !== "already_inside") return "duplicate scan";
  if (sales.some((sale) => sale.checkInCode === "BAD-QR")) return "invalid code";
  const refunded = sales.find((sale) => sale.status === "refunded");
  if (refunded) {
    let threw = false;
    try {
      evaluateCheckIn(door, refunded, event, assignments);
    } catch {
      threw = true;
    }
    if (!threw) return "refunded entered";
  }
  const ranked = [...prCounts.entries()].sort((a, b) => b[1].paid - a[1].paid);
  const board = presentPrBoard(admin, ranked.map(([id, value]) => ({
    name: profiles.find((row) => row.id === id)?.fullName ?? id,
    tickets: value.paid,
  })));
  for (let index = 1; index < board.length; index += 1) {
    if (board[index].tickets > board[index - 1].tickets) return "leaderboard";
  }
  const dash = presentDashboard(admin, event, sales, expenses, [], profiles);
  if (sales.length > 0 && (dash.byTicket.length === 0 || dash.salesOverTime.length === 0)) return "charts";
  if (event.isCollab) {
    const view = {
      sales: presentSales(north, sales, event, [], profiles),
      dash: presentDashboard(north, event, sales, expenses, [], profiles),
      settle: presentSettlement(north, settlement),
      ledger: presentLedger(north, expenses, settlement),
    };
    const blob = JSON.stringify(view);
    if (PR_NAMES.some((name) => blob.includes(name))) return "pr name";
    if (event.collabShares?.some((share) => share.partnerId === "south") && blob.includes(SOUTH_PROMOTER)) return "other collab";
    const adminSales = presentSales(admin, sales, event, [], profiles);
    if (!adminSales.some((sale) => sale.promoterName === NORTH_PROMOTER)) return "admin promoter";
    let blocked = false;
    try {
      presentPrBoard(north, board);
    } catch {
      blocked = true;
    }
    if (!blocked) return "collab board";
  }
  return "";
}

export function summaryMarkdown(result: SimResult): string {
  const header = "| Kind | Combo | Sold | In | Waitlist | Revenue ₹ | Profit ₹ | Vedanshu ₹ | Rishab ₹ | Collab ₹ | OK |";
  const line = "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |";
  const rupee = (paise: number) => (paise / 100).toFixed(2);
  const body = result.rows.map((row) =>
    `| ${row.kind} | ${row.combo} | ${row.sold} | ${row.checkedIn} | ${row.waitlist} | ${rupee(row.revenuePaise)} | ${rupee(row.profitPaise)} | ${rupee(row.vedanshuPaise)} | ${rupee(row.rishabPaise)} | ${rupee(row.collabSharePaise)} | ${row.reconciled ? "pass" : row.reason} |`,
  );
  return [header, line, ...body, "", `Events ${result.rows.length}. Notices ${result.notices}. Built in ${result.ms} ms.`].join("\n");
}
