import { EventForm } from "@/components/forms";
import { loadPage } from "@/server/page";
import { notFound } from "next/navigation";

export const metadata = { title: "Edit event" };

function timeInKolkata(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const hour = parts.find((part) => part.type === "hour")?.value ?? "21";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor, store, events } = await loadPage();
  if (actor.role !== "admin") return <p>Admin only.</p>;
  const event = events.find((row) => row.id === id);
  if (!event) notFound();
  const [profiles, tickets, assignments] = await Promise.all([store.profiles(), store.tickets(), store.assignments()]);
  const prs = profiles.filter((profile) => profile.role === "pr" && profile.status === "active").map((profile) => ({ id: profile.id, fullName: profile.fullName }));
  const partners = profiles.filter((profile) => profile.role === "collab_partner").map((profile) => ({ id: profile.id, fullName: profile.fullName }));
  const ticketing = profiles.filter((profile) => profile.role === "ticketing_partner" && profile.status === "active").map((profile) => ({ id: profile.id, fullName: profile.fullName }));
  const staff = assignments.filter((row) => row.eventId === event.id);
  const eventTickets = tickets.filter((ticket) => ticket.eventId === event.id);
  const male = eventTickets.find((ticket) => ticket.name === "Male") ?? eventTickets[0];
  const female = eventTickets.find((ticket) => ticket.name === "Female") ?? eventTickets[1] ?? eventTickets[0];
  const shares =
    event.collabShares && event.collabShares.length > 0
      ? event.collabShares
      : event.isCollab && event.collabPartnerId
        ? [{ brand: event.collabBrand, splitBps: event.collabSplitBps, partnerId: event.collabPartnerId }]
        : [];
  return (
    <div className="grid gap-4">
      <h1 className="display text-4xl">Edit event</h1>
      <EventForm
        prs={prs}
        partners={partners}
        ticketing={ticketing}
        event={{
          id: event.id,
          name: event.name,
          eventDate: event.eventDate,
          time: timeInKolkata(event.startsAt),
          venue: event.venue,
          male: (male?.pricePaise ?? 0) / 100,
          female: (female?.pricePaise ?? 0) / 100,
          maleId: male?.id,
          femaleId: female?.id,
          commission: event.prCommissionPaise / 100,
          bar: event.barRevenuePaise / 100,
          barSplit: event.barSplitBps / 100,
          barPartner: event.barPartnerName,
          isCollab: event.isCollab,
          prIds: staff.filter((row) => prs.some((pr) => pr.id === row.profileId)).map((row) => row.profileId),
          collabPartners: shares.filter((share) => share.partnerId).map((share) => ({
            id: share.partnerId as string,
            brand: share.brand,
            splitPercent: share.splitBps / 100,
          })),
          ticketingPartners: staff
            .filter((row) => ticketing.some((partner) => partner.id === row.profileId))
            .map((row) => ({
              id: row.profileId,
              flatRupees: (row.commissionPaise ?? 10_000) / 100,
              percent: row.commissionBps == null ? null : row.commissionBps / 100,
            })),
        }}
      />
    </div>
  );
}
