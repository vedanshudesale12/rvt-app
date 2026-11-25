import { ActionButton } from "@/components/bits";
import { inr } from "@/domain/money";
import { settlementView } from "@/server/ops";
import { loadPage } from "@/server/page";

export const metadata = { title: "Who owes what" };

export default async function SettlePage() {
  const { actor, store, event } = await loadPage();
  if (!event) return <p>No event yet.</p>;
  const view = await settlementView(actor, store, event.id);
  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Who owes what</p>
          <h1 className="display text-4xl">{event.name}</h1>
        </div>
        {view.canSettle && <ActionButton label="Mark settled" action="settle" payload={{ eventId: event.id }} />}
      </header>
      {"profitPaise" in view && view.profitPaise != null && (
        <section className="grid gap-px bg-line sm:grid-cols-3">
          <Stat label="Profit" value={inr(view.profitPaise as number)} />
          {"collabSharePaise" in view && <Stat label={String(view.collabBrand || "Collab")} value={inr(view.collabSharePaise as number)} />}
          {"vedanshuPaise" in view && <Stat label="Vedanshu" value={inr(view.vedanshuPaise as number)} />}
          {"rishabPaise" in view && <Stat label="Rishab" value={inr(view.rishabPaise as number)} />}
        </section>
      )}
      {"prLines" in view && Array.isArray(view.prLines) && (
        <Lines title="PRs" rows={view.prLines as { id: string; name: string; commissionPaise: number; collectedPaise: number; dueToCompanyPaise: number }[]} />
      )}
      {"ticketingLines" in view && Array.isArray(view.ticketingLines) && (
        <Lines title="Ticketing" rows={view.ticketingLines as { id: string; name: string; commissionPaise: number; collectedPaise: number; dueToCompanyPaise: number }[]} />
      )}
      <p className="text-sm text-muted">
        {actor.role === "admin"
          ? "A positive due means they still owe the company. A collab share comes out before the two owners split what is left."
          : "A positive number is what you still owe the company."}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="bg-panel p-4"><p className="text-xs uppercase tracking-wider text-muted">{label}</p><p className="num mt-2 text-3xl">{value}</p></div>;
}

function Lines({ title, rows }: { title: string; rows: { id: string; name: string; commissionPaise: number; collectedPaise: number; dueToCompanyPaise: number }[] }) {
  return (
    <section>
      <h2 className="display mb-3 text-2xl">{title}</h2>
      <ul className="divide-y divide-line border border-line bg-panel">
        {rows.map((row) => (
          <li key={row.id} className="grid gap-1 px-3 py-3 sm:grid-cols-4">
            <span>{row.name}</span>
            <span className="text-sm text-muted">Collected {inr(row.collectedPaise)}</span>
            <span className="text-sm text-muted">Cut {inr(row.commissionPaise)}</span>
            <span className="num">{inr(row.dueToCompanyPaise)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
