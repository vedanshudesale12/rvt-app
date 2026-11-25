import { safeEqual } from "@/server/bytes";
import { createAdminClient, supabaseConfigured } from "@/server/supabase";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!secret || !token || !safeEqual(token, secret)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (!supabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ ok: true, skipped: true });
  }
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").select("id", { head: true, count: "exact" });
  if (error) return Response.json({ ok: false }, { status: 500 });
  return Response.json({ ok: true, at: new Date().toISOString() });
}
