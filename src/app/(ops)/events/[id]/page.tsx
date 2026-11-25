import Link from "next/link";
import { formatDate, formatWhen, inr } from "@/domain/money";
import { organizerKind, partnerNames } from "@/domain/organizer";
import { loadPage } from "@/server/page";
import { notFound } from "next/navigation";

export const metadata = { title: "Event" };

export default async function EventDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor, store, events } = await loadPage();
  const event = events.find((row) => row.id === id);
  if (!event) notFound();
  const [tickets, assignments, profiles] = await Promise.all([
    store.tickets().then((rows) => rows.filter((ticket) => ticket.eventId === event.id)),
    store.assignments(),
    store.profiles(),
  ]);
  const staff = assignments.filter((row) => row.eventId === event.id);
  const kind = organizerKind(event, staff, profiles);
  const names = partnerNames(event, staff, profiles);
  const shares =
    event.collabShares && event.collabShares.length > 0
      ? event.collabShares
      : event.isCollab
        ? [{ brand: event.collabBrand, splitBps: event.collabSplitBps, partnerId: event.collabPartnerId }]
        : [];
  return (
    <div className="grid gap-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{event.status}</p>
      <h1 className="display text-4xl">{event.name}</h1>
      <p>{formatDate(event.eventDate)} · {formatWhen(event.startsAt)}<br />{event.venue}</p>
      {(actor.role === "admin" || actor.role === "data_entry") && (
        <p>{kind}{names.length ? ` · ${names.join(", ")}` : ""}</p>
      )}
      {shares.length > 0 && (actor.role === "admin" || actor.role === "collab_partner" || actor.role === "data_entry") && (
        <ul className="grid gap-1 text-sm">
          {shares.map((share) => (
            <li key={`${share.partnerId}-${share.brand}`}>
              Collab with {share.brand}. Their share is {share.splitBps / 100}% of profit, taken before the RVT split.
            </li>
          ))}
        </ul>
      )}
      <ul className="divide-y divide-line border border-line bg-panel">
        {tickets.map((ticket) => (
          <li key={ticket.id} className="flex justify-between px-3 py-3"><span>{ticket.name}</span><span className="num">{inr(ticket.pricePaise)}</span></li>
        ))}
      </ul>
      {actor.role === "admin" && <p className="text-sm text-muted">PR cut {inr(event.prCommissionPaise)} per verified paid guest. Bar {inr(event.barRevenuePaise)}, {event.barPartnerName || "bar"} keeps {event.barSplitBps / 100}%.</p>}
      {actor.role === "admin" && <Link href={`/events/${event.id}/edit`} className="justify-self-start border border-ink px-4 py-2">Edit event</Link>}
    </div>
  );
}
