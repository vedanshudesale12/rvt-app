import { AppError } from "@/domain/errors";
import { currentActor } from "@/server/actor";
import { assertCsrf, clientIp, handle } from "@/server/http";
import { hitLimit } from "@/server/rate-limit";
import { APP } from "@/config/brand";
import { getStore } from "@/server/store";
import { createAdminClient, supabaseConfigured } from "@/server/supabase";

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

function matches(bytes: Uint8Array, type: string): boolean {
  const head = bytes.subarray(0, 12);
  if (type === "image/jpeg") return head[0] === 0xff && head[1] === 0xd8;
  if (type === "image/png") return head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  if (type === "application/pdf") return head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46;
  if (type === "image/webp") {
    return head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 && head[8] === 0x57 && head[9] === 0x45;
  }
  return false;
}

export async function POST(request: Request) {
  return handle(async () => {
    assertCsrf(request);
    const actor = await currentActor();
    const form = await request.formData();
    const file = form.get("file");
    const bucket = form.get("bucket") === "avatars" ? "avatars" : "proofs";
    if (!actor || actor.status !== "active") {
      if (bucket !== "avatars") throw new AppError(401, "Sign in required");
      await hitLimit(`upload:${clientIp(request)}`, 8, 60 * 60 * 1000);
    }
    if (!(file instanceof File)) throw new AppError(400, "Choose a file");
    if (file.size > APP.maxUploadBytes) throw new AppError(400, "File is over 5 MB");
    const ext = TYPES[file.type];
    if (!ext) throw new AppError(400, "Use a JPG, PNG, WEBP, or PDF");
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!matches(bytes, file.type)) throw new AppError(400, "That file does not match its type");
    const ownerId = actor?.id ?? crypto.randomUUID();
    const path = `${bucket}/${ownerId}/${crypto.randomUUID()}.${ext}`;
    const store = await getStore();
    if (supabaseConfigured()) {
      const admin = createAdminClient();
      const { error } = await admin.storage.from(bucket).upload(path.split("/").slice(1).join("/"), bytes, { contentType: file.type });
      if (error) throw new AppError(400, error.message);
    } else {
      await store.putFile(path, { bytes, type: file.type, ownerId });
    }
    return { path };
  });
}
