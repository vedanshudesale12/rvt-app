import { AppError } from "@/domain/errors";
import { currentActor } from "@/server/actor";
import { handle } from "@/server/http";
import { hitLimit } from "@/server/rate-limit";
import { doorSearch } from "@/server/ops";
import { getStore } from "@/server/store";

export async function GET(request: Request) {
  return handle(async () => {
    const actor = await currentActor();
    if (!actor) throw new AppError(401, "Sign in required");
    await hitLimit(`door:${actor.id}`, 240, 60 * 1000);
    const url = new URL(request.url);
    const eventId = url.searchParams.get("event") ?? "";
    const query = url.searchParams.get("q") ?? "";
    return doorSearch(actor, await getStore(), eventId, query);
  });
}
