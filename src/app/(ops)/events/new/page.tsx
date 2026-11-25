import { EventForm } from "@/components/forms";
import { loadPage } from "@/server/page";

export const metadata = { title: "New event" };

export default async function NewEventPage() {
  const { actor, store } = await loadPage();
  if (actor.role !== "admin") return <p>Admin only.</p>;
  const profiles = await store.profiles();
  const prs = profiles.filter((profile) => profile.role === "pr" && profile.status === "active").map((profile) => ({ id: profile.id, fullName: profile.fullName }));
  const partners = profiles.filter((profile) => profile.role === "collab_partner").map((profile) => ({ id: profile.id, fullName: profile.fullName }));
  const ticketing = profiles.filter((profile) => profile.role === "ticketing_partner" && profile.status === "active").map((profile) => ({ id: profile.id, fullName: profile.fullName }));
  return (
    <div className="grid gap-4">
      <h1 className="display text-4xl">New event</h1>
      <EventForm prs={prs} partners={partners} ticketing={ticketing} />
    </div>
  );
}
