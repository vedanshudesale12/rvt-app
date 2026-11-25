import { AppError } from "@/domain/errors";
import { currentActor } from "@/server/actor";
import { dataCsv, dataDump, dataRows, syncSheets } from "@/server/data";
import { assertCsrf, json } from "@/server/http";
import { getStore } from "@/server/store";

function queryOf(url: URL) {
  return {
    q: url.searchParams.get("q") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    dir: url.searchParams.get("dir") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const actor = await currentActor();
    if (!actor) return json({ error: "Sign in required" }, 401);
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "json";
    const entity = url.searchParams.get("entity") ?? "events";
    const store = await getStore();
    if (format === "full" || entity === "all") {
      return json(await dataDump(actor, store));
    }
    if (format === "csv") {
      const csv = await dataCsv(actor, store, entity, queryOf(url));
      return new Response(csv, {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="${entity}.csv"`,
        },
      });
    }
    return json({ rows: await dataRows(actor, store, entity, queryOf(url)) });
  } catch (error) {
    if (error instanceof AppError) return json({ error: error.message }, error.status);
    console.error(error);
    return json({ error: "Something went wrong" }, 500);
  }
}

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const actor = await currentActor();
    if (!actor) return json({ error: "Sign in required" }, 401);
    return json(await syncSheets(actor, await getStore()));
  } catch (error) {
    if (error instanceof AppError) return json({ error: error.message }, error.status);
    console.error(error);
    return json({ error: "Something went wrong" }, 500);
  }
}
