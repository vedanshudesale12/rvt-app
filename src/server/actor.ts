import { cookies } from "next/headers";
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

export async function currentActor(): Promise<Actor | null> {
  const store = await getStore();
  if (supabaseConfigured()) {
    const supabase = await createUserClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const profile = (await store.profiles()).find((row) => row.id === data.user.id);
    return profile ? toActor(profile) : null;
  }
  const jar = await cookies();
  const session = await readSession(jar.get("rvt_demo")?.value);
  if (!session) return null;
  const profile = (await store.profiles()).find((row) => row.id === session.uid);
  return profile ? toActor(profile) : null;
}

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
