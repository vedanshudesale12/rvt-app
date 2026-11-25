"use client";

export async function api(path: string, body?: unknown, form?: FormData) {
  const csrf = decodeURIComponent(document.cookie.split("; ").find((part) => part.startsWith("rvt_csrf="))?.split("=")[1] ?? "");
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: form ? { "x-csrf-token": csrf } : { "content-type": "application/json", "x-csrf-token": csrf },
    body: form ?? JSON.stringify(body ?? {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function useReload() {
  return () => window.location.reload();
}
