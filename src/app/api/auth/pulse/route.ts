import { cookies } from "next/headers";
import { AppError } from "@/domain/errors";
import { assertCsrf, handle } from "@/server/http";
import { currentActor } from "@/server/actor";
import { cookieBase, idleMs, sealSeen, seenAgeMs } from "@/server/session";

export async function POST(request: Request) {
  return handle(async () => {
    assertCsrf(request);
    const actor = await currentActor();
    if (!actor) throw new AppError(401, "Sign in required");
    const jar = await cookies();
    const age = await seenAgeMs(jar.get("rvt_seen")?.value);
    if (age != null && age > idleMs()) throw new AppError(401, "Session timed out");
    jar.set("rvt_seen", await sealSeen(), { ...cookieBase(), maxAge: 60 * 60 * 12 });
    return { ok: true };
  });
}
