import { Logo } from "@/components/logo";
import { DoorBoard } from "@/components/forms";
import { loadPage } from "@/server/page";

export const metadata = { title: "Door" };

export default async function DoorPage() {
  const { event } = await loadPage();
  if (!event) return <p>No event yet.</p>;
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <Logo lockup className="h-auto w-36" />
        <div>
          <h1 className="display text-3xl">{event.name}</h1>
          <p className="text-sm text-muted">{event.venue}</p>
        </div>
      </div>
      <DoorBoard eventId={event.id} />
    </div>
  );
}
