import { loadPage } from "@/server/page";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const { actor } = await loadPage();
  return (
    <div className="grid gap-2">
      <h1 className="display text-4xl">{actor.fullName}</h1>
      <p><a className="underline" href={`mailto:${actor.email}`}>{actor.email}</a></p>
      <p className="text-sm uppercase tracking-wider text-muted">{actor.role}</p>
    </div>
  );
}
