import { inr } from "@/domain/money";
import { ticketingHome } from "@/server/ops";
import { loadPage } from "@/server/page";

export const metadata = { title: "Ticketing" };

export default async function TicketingPage() {
  const { actor, store, event } = await loadPage();
  const home = await ticketingHome(actor, store, event?.id ?? null);
  return (
    <div className="grid gap-6">
      <h1 className="display text-4xl">Ticketing</h1>
      <section>
        <h2 className="display mb-3 text-2xl">Your board</h2>
        <ol className="divide-y divide-line border border-line bg-panel">
          {home.board.map((row) => (
            <li key={row.name} className="flex justify-between px-3 py-3">
              <span>{row.name}</span>
              <span className="num">{row.tickets}{row.revenuePaise != null ? ` · ${inr(row.revenuePaise)}` : ""}</span>
            </li>
          ))}
        </ol>
      </section>
      {home.event && (
        <section>
          <h2 className="display mb-3 text-2xl">{home.event.name}</h2>
          <ul className="divide-y divide-line border border-line bg-panel">
            {home.sales.map((sale) => (
              <li key={sale.id} className="flex justify-between px-3 py-3">
                <span>{sale.guestName}<span className="block text-sm text-muted">{sale.ticketTypeName}</span></span>
                <span className="num">{sale.amountPaise != null ? inr(sale.amountPaise) : sale.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
