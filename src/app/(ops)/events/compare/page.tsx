import { inr } from "@/domain/money";
import { compare } from "@/server/ops";
import { loadPage } from "@/server/page";

export const metadata = { title: "Compare" };

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const { actor, store, events } = await loadPage();
  const query = await searchParams;
  const a = query.a || events[0]?.id;
  const b = query.b || events[1]?.id;
  const result = a && b ? await compare(actor, store, a, b) : null;
  return (
    <div className="grid gap-4">
      <h1 className="display text-4xl">Compare</h1>
      <form className="flex flex-wrap gap-3" action="/events/compare">
        <select name="a" defaultValue={a} className="border border-line bg-panel px-2 py-2">{events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}</select>
        <select name="b" defaultValue={b} className="border border-line bg-panel px-2 py-2">{events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}</select>
        <button className="border border-ink px-3 py-2">Show</button>
      </form>
      {result && (
        <div className="grid gap-px bg-line sm:grid-cols-2">
          {[result.a, result.b].map((side) => (
            <div key={side.id} className="bg-panel p-4">
              <p className="display text-2xl">{side.name}</p>
              <p className="text-sm text-muted">{side.date}</p>
              <p className="num mt-3 text-4xl">{side.tickets}</p>
              {side.revenuePaise != null && <p className="text-sm">{inr(side.revenuePaise)}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
