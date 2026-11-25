import { cookies } from "next/headers";
import { handle } from "@/server/http";
import { createUserClient, supabaseConfigured } from "@/server/supabase";

export async function POST() {
  return handle(async () => {
    if (supabaseConfigured()) {
      const supabase = await createUserClient();
      await supabase.auth.signOut();
    }
    const jar = await cookies();
    jar.delete("rvt_demo");
    jar.delete("rvt_role");
    jar.delete("rvt_status");
    jar.delete("rvt_seen");
    return { ok: true };
  });
}
