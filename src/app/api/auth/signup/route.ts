import { cookies } from "next/headers";
import { homeFor } from "@/domain/paths";
import { signupSchema } from "@/domain/schemas";
import { assertCsrf, clientIp, handle, readJson } from "@/server/http";
import { hitLimit } from "@/server/rate-limit";
import { cookieBase, sealSeen, sealSession } from "@/server/session";
import { getStore } from "@/server/store";
import { signupUser } from "@/server/ops";
import { createAdminClient, createUserClient, supabaseConfigured } from "@/server/supabase";
import { verifyTurnstile } from "@/server/turnstile";
import { encryptField, hmacValue } from "@/server/crypto";
import { cleanText, last4, normalizePhone } from "@/domain/text";

export async function POST(request: Request) {
  return handle(async () => {
    assertCsrf(request);
    await hitLimit(`signup:${clientIp(request)}`, 5, 60 * 60 * 1000);
    const input = signupSchema.parse(await readJson(request));
    await verifyTurnstile(input.turnstileToken, clientIp(request));
    const jar = await cookies();
    if (supabaseConfigured()) {
      const admin = createAdminClient();
      const created = await admin.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: { full_name: cleanText(input.fullName, 120) },
      });
      if (created.error || !created.data.user) throw new Error(created.error?.message || "Could not create the login");
      const phone = normalizePhone(input.phone);
      const { error } = await admin.rpc("rvt_service_complete_signup", {
        p_user_id: created.data.user.id,
        p_full_name: cleanText(input.fullName, 120),
        p_email: input.email,
        p_role: input.role,
        p_instagram: input.instagram ?? "",
        p_college: input.college ?? "",
        p_area: input.area ?? "",
        p_referrer: input.referrer ?? "",
        p_photo_path: input.photoPath ?? null,
        p_phone_ciphertext: await encryptField(phone),
        p_phone_hmac: await hmacValue(phone),
        p_phone_last4: last4(phone),
        p_upi_ciphertext: input.upi ? await encryptField(cleanText(input.upi, 80)) : null,
      });
      if (error) throw new Error(error.message);
      const supabase = await createUserClient();
      const signed = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
      if (signed.error) throw new Error(signed.error.message);
      const status = input.role === "pr" ? "active" : "pending";
      jar.set("rvt_seen", await sealSeen(), { ...cookieBase(), maxAge: 60 * 60 * 12 });
      jar.set("rvt_role", input.role, { ...cookieBase(), maxAge: 60 * 60 * 12 });
      jar.set("rvt_status", status, { ...cookieBase(), maxAge: 60 * 60 * 12 });
      return { home: status === "pending" ? "/pending" : homeFor(input.role) };
    }
    const profile = await signupUser(input, await getStore());
    jar.set("rvt_demo", await sealSession(profile.id), { ...cookieBase(), maxAge: 60 * 60 * 12 });
    jar.set("rvt_seen", await sealSeen(), { ...cookieBase(), maxAge: 60 * 60 * 12 });
    jar.set("rvt_role", profile.role ?? "pr", { ...cookieBase(), maxAge: 60 * 60 * 12 });
    jar.set("rvt_status", profile.status, { ...cookieBase(), maxAge: 60 * 60 * 12 });
    return { home: profile.status === "pending" ? "/pending" : homeFor(profile.role ?? "pr") };
  });
}
