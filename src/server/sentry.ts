export function captureException(error: unknown): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace("/", "");
    const key = url.username;
    const store = `${url.protocol}//${url.host}/api/${projectId}/store/?sentry_key=${key}&sentry_version=7`;
    const message = error instanceof Error ? error.message : "Unknown error";
    void fetch(store, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: "node",
        timestamp: Date.now() / 1000,
        exception: { values: [{ type: error instanceof Error ? error.name : "Error", value: message }] },
      }),
    }).catch(() => undefined);
  } catch {
    // Error tracking must not break the request.
  }
}
