import Link from "next/link";
import { DeleteEventButton } from "@/components/forms";
import { organizerKind, partnerNames } from "@/domain/organizer";
import { loadPage } from "@/server/page";

export const metadata = { title: "Events" };

export default async function EventsPage() {
  const { actor, events, store } = await loadPage();
  const showPartners = actor.role === "admin" || actor.role === "data_entry";
  const [profiles, assignments] = showPartners
    ? await Promise.all([store.profiles(), store.assignments()])
    : [[], []];
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="display text-4xl">Events</h1>
        {actor.role === "admin" && <Link href="/events/new" className="bg-ink px-4 py-2 text-paper">New event</Link>}
      </div>
      <ul className="divide-y divide-line border border-line bg-panel">
        {events.map((event) => {
          const staff = assignments.filter((row) => row.eventId === event.id);
          const kind = showPartners ? organizerKind(event, staff, profiles) : null;
          const names = showPartners ? partnerNames(event, staff, profiles) : [];
          return (
            <li key={event.id} className="flex items-stretch gap-2">
              <Link href={`/events/${event.id}`} className="flex min-w-0 flex-1 items-center justify-between px-3 py-4">
                <span className="min-w-0">
                  <span className="display block text-2xl">{event.name}</span>
                  <span className="text-sm text-muted">{event.eventDate} · {event.venue}</span>
                  {kind && (
                    <span className="mt-1 block text-sm">
                      {kind}{names.length ? ` · ${names.join(", ")}` : ""}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-xs uppercase tracking-wider">{event.status}</span>
              </Link>
              {actor.role === "admin" && (
                <div className="flex items-center pr-3">
                  <DeleteEventButton eventId={event.id} eventName={event.name} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {events.length > 1 && <Link href="/events/compare" className="text-sm underline">Compare two events</Link>}
    </div>
  );
}
