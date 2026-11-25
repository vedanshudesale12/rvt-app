import Link from "next/link";
import { APP } from "@/config/brand";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-8 border-t border-line px-4 py-4 text-sm">
      <nav className="flex flex-wrap gap-x-4 gap-y-2">
        <Link className="inline-flex min-h-11 items-center underline" href="/privacy">Privacy</Link>
        <Link className="inline-flex min-h-11 items-center underline" href="/terms">Terms</Link>
        <Link className="inline-flex min-h-11 items-center underline" href="/cookies">Cookies</Link>
        <Link className="inline-flex min-h-11 items-center underline" href="/contact">Contact</Link>
      </nav>
      <p className="text-muted">© {year} {APP.org}</p>
    </footer>
  );
}
