"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4 text-ink">
      <div className="max-w-md">
        <p className="text-xs uppercase tracking-[0.16em] text-muted">Backstage</p>
        <h1 className="display text-4xl">Something went wrong</h1>
        <p className="mt-3 text-sm">{error.message || "The page failed. Try it again."}</p>
        <button type="button" className="mt-4 border border-ink px-4" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </main>
  );
}
