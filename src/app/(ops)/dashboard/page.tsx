import { Bars, Split, Trend } from "@/components/charts";
import { inr } from "@/domain/money";
import { dashboard } from "@/server/ops";
import { loadPage } from "@/server/page";

export const metadata = { title: "Tonight" };

export default async function DashboardPage() {
  const { actor, store, event } = await loadPage();
  if (!event) return <p>No event yet.</p>;
  const view = await dashboard(actor, store, event.id);
  return (
    <div className="grid gap-6">
      <header>
        <p className="text-xs uppercase tracking-[0.16em] text-muted">Tonight</p>
        <h1 className="display text-4xl">{view.eventName}</h1>
      </header>
      <section className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Guests" value={String(view.cards.guests ?? 0)} />
        <Card label="Verified" value={String(view.cards.verified ?? 0)} />
        <Card label="Waiting" value={String(view.cards.pending ?? 0)} />
        {view.cards.profitPaise != null ? <Card label="Live profit" value={inr(view.cards.profitPaise)} /> : <Card label="Comps" value={String(view.cards.comps ?? 0)} />}
      </section>
      {view.revenueVsExpenses && <Split revenue={inr(view.revenueVsExpenses.revenuePaise)} expenses={inr(view.revenueVsExpenses.expensesPaise)} />}
      {view.rvtTeam && (
        <p className="border border-line bg-panel px-4 py-3">
          RVT team · <span className="num">{view.rvtTeam.tickets}</span> verified · {inr(view.rvtTeam.amountPaise)}
        </p>
      )}
      {view.byOrganizer && view.byOrganizer.length > 0 && (
        <section className="border border-line bg-panel p-4">
          <h2 className="display mb-4 text-2xl">By organizer / Collab</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-muted">
                <th className="py-2 pr-3 font-medium">Organizer</th>
                <th className="py-2 pr-3 font-medium">Guests</th>
                <th className="py-2 pr-3 font-medium">Verified</th>
                <th className="py-2 pr-3 font-medium">Ticket money</th>
                <th className="py-2 font-medium">Split</th>
              </tr>
            </thead>
            <tbody>
              {view.byOrganizer.map((row) => (
                <tr key={row.label} className="border-t border-line">
                  <td className="py-3 pr-3">{row.label}</td>
                  <td className="num py-3 pr-3">{row.guests}</td>
                  <td className="num py-3 pr-3">{row.verified}</td>
                  <td className="num py-3 pr-3">{inr(row.ticketPaise)}</td>
                  <td className="num py-3">{inr(row.splitPaise)}{row.splitNote ? ` · ${row.splitNote}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      <section className="border border-line bg-panel p-4">
        <h2 className="display mb-4 text-2xl">Sales</h2>
        <Trend points={view.salesOverTime} />
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border border-line bg-panel p-4">
          <h2 className="display mb-4 text-2xl">By ticket</h2>
          <Bars rows={view.byTicket.map((row) => ({ name: row.name, count: row.count, amount: row.amountPaise != null ? inr(row.amountPaise) : undefined }))} />
        </section>
        <section className="border border-line bg-panel p-4">
          <h2 className="display mb-4 text-2xl">By promoter</h2>
          <Bars accent rows={view.byPr.map((row) => ({ name: row.name, count: row.count, amount: row.amountPaise != null ? inr(row.amountPaise) : undefined }))} />
        </section>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="num mt-2 text-4xl">{value}</p>
    </div>
  );
}
