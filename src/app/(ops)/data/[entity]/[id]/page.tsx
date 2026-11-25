import Link from "next/link";
import { notFound } from "next/navigation";
import { isDataEntity } from "@/domain/catalog";
import { dataRows } from "@/server/data";
import { loadPage } from "@/server/page";

export const metadata = { title: "Record" };

export default async function DataRecordPage({ params }: { params: Promise<{ entity: string; id: string }> }) {
  const { actor, store } = await loadPage();
  const { entity, id } = await params;
  if (!isDataEntity(entity)) notFound();
  const rows = await dataRows(actor, store, entity, {});
  const row = rows.find((item) => item.id === id);
  if (!row) notFound();
  return (
    <div className="grid gap-4">
      <Link href={`/data?entity=${entity}`} className="text-sm">Back to {entity}</Link>
      <h1 className="display text-4xl">Record</h1>
      <p className="text-sm text-muted">This screen does not edit the row. Use the guest list, comps, door, settle-up, or people screens.</p>
      <dl className="grid gap-px border border-line bg-line">
        {Object.entries(row.cells).map(([key, value]) => (
          <div key={key} className="grid gap-1 bg-panel px-3 py-3 sm:grid-cols-[180px_1fr]">
            <dt className="text-muted">{key}</dt>
            <dd>{value || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
