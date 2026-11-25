export function Bars({ rows, accent = false }: { rows: { name: string; count: number; amount?: string }[]; accent?: boolean }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  if (!rows.length) return <p className="text-sm text-muted">Nothing here yet.</p>;
  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <div key={row.name}>
          <div className="flex justify-between gap-3 text-sm">
            <span>{row.name}</span>
            <span className="num">{row.count}{row.amount ? ` · ${row.amount}` : ""}</span>
          </div>
          <div className="mt-1 h-2 bg-paper">
            <div className={`h-2 ${accent ? "bg-accent" : "bg-ink"}`} style={{ width: `${Math.max(4, (row.count / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Split({ revenue, expenses }: { revenue: string; expenses: string }) {
  return (
    <div className="grid grid-cols-2 border border-line">
      <div className="border-r border-line p-4">
        <p className="text-xs uppercase tracking-wider text-muted">Ticket money</p>
        <p className="num text-3xl">{revenue}</p>
      </div>
      <div className="p-4">
        <p className="text-xs uppercase tracking-wider text-accent">Expenses</p>
        <p className="num text-3xl">{expenses}</p>
      </div>
    </div>
  );
}
