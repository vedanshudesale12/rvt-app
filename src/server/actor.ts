import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Actor, Profile } from "@/domain/types";
import { readSession } from "@/server/session";
import { getStore } from "@/server/store";
import { supabaseConfigured, createUserClient } from "@/server/supabase";

export function toActor(profile: Profile): Actor | null {
  if (!profile.role || profile.status === "disabled" || profile.deletedAt) return null;
  return {
    id: profile.id,
    role: profile.role,
    status: profile.status,
    fullName: profile.fullName,
    email: profile.email,
    isOwner: profile.isOwner,
    ownerSlot: profile.ownerSlot,
  };
}

export const currentActor = cache(async function currentActor(): Promise<Actor | null> {
  const store = await getStore();
  if (supabaseConfigured()) {
    // Middleware verifies the session and sets this; do not trust a client-supplied value.
    const fromProxy = (await headers()).get("x-rvt-user-id");
    let userId = fromProxy || null;
    if (!userId) {
      const supabase = await createUserClient();
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
    }
    if (!userId) return null;
    const profile = await store.profileById(userId);
    return profile ? toActor(profile) : null;
  }
  const jar = await cookies();
  const session = await readSession(jar.get("rvt_demo")?.value);
  if (!session) return null;
  const profile = await store.profileById(session.uid);
  return profile ? toActor(profile) : null;
});

export async function requireActor(): Promise<Actor> {
  const actor = await currentActor();
  if (!actor) redirect("/login");
  return actor;
}

export async function selectedEventId(events: { id: string }[]): Promise<string | null> {
  const jar = await cookies();
  const chosen = jar.get("rvt_event")?.value;
  if (chosen && events.some((event) => event.id === chosen)) return chosen;
  return events[0]?.id ?? null;
}
