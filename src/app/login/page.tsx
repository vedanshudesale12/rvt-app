"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { APP } from "@/config/brand";
import { SiteFooter } from "@/components/footer";
import { Logo } from "@/components/logo";
import { Turnstile } from "@/components/bits";
import { api } from "@/components/use-api";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const demo = process.env.NEXT_PUBLIC_SUPABASE_URL ? false : process.env.NODE_ENV !== "production";
  return (
    <main className="flex min-h-screen flex-col bg-invert px-4 py-10 text-ink">
      <div className="m-auto w-full max-w-sm border border-invert-muted bg-invert p-6">
        <Logo lockup href="/login" className="mb-6 h-auto w-full" />
        <h1 className="display text-3xl">{APP.name}</h1>
        <p className="mt-1 text-sm text-invert-muted">Staff login. 18+.</p>
        <form
          className="mt-6 grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const token = String(form.get("cf-turnstile-response") || "");
            try {
              const result = await api("/api/auth/login", {
                email: form.get("email"),
                password: form.get("password"),
                turnstileToken: token,
              });
              router.push(result.home || "/");
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not sign in");
              setTurnstileReset((count) => count + 1);
            }
          }}
        >
          <input name="email" type="email" required placeholder="Email" className="border border-invert-muted bg-invert px-3 py-2" />
          <input name="password" type="password" required minLength={8} placeholder="Password" className="border border-invert-muted bg-invert px-3 py-2" />
          <Turnstile resetSignal={turnstileReset} />
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <button type="submit" className="btn-solid px-4 py-2">Log in</button>
        </form>
        <p className="mt-4 text-sm"><Link href="/signup" className="underline">Request a login</Link></p>
        {demo && (
          <p className="mt-4 text-xs text-invert-muted">
            Demo password is demo-pass-123. Try vedanshu@rvt.demo, aisha@rvt.demo, neha@rvt.demo, imran@rvt.demo, boxoffice@rvt.demo, northline@rvt.demo.
          </p>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}
