import { APP } from "@/config/brand";
import { loadPage } from "@/server/page";

export const metadata = { title: "Waiting" };

export default async function PendingPage() {
  await loadPage();
  return (
    <div className="max-w-lg">
      <h1 className="display text-4xl">Waiting on admin</h1>
      <p className="mt-3">Your login is in. An admin has to approve it before {APP.name} opens the books.</p>
    </div>
  );
}
