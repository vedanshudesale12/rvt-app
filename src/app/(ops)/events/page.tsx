import Link from "next/link";
import { loadPage } from "@/server/page";

export const metadata = { title: "Events" };

export default async function EventsPage() {
  const { actor, events } = await loadPage();
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="display text-4xl">Events</h1>
        {actor.role === "admin" && <Link href="/events/new" className="bg-ink px-4 py-2 text-paper">New event</Link>}
      </div>
      <ul className="divide-y divide-line border border-line bg-panel">
        {events.map((event) => (
          <li key={event.id}>
            <Link href={`/events/${event.id}`} className="flex items-center justify-between px-3 py-4">
              <span>
                <span className="display block text-2xl">{event.name}</span>
                <span className="text-sm text-muted">{event.eventDate} · {event.venue}</span>
              </span>
              <span className="text-xs uppercase tracking-wider">{event.status}{event.isCollab ? " · collab" : ""}</span>
            </Link>
          </li>
        ))}
      </ul>
      {events.length > 1 && <Link href="/events/compare" className="text-sm underline">Compare two events</Link>}
    </div>
  );
}
