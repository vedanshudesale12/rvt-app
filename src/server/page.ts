import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { canAccessPath, homeFor } from "@/domain/paths";
import { requireActor, selectedEventId } from "@/server/actor";
import { eventsFor, notices } from "@/server/ops";
import { getStore } from "@/server/store";

export const loadPage = cache(async function loadPage() {
  const actor = await requireActor();
  const path = (await headers()).get("x-rvt-path");
  if (path && actor.status === "pending" && path !== "/pending") redirect("/pending");
  if (path && !canAccessPath(actor, path)) redirect(homeFor(actor.role));
  const store = await getStore();
  const events = await eventsFor(actor, store);
  const eventId = await selectedEventId(events);
  const event = events.find((row) => row.id === eventId) ?? null;
  const unread = await notices(actor, store);
  return { actor, store, events, event, unread };
});
