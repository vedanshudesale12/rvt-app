"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { APP } from "@/config/brand";
import { Logo } from "@/components/logo";
import { api } from "@/components/use-api";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);
  return (
    <main className="min-h-screen bg-paper px-4 py-8">
      <form
        className="mx-auto grid max-w-lg gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!agreed) {
            setError("Tick I agree first");
            return;
          }
          const form = new FormData(event.currentTarget);
          try {
            let photoPath: string | undefined;
            const photo = form.get("photo");
            if (photo instanceof File && photo.size) {
              const upload = new FormData();
              upload.set("file", photo);
              upload.set("bucket", "avatars");
              const saved = await api("/api/uploads", undefined, upload);
              photoPath = saved.path;
            }
            const token = document.querySelector<HTMLTextAreaElement>("[name=cf-turnstile-response]")?.value;
            const result = await api("/api/auth/signup", {
              fullName: form.get("fullName"),
              phone: form.get("phone"),
              email: form.get("email"),
              password: form.get("password"),
              instagram: form.get("instagram") || undefined,
              college: form.get("college") || undefined,
              area: form.get("area") || undefined,
              upi: form.get("upi") || undefined,
              referrer: form.get("referrer") || undefined,
              photoPath,
              role: form.get("role"),
              agreed: true,
              turnstileToken: token,
            });
            router.push(result.home || "/");
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not sign up");
          }
        }}
      >
        <Logo className="h-14 w-14" />
        <h1 className="display text-4xl">Join {APP.name}</h1>
        <p className="text-sm text-muted">PRs are active straight away. Ticketing and collab partners wait for an admin. You must be 18+.</p>
        <input name="fullName" required placeholder="Name" className="border border-line bg-panel px-3 py-2" />
        <input name="phone" required placeholder="Phone" className="border border-line bg-panel px-3 py-2" />
        <input name="email" type="email" required placeholder="Email" className="border border-line bg-panel px-3 py-2" />
        <input name="password" type="password" required minLength={8} placeholder="Password" className="border border-line bg-panel px-3 py-2" />
        <input name="instagram" placeholder="Instagram" className="border border-line bg-panel px-3 py-2" />
        <input name="college" placeholder="College or workplace" className="border border-line bg-panel px-3 py-2" />
        <input name="area" placeholder="Area" className="border border-line bg-panel px-3 py-2" />
        <input name="upi" placeholder="UPI ID" className="border border-line bg-panel px-3 py-2" />
        <input name="referrer" placeholder="Who referred you" className="border border-line bg-panel px-3 py-2" />
        <label className="text-sm">Photo<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full" /></label>
        <select name="role" className="border border-line bg-panel px-3 py-2">
          <option value="pr">PR</option>
          <option value="ticketing_partner">Ticketing partner</option>
          <option value="collab_partner">Collab partner</option>
        </select>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
          <span>
            I agree to the <Link className="underline" href="/privacy">Privacy Policy</Link>, <Link className="underline" href="/terms">Terms</Link>, and <Link className="underline" href="/cookies">Cookie Policy</Link>.
          </span>
        </label>
        <p className="text-xs text-muted">Essential cookies only: session, security token, and the event you have open. No ad cookies.</p>
        <div className="cf-turnstile" data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""} />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" className="bg-ink px-4 py-2 text-paper">Create login</button>
        <Link href="/login" className="text-sm underline">I already have a login</Link>
      </form>
    </main>
  );
}
