import { ActionButton } from "@/components/bits";
import { ExpenseForm } from "@/components/forms";
import { inr } from "@/domain/money";
import { ledger } from "@/server/ops";
import { loadPage } from "@/server/page";

export const metadata = { title: "Ledger" };

export default async function LedgerPage() {
  const { actor, store, event } = await loadPage();
  if (!event) return <p>No event yet.</p>;
  const books = await ledger(actor, store, event.id);
  const profit = "profitPaise" in books ? books.profitPaise : undefined;
  return (
    <div className="grid gap-6">
      <header>
        <p className="text-xs uppercase tracking-[0.16em] text-muted">Ledger</p>
        <h1 className="display text-4xl">{event.name}</h1>
      </header>
      {profit != null && <p className="num text-5xl">{inr(profit as number)}</p>}
      {(actor.role === "admin" || actor.role === "data_entry") && event.status !== "settled" && <ExpenseForm eventId={event.id} />}
      <ul className="divide-y divide-line border border-line bg-panel">
        {books.expenses.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 px-3 py-3">
            <span>
              <span className="font-medium">{row.category}</span>
              <span className="mt-1 block text-sm text-muted">{row.description}</span>
            </span>
            <span className="flex items-center gap-3">
              <span className="num text-2xl">{inr(row.amountPaise)}</span>
              {actor.role === "admin" && <ActionButton label="Void" action="voidExpense" payload={{ id: row.id }} danger />}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
