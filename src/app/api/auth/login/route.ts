import { cookies } from "next/headers";
import { homeFor } from "@/domain/paths";
import { AppError } from "@/domain/errors";
import { loginSchema } from "@/domain/schemas";
import { toActor } from "@/server/actor";
import { verifyPassword } from "@/server/crypto";
import { assertCsrf, clientIp, handle, readJson } from "@/server/http";
import { hitLimit, overLimit } from "@/server/rate-limit";
import { cookieBase, sealSeen, sealSession } from "@/server/session";
import { getStore } from "@/server/store";
import { createUserClient, supabaseConfigured } from "@/server/supabase";
import { verifyTurnstile } from "@/server/turnstile";

export async function POST(request: Request) {
  return handle(async () => {
    assertCsrf(request);
    const loginCap = process.env.NODE_ENV === "production" ? 40 : 500;
    const input = loginSchema.parse(await readJson(request));
    if (overLimit(`login-fail:${input.email.toLowerCase()}`, 8, 15 * 60 * 1000)) {
      throw new AppError(429, "Too many tries. Wait a minute and try again.");
    }
    const ip = clientIp(request);
    await Promise.all([
      hitLimit(`login-ip:${ip}`, loginCap, 15 * 60 * 1000),
      verifyTurnstile(input.turnstileToken, ip),
    ]);
    const jar = await cookies();
    if (supabaseConfigured()) {
      const supabase = await createUserClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
      if (error || !data.user) {
        await hitLimit(`login-fail:${input.email.toLowerCase()}`, 8, 15 * 60 * 1000);
        throw new AppError(401, "Email or password is wrong");
      }
      const store = await getStore();
      const profile = await store.profileById(data.user.id);
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
      await hitLimit(`login-fail:${input.email.toLowerCase()}`, 8, 15 * 60 * 1000);
      throw new AppError(401, "Email or password is wrong");
    }
    jar.set("rvt_demo", await sealSession(actor.id), { ...cookieBase(), maxAge: 60 * 60 * 12 });
    jar.set("rvt_seen", await sealSeen(), { ...cookieBase(), maxAge: 60 * 60 * 12 });
    jar.set("rvt_role", actor.role, { ...cookieBase(), maxAge: 60 * 60 * 12 });
    jar.set("rvt_status", actor.status, { ...cookieBase(), maxAge: 60 * 60 * 12 });
    return { home: actor.status === "pending" ? "/pending" : homeFor(actor.role) };
  });
}
