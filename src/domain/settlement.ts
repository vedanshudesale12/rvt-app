import { bpsShare } from "@/domain/money";
import type { Assignment, EventRow, Expense, Profile, Sale } from "@/domain/types";

export type PrLine = {
  id: string;
  name: string;
  paidTickets: number;
  commissionEachPaise: number;
  collectedPaise: number;
};

export type TicketingLine = {
  id: string;
  name: string;
  revenuePaise: number;
  commissionBps: number;
  collectedPaise: number;
};

export type SettlementInput = {
  ticketRevenuePaise: number;
  expensesPaise: number;
  barRevenuePaise: number;
  barSplitBps: number;
  barPartnerName: string;
  prLines: PrLine[];
  ticketingLines: TicketingLine[];
  collab: { brand: string; splitBps: number; partnerId: string | null } | null;
};

export type SettlementLine = {
  id: string;
  name: string;
  commissionPaise: number;
  collectedPaise: number;
  dueToCompanyPaise: number;
};

export type Settlement = {
  ticketRevenuePaise: number;
  barRevenuePaise: number;
  barPartnerSharePaise: number;
  barRetainedPaise: number;
  barPartnerName: string;
  expensesPaise: number;
  prCommissionPaise: number;
  ticketingCommissionPaise: number;
  profitPaise: number;
  collabSharePaise: number;
  collabBrand: string | null;
  rvtSharePaise: number;
  vedanshuPaise: number;
  rishabPaise: number;
  prLines: SettlementLine[];
  ticketingLines: SettlementLine[];
};

function paid(sale: Sale): boolean {
  return !sale.deletedAt && !sale.isComp && sale.status === "verified";
}

export function settlementFromBooks(
  event: EventRow,
  sales: Sale[],
  expenses: Expense[],
  profiles: Profile[],
  assignments: Assignment[],
): SettlementInput {
  const nameOf = (id: string) => profiles.find((profile) => profile.id === id)?.fullName ?? "Unknown";
  const commissionFor = (prId: string) => {
    const assigned = assignments.find((row) => row.eventId === event.id && row.profileId === prId);
    return assigned?.commissionPaise ?? event.prCommissionPaise;
  };
  const eventSales = sales.filter((sale) => sale.eventId === event.id);
  const prIds = new Set(
    eventSales.filter((sale) => sale.side === "rvt" && sale.prId).map((sale) => sale.prId as string),
  );
  const prLines: PrLine[] = [...prIds].map((id) => {
    const mine = eventSales.filter((sale) => sale.prId === id && sale.side === "rvt");
    const paidRows = mine.filter(paid);
    return {
      id,
      name: nameOf(id),
      paidTickets: paidRows.length,
      commissionEachPaise: commissionFor(id),
      collectedPaise: paidRows
        .filter((sale) => sale.collectedBy === "pr")
        .reduce((sum, sale) => sum + sale.amountPaise, 0),
    };
  });
  const partnerIds = new Set(
    eventSales.filter((sale) => sale.ticketingPartnerId).map((sale) => sale.ticketingPartnerId as string),
  );
  const ticketingLines: TicketingLine[] = [...partnerIds].map((id) => {
    const profile = profiles.find((row) => row.id === id);
    const mine = eventSales.filter((sale) => sale.ticketingPartnerId === id && paid(sale));
    return {
      id,
      name: profile?.fullName ?? "Ticketing partner",
      revenuePaise: mine.reduce((sum, sale) => sum + sale.amountPaise, 0),
      commissionBps: profile?.commissionBps ?? 0,
      collectedPaise: mine
        .filter((sale) => sale.collectedBy === "ticketing_partner")
        .reduce((sum, sale) => sum + sale.amountPaise, 0),
    };
  });
  return {
    ticketRevenuePaise: eventSales.filter(paid).reduce((sum, sale) => sum + sale.amountPaise, 0),
    expensesPaise: expenses
      .filter((row) => row.eventId === event.id && !row.deletedAt)
      .reduce((sum, row) => sum + row.amountPaise, 0),
    barRevenuePaise: event.barRevenuePaise,
    barSplitBps: event.barSplitBps,
    barPartnerName: event.barPartnerName || "Bar",
    prLines,
    ticketingLines,
    collab: event.isCollab
      ? { brand: event.collabBrand || "Collab", splitBps: event.collabSplitBps, partnerId: event.collabPartnerId }
      : null,
  };
}

/**
 * Collab profit split is taken before the RVT 50-50.
 * Remainder paise on the 50-50 go to Vedanshu.
 * Commissions are not part of this function's inputs as comps: callers pass paid tickets only.
 */
export function computeSettlement(input: SettlementInput): Settlement {
  const prLines = input.prLines.map((line) => {
    const commissionPaise = line.paidTickets * line.commissionEachPaise;
    return {
      id: line.id,
      name: line.name,
      commissionPaise,
      collectedPaise: line.collectedPaise,
      dueToCompanyPaise: line.collectedPaise - commissionPaise,
    };
  });
  const ticketingLines = input.ticketingLines.map((line) => {
    const commissionPaise = bpsShare(line.revenuePaise, line.commissionBps);
    return {
      id: line.id,
      name: line.name,
      commissionPaise,
      collectedPaise: line.collectedPaise,
      dueToCompanyPaise: line.collectedPaise - commissionPaise,
    };
  });
  const prCommissionPaise = prLines.reduce((sum, line) => sum + line.commissionPaise, 0);
  const ticketingCommissionPaise = ticketingLines.reduce((sum, line) => sum + line.commissionPaise, 0);
  const barPartnerSharePaise = bpsShare(input.barRevenuePaise, input.barSplitBps);
  const barRetainedPaise = input.barRevenuePaise - barPartnerSharePaise;
  const profitPaise =
    input.ticketRevenuePaise +
    barRetainedPaise -
    input.expensesPaise -
    prCommissionPaise -
    ticketingCommissionPaise;
  const collabSharePaise = input.collab ? bpsShare(profitPaise, input.collab.splitBps) : 0;
  const rvtSharePaise = profitPaise - collabSharePaise;
  const rishabPaise = Math.trunc(rvtSharePaise / 2);
  const vedanshuPaise = rvtSharePaise - rishabPaise;
  return {
    ticketRevenuePaise: input.ticketRevenuePaise,
    barRevenuePaise: input.barRevenuePaise,
    barPartnerSharePaise,
    barRetainedPaise,
    barPartnerName: input.barPartnerName,
    expensesPaise: input.expensesPaise,
    prCommissionPaise,
    ticketingCommissionPaise,
    profitPaise,
    collabSharePaise,
    collabBrand: input.collab?.brand ?? null,
    rvtSharePaise,
    vedanshuPaise,
    rishabPaise,
    prLines,
    ticketingLines,
  };
}
