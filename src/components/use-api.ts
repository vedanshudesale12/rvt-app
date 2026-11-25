"use client";

export async function api(path: string, body?: unknown, form?: FormData) {
  const csrf = decodeURIComponent(document.cookie.split("; ").find((part) => part.startsWith("rvt_csrf="))?.split("=")[1] ?? "");
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: form ? { "x-csrf-token": csrf } : { "content-type": "application/json", "x-csrf-token": csrf },
      body: form ?? JSON.stringify(body ?? {}),
    });
  } catch {
    throw new Error("The network dropped. Check your connection and try again.");
  }
  const data = await response.json().catch(() => ({}));
  if (response.status === 403) throw new Error(data.error || "You can't do that.");
  if (response.status === 429) throw new Error(data.error || "Too many tries. Wait a minute and try again.");
  if (response.status === 401) throw new Error(data.error || "Sign in again.");
  if (!response.ok) throw new Error(data.error || "That didn't work. Check the form and try again.");
  return data;
}

export function useReload() {
  return () => window.location.reload();
}
