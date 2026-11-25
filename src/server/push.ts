import { APP } from "@/config/brand";
import type { PushSub } from "@/domain/types";

export async function sendPush(subs: PushSub[], title: string, body: string, url: string): Promise<void> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey || subs.length === 0) return;
  const webpush = await import("web-push");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:ops@example.com", publicKey, privateKey);
  await Promise.all(
    subs.map((sub) =>
      webpush
        .sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.authKey } },
          JSON.stringify({ title: title || APP.name, body, url }),
        )
        .catch(() => undefined),
    ),
  );
}
