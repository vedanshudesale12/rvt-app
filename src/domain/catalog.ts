import { Forbidden } from "@/domain/errors";
import { computeSettlement, settlementFromBooks } from "@/domain/settlement";
import type { Actor, Assignment, AuditEntry, EventRow, Expense, Profile, Sale, TicketType } from "@/domain/types";

export const DATA_ENTITIES = [
  { id: "users", label: "Users" },
  { id: "events", label: "Events" },
  { id: "sales", label: "Sales" },
  { id: "attendees", label: "Attendees" },
  { id: "comps", label: "Comps" },
  { id: "checkins", label: "Check-ins" },
  { id: "ledger", label: "Ledger" },
  { id: "settlements", label: "Settle-ups" },
  { id: "partners", label: "Partners" },
  { id: "audit", label: "Audit log" },
] as const;

export type DataEntity = (typeof DATA_ENTITIES)[number]["id"];

export type TableRow = { id: string; cells: Record<string, string> };

export type CatalogBooks = {
  profiles: Profile[];
  events: EventRow[];
  tickets: TicketType[];
  assignments: Assignment[];
  sales: Sale[];
  expenses: Expense[];
  audit: AuditEntry[];
};

export function isDataEntity(value: string): value is DataEntity {
  return DATA_ENTITIES.some((item) => item.id === value);
}

export function assertDataAdmin(actor: Actor): void {
  if (actor.role !== "admin" || actor.status !== "active") throw new Forbidden();
}

function eventName(events: EventRow[], id: string): string {
  return events.find((event) => event.id === id)?.name ?? id;
}

function profileName(profiles: Profile[], id: string | null): string {
  if (!id) return "";
  return profiles.find((profile) => profile.id === id)?.fullName ?? id;
}

function ticketName(tickets: TicketType[], id: string): string {
  return tickets.find((ticket) => ticket.id === id)?.name ?? id;
}

export function tableFor(entity: DataEntity, books: CatalogBooks): TableRow[] {
  if (entity === "users") {
    return books.profiles.filter((profile) => !profile.deletedAt).map((profile) => ({
      id: profile.id,
      cells: {
        name: profile.fullName,
        email: profile.email,
        role: profile.role ?? "",
        status: profile.status,
        area: profile.area,
        college: profile.college,
        phoneLast4: profile.phoneLast4,
      },
    }));
  }
  if (entity === "events") {
    return books.events.filter((event) => !event.deletedAt).map((event) => ({
      id: event.id,
      cells: {
        name: event.name,
        date: event.eventDate,
        venue: event.venue,
        status: event.status,
        kind: event.kind ?? "club_night",
        capacity: event.capacity == null ? "" : String(event.capacity),
        waitlist: String(event.waitlistCount ?? 0),
        collab: event.isCollab ? event.collabBrand : "",
      },
    }));
  }
  if (entity === "partners") {
    return books.profiles
      .filter((profile) => profile.role === "ticketing_partner" || profile.role === "collab_partner")
      .map((profile) => ({
        id: profile.id,
        cells: {
          name: profile.fullName,
          role: profile.role ?? "",
          status: profile.status,
          commissionBps: String(profile.commissionBps),
        },
      }));
  }
  if (entity === "ledger") {
    return books.expenses.filter((row) => !row.deletedAt).map((row) => ({
      id: row.id,
      cells: {
        event: eventName(books.events, row.eventId),
        category: row.category,
        description: row.description,
        amountPaise: String(row.amountPaise),
        createdAt: row.createdAt,
      },
    }));
  }
  if (entity === "settlements") {
    return books.events.filter((event) => !event.deletedAt).map((event) => {
      const settlement = computeSettlement(
        settlementFromBooks(event, books.sales, books.expenses, books.profiles, books.assignments),
      );
      return {
        id: event.id,
        cells: {
          event: event.name,
          ticketRevenuePaise: String(settlement.ticketRevenuePaise),
          profitPaise: String(settlement.profitPaise),
          collabSharePaise: String(settlement.collabSharePaise),
          vedanshuPaise: String(settlement.vedanshuPaise),
          rishabPaise: String(settlement.rishabPaise),
        },
      };
    });
  }
  if (entity === "audit") {
    return books.audit.map((row) => ({
      id: row.id,
      cells: {
        when: row.createdAt,
        actor: profileName(books.profiles, row.actorId),
        action: row.action,
        entity: row.entity,
        entityId: row.entityId ?? "",
      },
    }));
  }
  const sales = books.sales.filter((sale) => {
    if (sale.deletedAt) return false;
    if (entity === "comps") return sale.isComp;
    if (entity === "checkins") return Boolean(sale.checkedInAt);
    return true;
  });
  return sales.map((sale) => ({
    id: sale.id,
    cells: {
      event: eventName(books.events, sale.eventId),
      guest: sale.guestName,
      ticket: ticketName(books.tickets, sale.ticketTypeId),
      amountPaise: String(sale.amountPaise),
      status: sale.status,
      side: sale.side,
      pr: profileName(books.profiles, sale.prId),
      promoter: sale.promoterName ?? "",
      phoneLast4: sale.phoneLast4,
      payment: sale.paymentMethod ?? "",
      code: sale.checkInCode ?? "",
      checkedInAt: sale.checkedInAt ?? "",
      comp: sale.isComp ? sale.compStatus ?? "" : "",
    },
  }));
}

export function queryTable(
  rows: TableRow[],
  query: { q?: string; sort?: string; dir?: string; status?: string },
): TableRow[] {
  let next = rows;
  if (query.status) next = next.filter((row) => row.cells.status === query.status);
  const q = query.q?.trim().toLowerCase();
  if (q) {
    next = next.filter((row) => Object.values(row.cells).some((value) => value.toLowerCase().includes(q)));
  }
  if (query.sort && next.some((row) => query.sort && query.sort in row.cells)) {
    const key = query.sort;
    const dir = query.dir === "desc" ? -1 : 1;
    next = [...next].sort((a, b) => {
      const av = a.cells[key] ?? "";
      const bv = b.cells[key] ?? "";
      const an = Number(av);
      const bn = Number(bv);
      if (av !== "" && bv !== "" && Number.isFinite(an) && Number.isFinite(bn)) return (an - bn) * dir;
      return av.localeCompare(bv) * dir;
    });
  }
  return next;
}

export function toCsv(rows: TableRow[]): string {
  const headers = rows[0] ? Object.keys(rows[0].cells) : ["id"];
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvCell(row.cells[header] ?? "")).join(","));
  }
  return lines.join("\n");
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

export function fullExport(books: CatalogBooks): Record<DataEntity, TableRow[]> {
  return Object.fromEntries(DATA_ENTITIES.map((item) => [item.id, tableFor(item.id, books)])) as Record<DataEntity, TableRow[]>;
}
