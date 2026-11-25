import { inr } from "@/domain/money";
import { leaderboard } from "@/server/ops";
import { loadPage } from "@/server/page";

export const metadata = { title: "Leaderboard" };

export default async function LeaderboardPage() {
  const { actor, store } = await loadPage();
  const board = await leaderboard(actor, store);
  return (
    <div className="grid gap-4">
      <h1 className="display text-4xl">{board.kind === "ticketing" ? "Ticketing board" : "PR board"}</h1>
      <ol className="divide-y divide-line border border-line bg-panel">
        {board.rows.map((row, index) => (
          <li key={row.name} className="flex items-center justify-between px-3 py-3">
            <span><span className="num mr-3 text-2xl">{index + 1}</span>{row.name}</span>
            <span className="text-right">
              <span className="num block text-2xl">{row.tickets}</span>
              {row.revenuePaise != null && <span className="text-xs text-muted">{inr(row.revenuePaise)}</span>}
            </span>
          </li>
        ))}
      </ol>
      {board.collabRows.length > 0 && (
        <>
          <h2 className="display text-2xl">Collab promoters</h2>
          <ol className="divide-y divide-line border border-line bg-panel">
            {board.collabRows.map((row, index) => (
              <li key={row.name} className="flex items-center justify-between px-3 py-3">
                <span><span className="num mr-3 text-2xl">{index + 1}</span>{row.name}</span>
                <span className="num text-2xl">{row.tickets}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
