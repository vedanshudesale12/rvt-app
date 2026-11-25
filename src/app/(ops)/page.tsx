import { redirect } from "next/navigation";
import { homeFor } from "@/domain/paths";
import { requireActor } from "@/server/actor";

export default async function Home() {
  const actor = await requireActor();
  redirect(actor.status === "pending" ? "/pending" : homeFor(actor.role));
}
