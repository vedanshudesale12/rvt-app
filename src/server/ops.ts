import { canReadEvent, evaluateCheckIn, holdsSeat, resolveLogger } from "@/domain/access";
import { AppError, Forbidden, NotFound } from "@/domain/errors";
import { guestsFromModel, parseGuestList } from "@/domain/guest-parse";
import { kolkataStamp, rupeesToPaise } from "@/domain/money";
import {
  presentDashboard,
  presentLedger,
  presentPrBoard,
  presentSale,
  presentSales,
  presentSettlement,
  presentTicketingBoard,
  rvtTeamTotal,
  type BoardRow,
  type PublicSale,
} from "@/domain/present";
import type { compSchema, eventSchema, expenseSchema, logSaleSchema, staffSchema, statusSchema } from "@/domain/schemas";
import { computeSettlement, settlementFromBooks } from "@/domain/settlement";
import { assertStoragePath, cleanText, isAdminCommand, last4, normalizePhone } from "@/domain/text";
import type { Actor, Assignment, EventRow, Profile, Role, Sale, TicketType } from "@/domain/types";
import { encryptField, hmacValue, hashPassword } from "@/server/crypto";
import { sendEventEmail } from "@/server/email";
import { chatSystem, geminiText } from "@/server/gemini";
import { sendPush } from "@/server/push";
import type { Store } from "@/server/store/types";
import type { z } from "zod";

type LogInput = z.infer<typeof logSaleSchema>;
type CompInput = z.infer<typeof compSchema>;
type EventInput = z.infer<typeof eventSchema>;
type ExpenseInput = z.infer<typeof expenseSchema>;
type StaffInput = z.infer<typeof staffSchema>;
type StatusInput = z.infer<typeof statusSchema>;

async function books(store: Store) {
  const [profiles, events, tickets, assignments, sales, expenses] = await Promise.all([
    store.profiles(),
    store.events(),
    store.tickets(),
    store.assignments(),
    store.sales(),
    store.expenses(),
  ]);
  return { profiles, events, tickets, assignments, sales, expenses };
}

function mustEvent(actor: Actor, data: Awaited<ReturnType<typeof books>>, eventId: string): EventRow {
  const event = data.events.find((row) => row.id === eventId);
  if (!event || !canReadEvent(actor, event, data.assignments)) throw new NotFound();
  return event;
}

function settlementFor(data: Awaited<ReturnType<typeof books>>, event: EventRow) {
  return computeSettlement(settlementFromBooks(event, data.sales, data.expenses, data.profiles, data.assignments));
}

async function audit(store: Store, actor: Actor, action: string, entity: string, entityId: string | null, payload: Record<string, unknown>) {
  await store.writeAudit({ actorId: actor.id, action, entity, entityId, payload });
}

const tails = new Map<string, Promise<unknown>>();

function lock<T>(key: string, work: () => Promise<T>): Promise<T> {
  const prev = tails.get(key) ?? Promise.resolve();
  const run = prev.then(work, work);
  tails.set(key, run.then(() => undefined, () => undefined));
  return run;
}

export async function eventsFor(actor: Actor, store: Store): Promise<EventRow[]> {
  const data = await books(store);
  return data.events
    .filter((event) => !event.deletedAt && canReadEvent(actor, event, data.assignments))
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate));
}

export async function guestList(actor: Actor, store: Store, eventId: string) {
  const data = await books(store);
  const event = mustEvent(actor, data, eventId);
  const sales = presentSales(actor, data.sales, event, data.tickets, data.profiles);
  const team = actor.role === "collab_partner" ? rvtTeamTotal(data.sales, event.id) : undefined;
  return {
    event,
    sales,
    rvtTeam: team,
    tickets: data.tickets.filter((ticket) => ticket.eventId === event.id),
    prs: actor.role === "admin" || actor.role === "data_entry"
      ? data.profiles.filter((profile) => profile.role === "pr" && profile.status === "active").map((profile) => ({ id: profile.id, fullName: profile.fullName }))
      : [],
    canLog: actor.role === "admin" || actor.role === "pr" || actor.role === "data_entry" || actor.role === "collab_partner",
    canVerify: actor.role === "admin",
    readOnly: false,
  };
}

async function writeSale(actor: Actor, store: Store, sale: Sale, phone: string): Promise<Sale> {
  const saved = await store.saveSale(sale, {
    phonePlain: phone,
    phoneCiphertext: await encryptField(phone),
    phoneHmac: await hmacValue(phone),
  });
  await audit(store, actor, sale.isComp ? "request_comp" : "log_sale", "sales", saved.id, {
    guestName: saved.guestName,
    status: saved.status,
    amountPaise: saved.amountPaise,
    prId: saved.prId,
    side: saved.side,
  });
  return saved;
}

function buildSale(actor: Actor, input: {
  event: EventRow;
  ticket: TicketType;
  guestName: string;
  phone: string;
  prId: string | null;
  side: Sale["side"];
  promoterName: string | null;
  notes: string;
  proofPath: string | null;
  collectedBy: Sale["collectedBy"];
  ticketingPartnerId: string | null;
  collabPartnerId?: string | null;
  source: Sale["source"];
  isComp: boolean;
}): Sale {
  return {
    id: crypto.randomUUID(),
    eventId: input.event.id,
    prId: input.prId,
    promoterName: input.promoterName,
    side: input.side,
    guestName: cleanText(input.guestName, 120),
    ticketTypeId: input.ticket.id,
    amountPaise: input.isComp ? 0 : input.ticket.pricePaise,
    status: "pending",
    isComp: input.isComp,
    compStatus: input.isComp ? "pending" : null,
    collectedBy: input.isComp ? "company" : input.collectedBy,
    ticketingPartnerId: input.ticketingPartnerId,
    collabPartnerId: input.collabPartnerId ?? null,
    loggedBy: actor.id,
    proofPath: input.proofPath,
    checkedInAt: null,
    checkedInBy: null,
    source: input.source,
    notes: cleanText(input.notes, 500),
    phoneLast4: last4(input.phone),
    createdAt: new Date().toISOString(),
    deletedAt: null,
  };
}

function assertOnEvent(actor: Actor, event: EventRow, assignments: Assignment[]) {
  if (event.status === "settled") throw new Forbidden("This event is settled");
  if (actor.role === "pr" && !assignments.some((row) => row.eventId === event.id && row.profileId === actor.id)) {
    throw new Forbidden("You're not on this event");
  }
}

export async function logSale(actor: Actor, input: LogInput, store: Store, source: Sale["source"] = "manual"): Promise<PublicSale> {
  return lock(`event:${input.eventId}`, () => logSaleBody(actor, input, store, source));
}

async function logSaleBody(actor: Actor, input: LogInput, store: Store, source: Sale["source"]): Promise<PublicSale> {
  const data = await books(store);
  const event = mustEvent(actor, data, input.eventId);
  const side = input.side ?? "rvt";
  assertOnEvent(actor, event, data.assignments);
  const prId = resolveLogger(actor, input.prId, side);
  if (prId && !data.profiles.some((profile) => profile.id === prId && profile.role === "pr" && profile.status === "active")) {
    throw new Forbidden("Pick an active PR");
  }
  if (!input.ageConfirmed) throw new AppError(400, "Confirm the guest is 18 or older");
  if (side === "collab" && !event.isCollab) throw new Forbidden("This is not a collab event");
  if (actor.role === "collab_partner") {
    const attached = event.collabPartnerId === actor.id || (event.collabShares ?? []).some((share) => share.partnerId === actor.id);
    if (!attached) throw new Forbidden("You're not on this event");
  }
  const ticket = data.tickets.find((row) => row.id === input.ticketTypeId && row.eventId === event.id);
  if (!ticket) throw new NotFound("Unknown ticket");
  const taken = data.sales.filter((row) => row.eventId === event.id && holdsSeat(row)).length;
  if (ticket.saleEndsAt && new Date(ticket.saleEndsAt).getTime() < Date.now()) {
    throw new AppError(400, "That ticket phase has ended");
  }
  if (event.capacity != null && taken >= event.capacity) {
    event.waitlistCount = (event.waitlistCount ?? 0) + 1;
    await store.saveEvent(event);
    throw new AppError(409, "Sold out");
  }
  const phone = normalizePhone(input.phone);
  const proofPath = input.proofPath ? assertStoragePath(input.proofPath) : null;
  if (proofPath && actor.role !== "admin" && !proofPath.startsWith(`proofs/${actor.id}/`)) {
    throw new Forbidden("That file is not yours");
  }
  const sale = buildSale(actor, {
    event,
    ticket,
    guestName: input.guestName,
    phone,
    prId,
    side,
    promoterName: side === "collab" ? cleanText(input.promoterName || actor.fullName, 120) : null,
    notes: input.notes ?? "",
    proofPath,
    collectedBy: actor.role === "collab_partner" ? "company" : input.collectedBy ?? (input.ticketingPartnerId ? "ticketing_partner" : "pr"),
    ticketingPartnerId: actor.role === "collab_partner" ? null : input.ticketingPartnerId ?? null,
    collabPartnerId: side === "collab" ? (actor.role === "collab_partner" ? actor.id : event.collabPartnerId) : null,
    source,
    isComp: false,
  });
  const saved = await writeSale(actor, store, sale, phone);
  return presentSale(actor, saved, event, data.tickets, data.profiles);
}

export async function logBulk(
  actor: Actor,
  eventId: string,
  rows: { guestName: string; phone: string; ticketTypeId: string }[],
  store: Store,
): Promise<PublicSale[]> {
  const saved: PublicSale[] = [];
  for (const row of rows) {
    saved.push(await logSale(actor, { ...row, eventId, notes: "", side: "rvt", ageConfirmed: true }, store, "bulk_chat"));
  }
  return saved;
}

export async function requestComp(actor: Actor, input: CompInput, store: Store): Promise<PublicSale> {
  if (actor.role === "collab_partner") throw new Forbidden("Comps are an RVT approval");
  if (!input.ageConfirmed) throw new AppError(400, "Confirm the guest is 18 or older");
  const data = await books(store);
  const event = mustEvent(actor, data, input.eventId);
  assertOnEvent(actor, event, data.assignments);
  const prId = resolveLogger(actor, input.prId, "rvt");
  const ticket = data.tickets.find((row) => row.id === input.ticketTypeId && row.eventId === event.id);
  if (!ticket) throw new NotFound("Unknown ticket");
  const phone = normalizePhone(input.phone);
  const sale = buildSale(actor, {
    event,
    ticket,
    guestName: input.guestName,
    phone,
    prId,
    side: "rvt",
    promoterName: null,
    notes: input.notes ?? "",
    proofPath: null,
    collectedBy: "company",
    ticketingPartnerId: null,
    source: "manual",
    isComp: true,
  });
  const saved = await writeSale(actor, store, sale, phone);
  return presentSale(actor, saved, event, data.tickets, data.profiles);
}

async function mutateSale(actor: Actor, store: Store, id: string, change: (sale: Sale) => void, action: string) {
  if (actor.role !== "admin" || actor.status !== "active") throw new Forbidden("Admin only");
  const data = await books(store);
  const sale = data.sales.find((row) => row.id === id);
  if (!sale) throw new NotFound();
  const event = data.events.find((row) => row.id === sale.eventId);
  if (!event) throw new NotFound();
  change(sale);
  await store.saveSale(sale);
  await audit(store, actor, action, "sales", sale.id, { status: sale.status, compStatus: sale.compStatus });
  return presentSale(actor, sale, event, data.tickets, data.profiles);
}

export function reviewSale(actor: Actor, id: string, decision: "verified" | "rejected", store: Store) {
  return mutateSale(actor, store, id, (sale) => {
    if (sale.isComp) throw new Forbidden("Approve the comp on the comps page");
    sale.status = decision === "verified" ? "verified" : "rejected";
  }, decision === "verified" ? "verify_sale" : "reject_sale");
}

export function reviewComp(actor: Actor, id: string, decision: "approved" | "rejected", store: Store) {
  return mutateSale(actor, store, id, (sale) => {
    if (!sale.isComp) throw new Forbidden("This is not a comp");
    if (decision === "approved") {
      sale.compStatus = "approved";
      sale.status = "verified";
      sale.amountPaise = 0;
    } else {
      sale.compStatus = "rejected";
      sale.status = "rejected";
    }
  }, decision === "approved" ? "approve_comp" : "reject_comp");
}

export async function checkIn(actor: Actor, saleId: string, store: Store) {
  return lock(`sale:${saleId}`, async () => {
    const data = await books(store);
    const sale = data.sales.find((row) => row.id === saleId);
    if (!sale) throw new NotFound();
    const event = data.events.find((row) => row.id === sale.eventId);
    if (!event) throw new NotFound();
    const decision = evaluateCheckIn(actor, sale, event, data.assignments);
    if (decision.result !== "inside") return decision;
    sale.checkedInAt = new Date().toISOString();
    sale.checkedInBy = actor.id;
    await store.saveSale(sale);
    await audit(store, actor, "check_in", "sales", sale.id, { checkedInAt: sale.checkedInAt });
    return { result: "inside" as const, checkedInAt: sale.checkedInAt };
  });
}

export async function refundSale(actor: Actor, saleId: string, store: Store) {
  if (actor.role !== "admin") throw new Forbidden();
  const data = await books(store);
  const sale = data.sales.find((row) => row.id === saleId && !row.deletedAt);
  if (!sale) throw new NotFound();
  if (sale.status === "rejected") throw new Forbidden("Rejected guests are not refunded");
  sale.status = "refunded";
  sale.checkedInAt = null;
  sale.checkedInBy = null;
  await store.saveSale(sale);
  await audit(store, actor, "refund", "sales", sale.id, {});
  return { id: sale.id, status: sale.status };
}

export async function doorSearch(actor: Actor, store: Store, eventId: string, query: string) {
  if (actor.role !== "admin" && actor.role !== "pr" && actor.role !== "door") throw new Forbidden();
  const [events, tickets, assignments, sales] = await Promise.all([
    store.events(),
    store.tickets(),
    store.assignments(),
    store.sales(),
  ]);
  const event = events.find((row) => row.id === eventId);
  if (!event || !canReadEvent(actor, event, assignments)) throw new NotFound();
  const ticketName = new Map(tickets.filter((ticket) => ticket.eventId === event.id).map((ticket) => [ticket.id, ticket.name]));
  const eventSales = sales.filter((row) => row.eventId === event.id && !row.deletedAt);
  const checkedIn = eventSales.filter((row) => row.checkedInAt).length;
  const needle = query.trim().toLowerCase();
  const digits = needle.replace(/\D/g, "");
  const last4Query = digits.slice(-4);
  const rows = [];
  for (const sale of eventSales) {
    const named = !needle
      || sale.guestName.toLowerCase().includes(needle)
      || (sale.checkInCode ? sale.checkInCode.toLowerCase() === needle : false)
      || (digits.length >= 3 && digits.length < 8 && sale.phoneLast4.includes(last4Query));
    let hit = named;
    if (!hit && digits.length >= 8 && sale.phoneLast4 === last4Query) {
      const phone = await store.salePhone(sale.id);
      hit = !!phone && phone.endsWith(digits);
    }
    if (!hit) continue;
    rows.push({
      id: sale.id,
      guestName: sale.guestName,
      ticketTypeName: ticketName.get(sale.ticketTypeId) ?? "Ticket",
      phoneLast4: sale.phoneLast4,
      checkedInAt: sale.checkedInAt,
      status: sale.status,
      isComp: sale.isComp,
      compStatus: sale.compStatus,
    });
    if (rows.length >= 40) break;
  }
  return { event: { id: event.id, name: event.name, venue: event.venue }, guests: rows, checkedIn, listed: eventSales.length };
}

export async function dashboard(actor: Actor, store: Store, eventId: string) {
  const data = await books(store);
  const event = mustEvent(actor, data, eventId);
  const settlement = settlementFor(data, event);
  return presentDashboard(actor, event, data.sales, data.expenses, data.tickets, data.profiles, settlement);
}

export async function ledger(actor: Actor, store: Store, eventId: string) {
  const data = await books(store);
  const event = mustEvent(actor, data, eventId);
  const settlement = actor.role === "data_entry" ? null : settlementFor(data, event);
  return { event: { id: event.id, name: event.name }, ...presentLedger(actor, data.expenses.filter((row) => row.eventId === event.id), settlement) };
}

export async function settlementView(actor: Actor, store: Store, eventId: string) {
  const data = await books(store);
  const event = mustEvent(actor, data, eventId);
  const settlement = settlementFor(data, event);
  return { event: { id: event.id, name: event.name, status: event.status }, ...presentSettlement(actor, settlement), canSettle: actor.role === "admin" && event.status !== "settled" };
}

export async function settleEvent(actor: Actor, store: Store, eventId: string) {
  if (actor.role !== "admin") throw new Forbidden("Admin only");
  const data = await books(store);
  const event = mustEvent(actor, data, eventId);
  if (event.status === "settled") throw new Forbidden("Already settled");
  const settlement = settlementFor(data, event);
  event.status = "settled";
  event.settledAt = new Date().toISOString();
  await store.saveEvent(event);
  if (event.collabPartnerId) {
    const partner = data.profiles.find((profile) => profile.id === event.collabPartnerId);
    if (partner) {
      partner.status = "disabled";
      await store.saveProfile(partner);
    }
  }
  await audit(store, actor, "settle", "events", event.id, {
    profitPaise: settlement.profitPaise,
    collabSharePaise: settlement.collabSharePaise,
    vedanshuPaise: settlement.vedanshuPaise,
    rishabPaise: settlement.rishabPaise,
  });
  return presentSettlement(actor, settlement);
}

export async function addExpense(actor: Actor, input: ExpenseInput, store: Store) {
  if (actor.role !== "admin" && actor.role !== "data_entry") throw new Forbidden();
  const data = await books(store);
  const event = mustEvent(actor, data, input.eventId);
  if (event.status === "settled") throw new Forbidden("This event is settled");
  const expense = {
    id: crypto.randomUUID(),
    eventId: event.id,
    category: cleanText(input.category, 60),
    description: cleanText(input.description, 200),
    amountPaise: rupeesToPaise(input.amountRupees),
    createdBy: actor.id,
    receiptPath: input.receiptPath ? assertStoragePath(input.receiptPath) : null,
    createdAt: new Date().toISOString(),
    deletedAt: null,
  };
  await store.saveExpense(expense);
  await audit(store, actor, "add_expense", "expenses", expense.id, { amountPaise: expense.amountPaise, category: expense.category });
  return { id: expense.id, category: expense.category, description: expense.description, amountPaise: expense.amountPaise };
}

export async function voidExpense(actor: Actor, id: string, store: Store) {
  if (actor.role !== "admin") throw new Forbidden("Admin only");
  const data = await books(store);
  const expense = data.expenses.find((row) => row.id === id);
  if (!expense) throw new NotFound();
  expense.deletedAt = new Date().toISOString();
  await store.saveExpense(expense);
  await audit(store, actor, "void_expense", "expenses", expense.id, {});
  return { ok: true };
}

function boardRows(data: Awaited<ReturnType<typeof books>>, role: Role): BoardRow[] {
  const people = data.profiles.filter((profile) => profile.role === role && profile.status !== "disabled");
  return people.map((profile) => {
    const mine = data.sales.filter((sale) => !sale.deletedAt && !sale.isComp && sale.status === "verified" && (role === "pr" ? sale.prId === profile.id : sale.ticketingPartnerId === profile.id));
    const revenuePaise = mine.reduce((sum, sale) => sum + sale.amountPaise, 0);
    return {
      name: profile.fullName,
      tickets: mine.length,
      revenuePaise,
      commissionPaise: role === "pr"
        ? mine.length * (data.events.find((event) => event.id === mine[0]?.eventId)?.prCommissionPaise ?? 0)
        : mine.length * (profile.commissionPaise ?? 10_000) + Math.trunc((revenuePaise * profile.commissionBps) / 10000),
    };
  }).sort((a, b) => b.tickets - a.tickets || a.name.localeCompare(b.name));
}

function collabBoard(data: Awaited<ReturnType<typeof books>>): BoardRow[] {
  const groups = new Map<string, { tickets: number; revenuePaise: number }>();
  for (const sale of data.sales) {
    if (sale.deletedAt || sale.side !== "collab" || sale.isComp || sale.status !== "verified") continue;
    const name = sale.promoterName || "Collab";
    const current = groups.get(name) ?? { tickets: 0, revenuePaise: 0 };
    current.tickets += 1;
    current.revenuePaise += sale.amountPaise;
    groups.set(name, current);
  }
  return [...groups.entries()]
    .map(([name, value]) => ({ name, tickets: value.tickets, revenuePaise: value.revenuePaise }))
    .sort((a, b) => b.tickets - a.tickets || a.name.localeCompare(b.name));
}

export async function leaderboard(actor: Actor, store: Store) {
  const data = await books(store);
  if (actor.role === "ticketing_partner") {
    return { kind: "ticketing" as const, rows: presentTicketingBoard(actor, boardRows(data, "ticketing_partner")), collabRows: [] as BoardRow[] };
  }
  return {
    kind: "pr" as const,
    rows: presentPrBoard(actor, boardRows(data, "pr")),
    collabRows: actor.role === "admin" ? collabBoard(data) : [],
  };
}

export async function ticketingHome(actor: Actor, store: Store, eventId: string | null) {
  const data = await books(store);
  const events = data.events.filter((event) => canReadEvent(actor, event, data.assignments));
  const event = eventId ? mustEvent(actor, data, eventId) : events[0];
  if (!event) return { events, sales: [], settlement: null, board: presentTicketingBoard(actor, boardRows(data, "ticketing_partner")) };
  const sales = presentSales(actor, data.sales, event, data.tickets, data.profiles);
  const settlement = presentSettlement(actor, settlementFor(data, event));
  return { events, event, sales, settlement, board: presentTicketingBoard(actor, boardRows(data, "ticketing_partner")) };
}

export async function saveEvent(actor: Actor, input: EventInput, store: Store) {
  if (actor.role !== "admin") throw new Forbidden("Admin only");
  const data = await books(store);
  const existing = input.id ? data.events.find((event) => event.id === input.id) : undefined;
  if (input.id && !existing) throw new NotFound();
  if (existing?.deletedAt) throw new NotFound();
  const collabPartners = input.collabPartners ?? (input.isCollab && input.collabPartnerId
    ? [{ id: input.collabPartnerId, brand: input.collabBrand ?? "", splitPercent: input.collabSplitPercent }]
    : []);
  const event: EventRow = {
    id: existing?.id ?? crypto.randomUUID(),
    name: cleanText(input.name, 120),
    eventDate: input.eventDate,
    venue: cleanText(input.venue, 160),
    startsAt: kolkataStamp(input.eventDate, input.time),
    status: input.status,
    prCommissionPaise: rupeesToPaise(input.prCommissionRupees),
    barRevenuePaise: rupeesToPaise(input.barRevenueRupees),
    barSplitBps: Math.round(input.barSplitPercent * 100),
    barPartnerName: cleanText(input.barPartnerName ?? "", 120),
    isCollab: collabPartners.length > 0,
    collabBrand: collabPartners.map((partner) => cleanText(partner.brand || "Collab", 120)).join(" + "),
    collabPartnerId: collabPartners[0]?.id ?? null,
    collabSplitBps: collabPartners.reduce((sum, partner) => sum + Math.round(partner.splitPercent * 100), 0),
    collabShares: collabPartners.map((partner) => ({
      brand: cleanText(partner.brand || "Collab", 120),
      splitBps: Math.round(partner.splitPercent * 100),
      partnerId: partner.id,
    })),
    settledAt: input.status === "settled" ? existing?.settledAt ?? new Date().toISOString() : null,
    createdBy: existing?.createdBy ?? actor.id,
    deletedAt: existing?.deletedAt ?? null,
    kind: (input.kind as EventRow["kind"]) || existing?.kind || "club_night",
    capacity: input.capacity ?? null,
    minAge: 18,
    alcohol: true,
    postponedTo: input.status === "postponed" ? input.postponedTo ?? null : null,
  };
  if (event.collabPartnerId && !data.profiles.some((profile) => profile.id === event.collabPartnerId && profile.role === "collab_partner")) {
    throw new Forbidden("Pick a collab partner");
  }
  await store.saveEvent(event);
  const tickets: TicketType[] = input.ticketTypes.map((ticket, index) => ({
    id: ticket.id ?? crypto.randomUUID(),
    eventId: event.id,
    name: cleanText(ticket.name, 80),
    pricePaise: rupeesToPaise(ticket.priceRupees),
    sortOrder: index + 1,
    saleEndsAt: ticket.saleEndsAt ?? null,
  }));
  await store.saveTickets(event.id, tickets);
  const assignments: Assignment[] = input.prIds.map((profileId) => ({
    id: crypto.randomUUID(),
    eventId: event.id,
    profileId,
    side: "rvt" as const,
    commissionPaise: null,
  }));
  for (const partner of collabPartners) {
    if (!data.profiles.some((profile) => profile.id === partner.id && profile.role === "collab_partner")) {
      throw new Forbidden("Pick a collab partner");
    }
    assignments.push({ id: crypto.randomUUID(), eventId: event.id, profileId: partner.id, side: "collab", commissionPaise: null });
  }
  for (const partner of input.ticketingPartners ?? []) {
    const profile = data.profiles.find((row) => row.id === partner.id && row.role === "ticketing_partner" && row.status === "active");
    if (!profile) throw new Forbidden("Pick a ticketing partner");
    assignments.push({
      id: crypto.randomUUID(),
      eventId: event.id,
      profileId: partner.id,
      side: "rvt",
      commissionPaise: rupeesToPaise(partner.flatRupees),
      commissionBps: partner.percent == null ? null : Math.round(partner.percent * 100),
    });
  }
  await store.saveAssignments(event.id, assignments);
  const publishing = event.status === "published" && existing?.status !== "published";
  if (publishing) await notifyPrs(actor, store, event, data.profiles);
  await audit(store, actor, existing ? "update_event" : "create_event", "events", event.id, { name: event.name, status: event.status });
  return event;
}

export async function deleteEvent(actor: Actor, eventId: string, store: Store) {
  if (actor.role !== "admin") throw new Forbidden("Admin only");
  const data = await books(store);
  const event = data.events.find((row) => row.id === eventId && !row.deletedAt);
  if (!event) throw new NotFound();
  event.deletedAt = new Date().toISOString();
  await store.saveEvent(event);
  await audit(store, actor, "delete_event", "events", event.id, { name: event.name });
  return { ok: true, id: event.id };
}

async function notifyPrs(actor: Actor, store: Store, event: EventRow, profiles: Profile[]) {
  const prs = profiles.filter((profile) => profile.role === "pr" && profile.status === "active");
  for (const pr of prs) {
    await store.addNotice({
      id: crypto.randomUUID(),
      userId: pr.id,
      eventId: event.id,
      title: event.name,
      body: `${event.venue} · ${event.eventDate}`,
      readAt: null,
      createdAt: new Date().toISOString(),
    });
    await sendEventEmail(pr.email, event);
  }
  const pushes = await store.pushesFor(prs.map((pr) => pr.id));
  await sendPush(pushes, event.name, `${event.venue}`, "/events");
  await audit(store, actor, "notify_prs", "events", event.id, { count: prs.length });
}

export async function createStaff(actor: Actor, input: StaffInput, store: Store) {
  if (actor.role !== "admin") throw new Forbidden("Admin only");
  const existing = await store.userByEmail(input.email);
  if (existing) throw new AppError(409, "That email is already in use");
  const phone = normalizePhone(input.phone);
  const profile: Profile = {
    id: crypto.randomUUID(),
    fullName: cleanText(input.fullName, 120),
    email: input.email.toLowerCase(),
    role: input.role,
    status: "active",
    isOwner: false,
    ownerSlot: null,
    commissionBps: 0,
    instagram: "",
    college: "",
    area: "",
    referrer: "",
    photoPath: null,
    phoneLast4: last4(phone),
    createdAt: new Date().toISOString(),
    deletedAt: null,
  };
  await store.saveProfile(profile, {
    passwordHash: await hashPassword(input.password),
    phoneCiphertext: await encryptField(phone),
    phoneHmac: await hmacValue(phone),
    phonePlain: phone,
  });
  await audit(store, actor, "create_staff", "profiles", profile.id, { role: profile.role });
  return { id: profile.id, fullName: profile.fullName, role: profile.role, status: profile.status };
}

export async function setUserStatus(actor: Actor, userId: string, input: StatusInput, store: Store) {
  if (actor.role !== "admin") throw new Forbidden("Admin only");
  const data = await books(store);
  const profile = data.profiles.find((row) => row.id === userId);
  if (!profile) throw new NotFound();
  if (profile.isOwner && input.role && input.role !== "admin") throw new Forbidden("Owners stay admin");
  profile.status = input.status;
  if (input.role && !profile.isOwner) profile.role = input.role;
  await store.saveProfile(profile);
  await audit(store, actor, "set_user", "profiles", profile.id, { status: profile.status, role: profile.role });
  return { id: profile.id, status: profile.status, role: profile.role };
}

export async function people(actor: Actor, store: Store) {
  if (actor.role !== "admin") throw new Forbidden();
  const profiles = await store.profiles();
  return profiles
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .map((profile) => ({
      id: profile.id,
      fullName: profile.fullName,
      email: profile.email,
      role: profile.role,
      status: profile.status,
      phoneLast4: profile.phoneLast4,
      area: profile.area,
      instagram: profile.instagram,
      isOwner: profile.isOwner,
    }));
}

export async function auditLog(actor: Actor, store: Store) {
  if (actor.role !== "admin") throw new Forbidden();
  return store.audit(200);
}

export async function notices(actor: Actor, store: Store) {
  const rows = await store.notices(actor.id);
  return rows.filter((row) => !row.readAt);
}

export async function markNotice(actor: Actor, id: string, store: Store) {
  await store.markRead(id, actor.id);
  return { ok: true };
}

export async function compare(actor: Actor, store: Store, aId: string, bId: string) {
  const data = await books(store);
  const left = mustEvent(actor, data, aId);
  const right = mustEvent(actor, data, bId);
  const summarize = (event: EventRow) => {
    const sales = data.sales.filter((sale) => sale.eventId === event.id && !sale.deletedAt && sale.status === "verified" && !sale.isComp);
    const visible = actor.role === "collab_partner" ? sales.filter((sale) => sale.side === "collab") : sales;
    const team = actor.role === "collab_partner" ? rvtTeamTotal(data.sales, event.id) : null;
    const showMoney = actor.role === "admin" || actor.role === "collab_partner";
    return {
      id: event.id,
      name: event.name,
      date: event.eventDate,
      tickets: visible.length + (team?.tickets ?? 0),
      revenuePaise: showMoney ? visible.reduce((sum, sale) => sum + sale.amountPaise, 0) + (team?.amountPaise ?? 0) : undefined,
    };
  };
  return { a: summarize(left), b: summarize(right) };
}

function looksLikeList(message: string): boolean {
  const lines = message.split(/\n/).filter((line) => line.trim());
  const phones = message.match(/\d[\d\s-]{7,}/g)?.length ?? 0;
  return phones >= 1 && (lines.length >= 2 || /[,|\/;]/.test(message) || /[A-Za-z].*\d{8,}|\d{8,}.*[A-Za-z]/.test(message));
}

export async function chat(actor: Actor, store: Store, eventId: string | null, message: string) {
  if (actor.role !== "admin" && actor.role !== "pr" && actor.role !== "data_entry") throw new Forbidden();
  const data = await books(store);
  const event = eventId ? mustEvent(actor, data, eventId) : null;
  await store.saveChat({ id: crypto.randomUUID(), userId: actor.id, eventId, role: "user", body: cleanText(message, 4000), createdAt: new Date().toISOString() });
  if (isAdminCommand(message) && actor.role !== "admin") {
    const text = "That needs an admin.";
    await store.saveChat({ id: crypto.randomUUID(), userId: actor.id, eventId, role: "assistant", body: text, createdAt: new Date().toISOString() });
    return { type: "answer" as const, text };
  }
  if (event && looksLikeList(message)) {
    const tickets = data.tickets.filter((ticket) => ticket.eventId === event.id);
    let parsed: { guestName: string; phone: string; ticketTypeId: string }[] = [];
    let errors: string[] = [];
    const model = await geminiText(
      `${chatSystem(actor.fullName)} Extract guests as JSON {"guests":[{"guestName","phone","ticketType"}]} . Ticket types: ${tickets.map((ticket) => ticket.name).join(", ")}. Text:\n${message}`,
      true,
    );
    if (model) {
      try {
        parsed = guestsFromModel(JSON.parse(model), tickets);
      } catch (error) {
        errors = [error instanceof Error ? error.message : "Could not read that list"];
      }
    }
    if (!parsed.length) {
      const local = parseGuestList(message, tickets);
      parsed = local.rows;
      errors = errors.length ? errors : local.errors;
    }
    return {
      type: "preview" as const,
      eventId: event.id,
      rows: parsed.map((row) => ({
        guestName: row.guestName,
        phone: row.phone,
        ticketTypeId: row.ticketTypeId,
        ticketTypeName: tickets.find((ticket) => ticket.id === row.ticketTypeId)?.name ?? "",
      })),
      errors,
    };
  }
  const visible = event
    ? data.sales.filter((sale) => sale.eventId === event.id && canReadEvent(actor, event, data.assignments) && (actor.role === "pr" ? sale.prId === actor.id : actor.role === "admin" || actor.role === "data_entry"))
    : [];
  const stats = {
    verified: visible.filter((sale) => sale.status === "verified" && !sale.isComp).length,
    pending: visible.filter((sale) => sale.status === "pending" && !sale.isComp).length,
    compsPending: visible.filter((sale) => sale.isComp && sale.compStatus === "pending").length,
  };
  let text = `Verified ${stats.verified}. Waiting on admin: ${stats.pending}. Comps waiting: ${stats.compsPending}.`;
  if (actor.role === "data_entry" && /profit|split|owe/i.test(message)) {
    text = "Profit stays with admin. You can log guests and expenses.";
  } else if (process.env.GEMINI_API_KEY && actor.role !== "data_entry") {
    const answer = await geminiText(`${chatSystem(actor.fullName)}\nFacts: ${JSON.stringify(stats)}\nQuestion: ${message}`);
    if (answer) text = answer.slice(0, 2000);
  }
  await store.saveChat({ id: crypto.randomUUID(), userId: actor.id, eventId, role: "assistant", body: text, createdAt: new Date().toISOString() });
  return { type: "answer" as const, text };
}

export async function signupUser(input: {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  role: "pr" | "ticketing_partner" | "collab_partner";
  instagram?: string;
  college?: string;
  area?: string;
  referrer?: string;
  upi?: string;
  photoPath?: string;
}, store: Store) {
  const existing = await store.userByEmail(input.email);
  if (existing) throw new AppError(409, "That email is already in use");
  const phone = normalizePhone(input.phone);
  const status = input.role === "pr" ? "active" : "pending";
  const profile: Profile = {
    id: crypto.randomUUID(),
    fullName: cleanText(input.fullName, 120),
    email: input.email.toLowerCase(),
    role: input.role,
    status,
    isOwner: false,
    ownerSlot: null,
    commissionBps: 0,
    instagram: cleanText(input.instagram ?? "", 60),
    college: cleanText(input.college ?? "", 120),
    area: cleanText(input.area ?? "", 80),
    referrer: cleanText(input.referrer ?? "", 120),
    photoPath: input.photoPath ? assertStoragePath(input.photoPath) : null,
    phoneLast4: last4(phone),
    createdAt: new Date().toISOString(),
    deletedAt: null,
  };
  await store.saveProfile(profile, {
    passwordHash: await hashPassword(input.password),
    phoneCiphertext: await encryptField(phone),
    phoneHmac: await hmacValue(phone),
    upiCiphertext: input.upi ? await encryptField(cleanText(input.upi, 80)) : undefined,
    phonePlain: phone,
  });
  return profile;
}
