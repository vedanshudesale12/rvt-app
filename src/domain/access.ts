import { Forbidden } from "@/domain/errors";
import type { Actor, Assignment, EventRow, Role, Sale } from "@/domain/types";

export function isActive(actor: Actor): boolean {
  return actor.status === "active";
}

export function canReadEvent(actor: Actor, event: EventRow, assignments: Assignment[]): boolean {
  if (!isActive(actor) || event.deletedAt) return false;
  if (actor.role === "admin" || actor.role === "data_entry") return true;
  if (actor.role === "door") return event.status !== "draft";
  if (actor.role === "pr" || actor.role === "ticketing_partner") {
    return assignments.some((row) => row.eventId === event.id && row.profileId === actor.id);
  }
  if (actor.role === "collab_partner") {
    return event.isCollab && event.collabPartnerId === actor.id && event.status !== "settled";
  }
  return false;
}

export function canReadSale(actor: Actor, sale: Sale, event: EventRow): boolean {
  if (!isActive(actor) || sale.deletedAt || event.deletedAt || sale.eventId !== event.id) return false;
  if (actor.role === "admin" || actor.role === "data_entry" || actor.role === "door") return true;
  if (actor.role === "pr") return sale.side === "rvt" && sale.prId === actor.id;
  if (actor.role === "ticketing_partner") return sale.ticketingPartnerId === actor.id;
  if (actor.role === "collab_partner") {
    return event.collabPartnerId === actor.id && event.status !== "settled" && sale.side === "collab";
  }
  return false;
}

export function canSeeProfit(actor: Actor): boolean {
  return isActive(actor) && (actor.role === "admin" || actor.role === "collab_partner");
}

export function canSeeCompanyMoney(actor: Actor): boolean {
  return isActive(actor) && actor.role !== "data_entry" && actor.role !== "door" && actor.role !== "pr";
}

export function canSeePrNames(actor: Actor): boolean {
  return isActive(actor) && (actor.role === "admin" || actor.role === "pr" || actor.role === "data_entry");
}

export function assertRole(actor: Actor, roles: Role[], message = "You can't do that"): void {
  if (!isActive(actor) || !roles.includes(actor.role)) throw new Forbidden(message);
}

/** PRs are forced onto their own id. Data entry and admin must name a PR for RVT sales. */
export function resolveLogger(
  actor: Actor,
  requestedPrId: string | null | undefined,
  side: "rvt" | "collab",
): string | null {
  if (!isActive(actor)) throw new Forbidden();
  if (actor.role === "collab_partner" || actor.role === "door" || actor.role === "ticketing_partner") {
    throw new Forbidden("You can't add guests");
  }
  if (actor.role === "pr") {
    if (side !== "rvt") throw new Forbidden("You can only log your own guests");
    if (requestedPrId && requestedPrId !== actor.id) throw new Forbidden("You can only log your own guests");
    return actor.id;
  }
  if (actor.role === "admin" || actor.role === "data_entry") {
    if (side === "collab") return null;
    if (!requestedPrId) throw new Forbidden("Pick a PR");
    return requestedPrId;
  }
  throw new Forbidden();
}

export type CheckInResult =
  | { result: "inside" }
  | { result: "already_inside"; checkedInAt: string }
  | { result: "not_approved" }
  | { result: "not_verified" };

export function evaluateCheckIn(actor: Actor, sale: Sale, event: EventRow, assignments: Assignment[]): CheckInResult {
  if (!canReadEvent(actor, event, assignments)) throw new Forbidden();
  if (actor.role !== "admin" && actor.role !== "pr" && actor.role !== "door") {
    throw new Forbidden("Door is for door staff, PRs, and admin");
  }
  if (actor.role === "pr" && !assignments.some((row) => row.eventId === event.id && row.profileId === actor.id)) {
    throw new Forbidden();
  }
  if (sale.deletedAt || sale.status === "rejected" || sale.compStatus === "rejected") {
    throw new Forbidden("This guest is not on the list");
  }
  if (sale.isComp && sale.compStatus !== "approved") return { result: "not_approved" };
  if (!sale.isComp && sale.status !== "verified") return { result: "not_verified" };
  if (sale.checkedInAt) return { result: "already_inside", checkedInAt: sale.checkedInAt };
  return { result: "inside" };
}
