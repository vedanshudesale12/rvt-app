import { cookies } from "next/headers";
import { homeFor } from "@/domain/paths";
import { AppError } from "@/domain/errors";
import { loginSchema } from "@/domain/schemas";
import { toActor } from "@/server/actor";
import { verifyPassword } from "@/server/crypto";
import { assertCsrf, clientIp, handle, readJson } from "@/server/http";
import { hitLimit } from "@/server/rate-limit";
import { cookieBase, sealSeen, sealSession } from "@/server/session";
import { getStore } from "@/server/store";
import { createUserClient, supabaseConfigured } from "@/server/supabase";
import { verifyTurnstile } from "@/server/turnstile";

export async function POST(request: Request) {
  return handle(async () => {
    assertCsrf(request);
    await hitLimit(`login:${clientIp(request)}`, 8, 15 * 60 * 1000);
    const input = loginSchema.parse(await readJson(request));
    await verifyTurnstile(input.turnstileToken, clientIp(request));
    const jar = await cookies();
    if (supabaseConfigured()) {
      const supabase = await createUserClient();
      const { error } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
      if (error) throw new AppError(401, "Email or password is wrong");
      const { data } = await supabase.auth.getUser();
      const store = await getStore();
      const profile = (await store.profiles()).find((row) => row.id === data.user?.id);
      const actor = profile ? toActor(profile) : null;
      if (!actor) throw new AppError(403, "This login is turned off");
      jar.set("rvt_seen", await sealSeen(), { ...cookieBase(), maxAge: 60 * 60 * 12 });
      jar.set("rvt_role", actor.role, { ...cookieBase(), maxAge: 60 * 60 * 12 });
      jar.set("rvt_status", actor.status, { ...cookieBase(), maxAge: 60 * 60 * 12 });
      return { home: actor.status === "pending" ? "/pending" : homeFor(actor.role) };
    }
    const store = await getStore();
    const user = await store.userByEmail(input.email);
    const actor = user ? toActor(user.profile) : null;
    if (!user || !actor || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new AppError(401, "Email or password is wrong");
    }
    jar.set("rvt_demo", await sealSession(actor.id), { ...cookieBase(), maxAge: 60 * 60 * 12 });
    jar.set("rvt_seen", await sealSeen(), { ...cookieBase(), maxAge: 60 * 60 * 12 });
    jar.set("rvt_role", actor.role, { ...cookieBase(), maxAge: 60 * 60 * 12 });
    jar.set("rvt_status", actor.status, { ...cookieBase(), maxAge: 60 * 60 * 12 });
    return { home: actor.status === "pending" ? "/pending" : homeFor(actor.role) };
  });
}
