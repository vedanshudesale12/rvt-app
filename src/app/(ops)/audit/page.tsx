import { formatWhen } from "@/domain/money";
import { auditLog } from "@/server/ops";
import { loadPage } from "@/server/page";

export const metadata = { title: "Audit" };

export default async function AuditPage() {
  const { actor, store } = await loadPage();
  const rows = await auditLog(actor, store);
  return (
    <div className="grid gap-4">
      <h1 className="display text-4xl">Audit</h1>
      <ul className="divide-y divide-line border border-line bg-panel text-sm">
        {rows.map((row) => (
          <li key={row.id} className="grid gap-1 px-3 py-3 md:grid-cols-[160px_1fr]">
            <span className="text-muted">{formatWhen(row.createdAt)}</span>
            <span>{row.action} · {row.entity}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
