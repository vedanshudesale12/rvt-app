import Link from "next/link";
import { SiteFooter } from "@/components/footer";
import { Logo } from "@/components/logo";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <main className="grid min-h-screen bg-paper text-ink">
      <div className="mx-auto grid w-full max-w-lg place-content-center px-4">
        <Logo href="/login" className="h-12 w-12" />
        <p className="mt-6 text-xs uppercase tracking-[0.16em] text-muted">404</p>
        <h1 className="display text-4xl">Not on the list</h1>
        <p className="mt-2 text-sm">That page is not in the app. Head back to login.</p>
        <Link href="/login" className="mt-4 inline-flex min-h-11 items-center underline">Back to login</Link>
      </div>
      <SiteFooter />
    </main>
  );
}
