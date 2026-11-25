import { Shell } from "@/components/shell";
import { navFor } from "@/domain/paths";
import { loadPage } from "@/server/page";

export const dynamic = "force-dynamic";

const labels: Record<string, string> = {
  admin: "Admin",
  pr: "PR",
  data_entry: "Data entry",
  door: "Door",
  ticketing_partner: "Ticketing",
  collab_partner: "Collab",
};

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const { actor, events, event, unread } = await loadPage();
  return (
    <Shell
      name={actor.fullName}
      roleLabel={labels[actor.role] ?? actor.role}
      nav={navFor(actor.role)}
      events={events.map((row) => ({ id: row.id, name: row.name, date: row.eventDate }))}
      eventId={event?.id ?? null}
      notices={unread.map((row) => ({ id: row.id, title: row.title, body: row.body }))}
    >
      {children}
    </Shell>
  );
}
