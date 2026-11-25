import { PeopleForms } from "@/components/forms";
import { people } from "@/server/ops";
import { loadPage } from "@/server/page";

export const metadata = { title: "People" };

export default async function PeoplePage() {
  const { actor, store } = await loadPage();
  const rows = await people(actor, store);
  return (
    <div className="grid gap-4">
      <h1 className="display text-4xl">People</h1>
      <PeopleForms people={rows.map((row) => ({ id: row.id, fullName: row.fullName, status: row.status, role: row.role }))} />
    </div>
  );
}
