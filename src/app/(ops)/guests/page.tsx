import { ActionButton } from "@/components/bits";
import { GuestForm } from "@/components/forms";
import { inr } from "@/domain/money";
import { guestList } from "@/server/ops";
import { loadPage } from "@/server/page";

export const metadata = { title: "Guest list" };

export default async function GuestsPage() {
  const { actor, store, event } = await loadPage();
  if (!event) return <p>No event yet.</p>;
  const list = await guestList(actor, store, event.id);
  return (
    <div className="grid gap-6">
      <header>
        <p className="text-xs uppercase tracking-[0.16em] text-muted">Guest list</p>
        <h1 className="display text-4xl">{event.name}</h1>
      </header>
      {list.rvtTeam && (
        <p className="border border-line bg-panel px-4 py-3">RVT team · {list.rvtTeam.tickets} verified · {inr(list.rvtTeam.amountPaise)}</p>
      )}
      {list.canLog && (
        <GuestForm
          eventId={event.id}
          tickets={list.tickets}
          prs={list.prs}
          showPr={actor.role === "admin" || actor.role === "data_entry"}
          collabName={actor.role === "collab_partner" ? actor.fullName : undefined}
        />
      )}
      <div className="overflow-x-auto border border-line bg-panel">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Phone</th>
              <th className="px-3 py-2 font-medium">Ticket</th>
              <th className="px-3 py-2 font-medium">{actor.role === "collab_partner" ? "Promoter" : "Who"}</th>
              {list.sales.some((sale) => sale.amountPaise != null) && <th className="px-3 py-2 font-medium">Amount</th>}
              <th className="px-3 py-2 font-medium">Status</th>
              {list.canVerify && <th className="px-3 py-2 font-medium"> </th>}
            </tr>
          </thead>
          <tbody>
            {list.sales.map((sale) => (
              <tr key={sale.id} className="border-b border-line">
                <td className="max-w-[12rem] break-words px-3 py-3">{sale.guestName}</td>
                <td className="px-3 py-3">{sale.phoneLast4}</td>
                <td className="px-3 py-3">{sale.ticketTypeName}</td>
                <td className="px-3 py-3">{actor.role === "collab_partner" ? sale.promoterName || "—" : sale.prName || sale.promoterName || "—"}</td>
                {list.sales.some((row) => row.amountPaise != null) && <td className="num px-3 py-3">{sale.amountPaise != null ? inr(sale.amountPaise) : "—"}</td>}
                <td className="px-3 py-3 uppercase">{sale.isComp ? `Comp ${sale.compStatus}` : sale.status}</td>
                {list.canVerify && !sale.isComp && sale.status === "pending" && (
                  <td className="px-3 py-3">
                    <span className="flex gap-2">
                      <ActionButton label="Verify" action="reviewSale" payload={{ id: sale.id, decision: "verified" }} />
                      <ActionButton label="Reject" action="reviewSale" payload={{ id: sale.id, decision: "rejected" }} danger />
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
