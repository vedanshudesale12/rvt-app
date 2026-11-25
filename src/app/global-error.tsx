"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#121212", color: "#f3f3ee", fontFamily: "sans-serif", margin: 0 }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
          <div>
            <h1 style={{ fontSize: 40, textTransform: "uppercase" }}>Something went wrong</h1>
            <p>The app hit an error. Try again.</p>
            <button type="button" onClick={() => reset()} style={{ minHeight: 44, marginTop: 16 }}>
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
