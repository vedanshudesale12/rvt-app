import Link from "next/link";
import { Logo } from "@/components/logo";

export function Legal({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto grid max-w-2xl gap-4 px-4 py-8">
      <Link href="/login"><Logo className="h-12 w-12" /></Link>
      <h1 className="display text-4xl">{title}</h1>
      <div className="grid gap-3 text-sm leading-6">{children}</div>
      <p className="text-sm"><Link className="underline" href="/login">Back to login</Link></p>
    </main>
  );
}
