import { assertDataAdmin, fullExport, isDataEntity, queryTable, tableFor, toCsv } from "@/domain/catalog";
import { AppError } from "@/domain/errors";
import type { Actor } from "@/domain/types";
import { appendSheet } from "@/server/sheets";
import type { Store } from "@/server/store/types";

async function load(store: Store) {
  const [profiles, events, tickets, assignments, sales, expenses, audit] = await Promise.all([
    store.profiles(),
    store.events(),
    store.tickets(),
    store.assignments(),
    store.sales(),
    store.expenses(),
    store.audit(500),
  ]);
  return { profiles, events, tickets, assignments, sales, expenses, audit };
}

export async function dataRows(actor: Actor, store: Store, entity: string, query: { q?: string; sort?: string; dir?: string; status?: string }) {
  assertDataAdmin(actor);
  if (!isDataEntity(entity)) throw new AppError(404, "Unknown table");
  return queryTable(tableFor(entity, await load(store)), query);
}

export async function dataCsv(actor: Actor, store: Store, entity: string, query: { q?: string; sort?: string; dir?: string; status?: string }) {
  const rows = await dataRows(actor, store, entity, query);
  await store.writeAudit({ actorId: actor.id, action: "export", entity, entityId: null, payload: { format: "csv", rows: rows.length } });
  return toCsv(rows);
}

export async function dataDump(actor: Actor, store: Store) {
  assertDataAdmin(actor);
  const books = await load(store);
  await store.writeAudit({ actorId: actor.id, action: "export", entity: "all", entityId: null, payload: { format: "json" } });
  return fullExport(books);
}

export async function syncSheets(actor: Actor, store: Store) {
  assertDataAdmin(actor);
  const books = await load(store);
  const rows = tableFor("settlements", books);
  const values = [
    Object.keys(rows[0]?.cells ?? { event: "" }),
    ...rows.map((row) => Object.values(row.cells)),
  ];
  await appendSheet(values);
  await store.writeAudit({ actorId: actor.id, action: "sheets_sync", entity: "settlements", entityId: null, payload: { rows: rows.length } });
  return { ok: true, rows: rows.length };
}
