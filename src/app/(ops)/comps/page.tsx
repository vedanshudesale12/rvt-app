import { ActionButton } from "@/components/bits";
import { CompForm } from "@/components/forms";
import { guestList } from "@/server/ops";
import { loadPage } from "@/server/page";

export const metadata = { title: "Comps" };

export default async function CompsPage() {
  const { actor, store, event } = await loadPage();
  if (!event) return <p>No event yet.</p>;
  const list = await guestList(actor, store, event.id);
  const comps = list.sales.filter((sale) => sale.isComp);
  return (
    <div className="grid gap-6">
      <h1 className="display text-4xl">Comps</h1>
      {list.canLog && <CompForm eventId={event.id} tickets={list.tickets} prs={list.prs} showPr={actor.role !== "pr"} />}
      <ul className="divide-y divide-line border border-line bg-panel">
        {comps.map((sale) => (
          <li key={sale.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
            <span>
              <span className="display text-2xl">{sale.guestName}</span>
              <span className="mt-1 block text-sm text-muted">{sale.ticketTypeName} · {sale.compStatus}{sale.prName ? ` · ${sale.prName}` : ""}</span>
            </span>
            {actor.role === "admin" && sale.compStatus === "pending" && (
              <span className="flex gap-2">
                <ActionButton label="Approve" action="reviewComp" payload={{ id: sale.id, decision: "approved" }} />
                <ActionButton label="Reject" action="reviewComp" payload={{ id: sale.id, decision: "rejected" }} danger />
              </span>
            )}
          </li>
        ))}
        {comps.length === 0 && <li className="px-3 py-4 text-sm text-muted">No comps.</li>}
      </ul>
    </div>
  );
}
