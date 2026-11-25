import Link from "next/link";
import { DATA_ENTITIES, isDataEntity, type DataEntity } from "@/domain/catalog";
import { SheetsSync } from "@/components/sheets-sync";
import { dataRows } from "@/server/data";
import { loadPage } from "@/server/page";
import { sheetsConfigured } from "@/server/sheets";

export const metadata = { title: "Data" };

export default async function DataPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; q?: string; sort?: string; dir?: string; status?: string }>;
}) {
  const { actor, store } = await loadPage();
  const query = await searchParams;
  const entity: DataEntity = query.entity && isDataEntity(query.entity) ? query.entity : "events";
  const rows = await dataRows(actor, store, entity, query);
  const columns = rows[0] ? Object.keys(rows[0].cells) : [];
  const href = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { entity, q: query.q, sort: query.sort, dir: query.dir, status: query.status, ...next };
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    return `/data?${params.toString()}`;
  };
  return (
    <div className="grid gap-4">
      <header className="grid gap-2">
        <h1 className="display text-4xl">Data</h1>
        <p className="max-w-2xl text-sm text-muted">
          Read-only books. Add a guest, approve a comp, check someone in, or settle an event from those screens. Those actions are written to the audit log.
        </p>
      </header>
      <div className="flex flex-wrap gap-2 text-sm">
        {DATA_ENTITIES.map((item) => (
          <Link key={item.id} href={href({ entity: item.id, sort: undefined, status: undefined })} className={item.id === entity ? "border border-ink px-2 py-1" : "border border-line px-2 py-1"}>
            {item.label}
          </Link>
        ))}
      </div>
      <form className="flex flex-wrap gap-2" action="/data">
        <input type="hidden" name="entity" value={entity} />
        <input name="q" defaultValue={query.q ?? ""} placeholder="Search" className="border border-line bg-panel px-2 py-2" />
        <input name="status" defaultValue={query.status ?? ""} placeholder="Status" className="border border-line bg-panel px-2 py-2" />
        <button type="submit" className="border border-line px-3 py-2">Filter</button>
      </form>
      <div className="flex flex-wrap gap-3 text-sm">
        <a href={`/api/data?entity=${entity}&format=csv`}>Download this table</a>
        <a href="/api/data?entity=all&format=full">Download everything</a>
      </div>
      <SheetsSync configured={sheetsConfigured()} />
      <div className="overflow-x-auto border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line">
              {columns.map((column) => (
                <th key={column} className="px-2 py-2 font-normal">
                  <Link href={href({ sort: column, dir: query.sort === column && query.dir !== "desc" ? "desc" : "asc" })}>{column}</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 200).map((row) => (
              <tr key={row.id} className="border-b border-line">
                {columns.map((column, index) => (
                  <td key={column} className="px-2 py-2">
                    {index === 0 ? <Link href={`/data/${entity}/${row.id}`}>{row.cells[column]}</Link> : row.cells[column]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="px-3 py-4 text-sm text-muted">Nothing matches.</p>}
        {rows.length > 200 && <p className="px-3 py-3 text-sm text-muted">Showing 200 of {rows.length}. Download the CSV for the rest.</p>}
      </div>
    </div>
  );
}
