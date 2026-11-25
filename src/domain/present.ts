import { canReadSale, canSeePrNames, canSeeProfit } from "@/domain/access";
import { Forbidden } from "@/domain/errors";
import type { Settlement } from "@/domain/settlement";
import type { Actor, EventRow, Expense, Profile, Sale, TicketType } from "@/domain/types";

type Books = Pick<Settlement, "profitPaise" | "ticketRevenuePaise" | "expensesPaise"> | null;

export type PublicSale = {
  id: string;
  eventId: string;
  guestName: string;
  ticketTypeName: string;
  amountPaise?: number;
  status: Sale["status"];
  isComp: boolean;
  compStatus: Sale["compStatus"];
  checkedInAt: string | null;
  phoneLast4: string;
  side: Sale["side"];
  prName?: string;
  promoterName?: string;
  proofPath?: string | null;
  notes?: string;
  collectedBy?: Sale["collectedBy"];
};

function ticketName(sale: Sale, tickets: TicketType[]): string {
  return tickets.find((ticket) => ticket.id === sale.ticketTypeId)?.name ?? "Ticket";
}

function prName(sale: Sale, profiles: Profile[]): string | undefined {
  if (!sale.prId) return undefined;
  return profiles.find((profile) => profile.id === sale.prId)?.fullName;
}

export function presentSale(actor: Actor, sale: Sale, event: EventRow, tickets: TicketType[], profiles: Profile[]): PublicSale {
  if (!canReadSale(actor, sale, event)) throw new Forbidden();
  const showMoney = actor.role !== "door";
  const showPr = canSeePrNames(actor) && sale.side === "rvt";
  return {
    id: sale.id,
    eventId: sale.eventId,
    guestName: sale.guestName,
    ticketTypeName: ticketName(sale, tickets),
    amountPaise: showMoney ? sale.amountPaise : undefined,
    status: sale.status,
    isComp: sale.isComp,
    compStatus: sale.compStatus,
    checkedInAt: sale.checkedInAt,
    phoneLast4: sale.phoneLast4,
    side: sale.side,
    prName: showPr ? prName(sale, profiles) : undefined,
    promoterName: sale.side === "collab" ? sale.promoterName ?? undefined : undefined,
    proofPath: actor.role === "door" ? undefined : sale.proofPath,
    notes: actor.role === "door" ? undefined : sale.notes,
    collectedBy: showMoney ? sale.collectedBy : undefined,
  };
}

export function presentSales(actor: Actor, sales: Sale[], event: EventRow, tickets: TicketType[], profiles: Profile[]): PublicSale[] {
  return sales
    .filter((sale) => sale.eventId === event.id && canReadSale(actor, sale, event))
    .map((sale) => presentSale(actor, sale, event, tickets, profiles));
}

export type RvtTeam = { label: "RVT team"; tickets: number; amountPaise: number };

export function rvtTeamTotal(sales: Sale[], eventId: string): RvtTeam {
  const rows = sales.filter(
    (sale) => sale.eventId === eventId && sale.side === "rvt" && !sale.deletedAt && !sale.isComp && sale.status === "verified",
  );
  return {
    label: "RVT team",
    tickets: rows.length,
    amountPaise: rows.reduce((sum, sale) => sum + sale.amountPaise, 0),
  };
}

export type DashboardView = {
  eventId: string;
  eventName: string;
  cards: {
    guests?: number;
    verified?: number;
    pending?: number;
    comps?: number;
    revenuePaise?: number;
    expensesPaise?: number;
    profitPaise?: number;
  };
  salesOverTime: { date: string; count: number }[];
  byTicket: { name: string; count: number; amountPaise?: number }[];
  byPr: { name: string; count: number; amountPaise?: number }[];
  revenueVsExpenses?: { revenuePaise: number; expensesPaise: number };
  rvtTeam?: RvtTeam;
};

export function presentDashboard(
  actor: Actor,
  event: EventRow,
  sales: Sale[],
  expenses: Expense[],
  tickets: TicketType[],
  profiles: Profile[],
  books: Books = null,
  knownTeam: RvtTeam | null = null,
): DashboardView {
  const visible = sales.filter((sale) => sale.eventId === event.id && !sale.deletedAt && canReadSale(actor, sale, event));
  const expenseRows = expenses.filter((row) => row.eventId === event.id && !row.deletedAt);
  const expenseTotal = expenseRows.reduce((sum, row) => sum + row.amountPaise, 0);
  const verified = visible.filter((sale) => sale.status === "verified" && !sale.isComp);
  const revenue = verified.reduce((sum, sale) => sum + sale.amountPaise, 0);
  const byTicketMap = new Map<string, { name: string; count: number; amountPaise: number }>();
  for (const sale of visible.filter((row) => !row.isComp && row.status !== "rejected")) {
    const name = ticketName(sale, tickets);
    const current = byTicketMap.get(name) ?? { name, count: 0, amountPaise: 0 };
    current.count += 1;
    current.amountPaise += sale.amountPaise;
    byTicketMap.set(name, current);
  }
  const showMoney = actor.role === "admin" || actor.role === "collab_partner" || actor.role === "ticketing_partner";
  const byPr: DashboardView["byPr"] = [];
  if (actor.role === "collab_partner") {
    const collabTeam = knownTeam ?? rvtTeamTotal(sales, event.id);
    byPr.push({ name: collabTeam.label, count: collabTeam.tickets, amountPaise: collabTeam.amountPaise });
    const promoters = new Map<string, { count: number; amountPaise: number }>();
    for (const sale of visible) {
      const name = sale.promoterName || "Collab";
      const current = promoters.get(name) ?? { count: 0, amountPaise: 0 };
      current.count += 1;
      if (sale.status === "verified" && !sale.isComp) current.amountPaise += sale.amountPaise;
      promoters.set(name, current);
    }
    for (const [name, value] of promoters) byPr.push({ name, ...value });
  } else if (canSeePrNames(actor)) {
    const groups = new Map<string, { count: number; amountPaise: number }>();
    for (const sale of visible.filter((row) => row.side === "rvt")) {
      const name = prName(sale, profiles) ?? "Unassigned";
      const current = groups.get(name) ?? { count: 0, amountPaise: 0 };
      current.count += 1;
      if (sale.status === "verified" && !sale.isComp) current.amountPaise += sale.amountPaise;
      groups.set(name, current);
    }
    for (const [name, value] of groups) {
      byPr.push({
        name,
        count: value.count,
        amountPaise: actor.role === "admin" ? value.amountPaise : undefined,
      });
    }
  }
  const days = new Map<string, number>();
  for (const sale of visible) {
    const date = sale.createdAt.slice(0, 10);
    days.set(date, (days.get(date) ?? 0) + 1);
  }
  const team = actor.role === "collab_partner" ? (knownTeam ?? rvtTeamTotal(sales, event.id)) : null;
  const ticketRevenue = books?.ticketRevenuePaise ?? revenue + (team?.amountPaise ?? 0);
  return {
    eventId: event.id,
    eventName: event.name,
    cards: {
      guests: visible.length + (team?.tickets ?? 0),
      verified: verified.length + (team?.tickets ?? 0),
      pending: visible.filter((sale) => sale.status === "pending" && !sale.isComp).length,
      comps: visible.filter((sale) => sale.isComp).length,
      revenuePaise: actor.role === "data_entry" || actor.role === "door" || actor.role === "pr" ? undefined : ticketRevenue,
      expensesPaise: actor.role === "admin" || actor.role === "collab_partner" || actor.role === "data_entry" ? (books?.expensesPaise ?? expenseTotal) : undefined,
      profitPaise: canSeeProfit(actor) ? books?.profitPaise : undefined,
    },
    salesOverTime: [...days.entries()].map(([date, count]) => ({ date, count })),
    byTicket: [...byTicketMap.values()].map((row) => ({
      name: row.name,
      count: row.count,
      amountPaise: showMoney ? row.amountPaise : undefined,
    })),
    byPr,
    revenueVsExpenses:
      actor.role === "admin" || actor.role === "collab_partner"
        ? { revenuePaise: ticketRevenue, expensesPaise: books?.expensesPaise ?? expenseTotal }
        : undefined,
    rvtTeam: team ?? undefined,
  };
}

export function presentLedger(actor: Actor, expenses: Expense[], settlement: Settlement | null) {
  if (actor.role !== "admin" && actor.role !== "data_entry" && actor.role !== "collab_partner") {
    throw new Forbidden();
  }
  const rows = expenses
    .filter((row) => !row.deletedAt)
    .map((row) => ({
      id: row.id,
      category: row.category,
      description: row.description,
      amountPaise: row.amountPaise,
      createdAt: row.createdAt,
    }));
  if (actor.role === "data_entry" || !settlement) {
    return { expenses: rows };
  }
  if (actor.role === "collab_partner") {
    return {
      expenses: rows,
      profitPaise: settlement.profitPaise,
      collabSharePaise: settlement.collabSharePaise,
      collabBrand: settlement.collabBrand,
      ticketRevenuePaise: settlement.ticketRevenuePaise,
      expensesPaise: settlement.expensesPaise,
      prCommissionPaise: settlement.prCommissionPaise,
      rvtSharePaise: settlement.rvtSharePaise,
    };
  }
  return { expenses: rows, ...settlement };
}

export function presentSettlement(actor: Actor, settlement: Settlement) {
  if (actor.role === "admin") return settlement;
  if (actor.role === "pr") {
    return { prLines: settlement.prLines.filter((line) => line.id === actor.id) };
  }
  if (actor.role === "ticketing_partner") {
    return { ticketingLines: settlement.ticketingLines.filter((line) => line.id === actor.id) };
  }
  if (actor.role === "collab_partner") {
    return {
      profitPaise: settlement.profitPaise,
      collabSharePaise: settlement.collabSharePaise,
      collabBrand: settlement.collabBrand,
      ticketRevenuePaise: settlement.ticketRevenuePaise,
      expensesPaise: settlement.expensesPaise,
      prCommissionPaise: settlement.prCommissionPaise,
      ticketingCommissionPaise: settlement.ticketingCommissionPaise,
      barPartnerSharePaise: settlement.barPartnerSharePaise,
      barPartnerName: settlement.barPartnerName,
      rvtSharePaise: settlement.rvtSharePaise,
    };
  }
  throw new Forbidden();
}

export type BoardRow = { name: string; tickets: number; revenuePaise?: number; commissionPaise?: number };

export function presentPrBoard(actor: Actor, rows: BoardRow[]): BoardRow[] {
  if (actor.role === "admin") return rows;
  if (actor.role === "pr") return rows.map(({ name, tickets }) => ({ name, tickets }));
  throw new Forbidden();
}

export function presentTicketingBoard(actor: Actor, rows: BoardRow[]): BoardRow[] {
  if (actor.role === "admin") return rows;
  if (actor.role === "ticketing_partner") return rows.map(({ name, tickets }) => ({ name, tickets }));
  throw new Forbidden();
}
