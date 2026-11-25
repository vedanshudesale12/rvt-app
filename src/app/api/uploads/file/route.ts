import { assertStoragePath } from "@/domain/text";
import { currentActor } from "@/server/actor";
import { getStore } from "@/server/store";
import { createAdminClient, supabaseConfigured } from "@/server/supabase";

export async function GET(request: Request) {
  const actor = await currentActor();
  if (!actor) return Response.json({ error: "Sign in required" }, { status: 401 });
  const path = new URL(request.url).searchParams.get("path") ?? "";
  try {
    assertStoragePath(path);
  } catch {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const owner = path.split("/")[1];
  if (actor.role !== "admin" && owner !== actor.id) return Response.json({ error: "Not found" }, { status: 404 });
  if (supabaseConfigured()) {
    const admin = createAdminClient();
    const bucket = path.startsWith("avatars/") ? "avatars" : "proofs";
    const objectPath = path.split("/").slice(1).join("/");
    const signed = await admin.storage.from(bucket).createSignedUrl(objectPath, 60);
    if (signed.error || !signed.data?.signedUrl) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.redirect(signed.data.signedUrl, 302);
  }
  const file = await (await getStore()).getFile(path);
  if (!file) return Response.json({ error: "Not found" }, { status: 404 });
  return new Response(Buffer.from(file.bytes), { headers: { "Content-Type": file.type, "Cache-Control": "private, no-store" } });
}
