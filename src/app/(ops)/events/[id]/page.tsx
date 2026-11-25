import { formatDate, formatWhen, inr } from "@/domain/money";
import { loadPage } from "@/server/page";
import { notFound } from "next/navigation";

export const metadata = { title: "Event" };

export default async function EventDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor, store, events } = await loadPage();
  const event = events.find((row) => row.id === id);
  if (!event) notFound();
  const tickets = (await store.tickets()).filter((ticket) => ticket.eventId === event.id);
  return (
    <div className="grid gap-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{event.status}</p>
      <h1 className="display text-4xl">{event.name}</h1>
      <p>{formatDate(event.eventDate)} · {formatWhen(event.startsAt)}<br />{event.venue}</p>
      {event.isCollab && <p>Collab with {event.collabBrand}. Their share is {event.collabSplitBps / 100}% of profit, taken before the RVT split.</p>}
      <ul className="divide-y divide-line border border-line bg-panel">
        {tickets.map((ticket) => (
          <li key={ticket.id} className="flex justify-between px-3 py-3"><span>{ticket.name}</span><span className="num">{inr(ticket.pricePaise)}</span></li>
        ))}
      </ul>
      {actor.role === "admin" && <p className="text-sm text-muted">PR cut {inr(event.prCommissionPaise)} per verified paid guest. Bar {inr(event.barRevenuePaise)}, {event.barPartnerName || "bar"} keeps {event.barSplitBps / 100}%.</p>}
    </div>
  );
}
