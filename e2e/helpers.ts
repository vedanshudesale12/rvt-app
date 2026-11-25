import { expect, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";

export const shotDir = "/opt/cursor/artifacts";
mkdirSync(shotDir, { recursive: true });

export const password = "demo-pass-123";

export const roles = [
  {
    key: "admin",
    email: "vedanshu@rvt.demo",
    home: "/dashboard",
    screens: ["/dashboard", "/guests", "/comps", "/ledger", "/settle", "/door", "/chat", "/leaderboard", "/events", "/ticketing", "/data", "/people", "/audit"],
  },
  {
    key: "pr",
    email: "aisha@rvt.demo",
    home: "/dashboard",
    screens: ["/dashboard", "/guests", "/comps", "/settle", "/door", "/chat", "/leaderboard", "/events"],
  },
  {
    key: "data",
    email: "neha@rvt.demo",
    home: "/dashboard",
    screens: ["/dashboard", "/guests", "/comps", "/ledger", "/chat", "/events"],
  },
  {
    key: "door",
    email: "imran@rvt.demo",
    home: "/door",
    screens: ["/door"],
  },
  {
    key: "ticketing",
    email: "boxoffice@rvt.demo",
    home: "/ticketing",
    screens: ["/ticketing", "/dashboard", "/guests", "/settle", "/leaderboard", "/events"],
  },
  {
    key: "collab",
    email: "northline@rvt.demo",
    home: "/dashboard",
    screens: ["/dashboard", "/guests", "/ledger", "/settle", "/events"],
  },
] as const;

export function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (/favicon|Download the React DevTools|Failed to load resource|caret-color/i.test(text)) return;
    errors.push(text);
  });
  return errors;
}

export async function dismissBanner(page: Page) {
  const ok = page.getByRole("button", { name: "OK" });
  const visible = await ok.waitFor({ state: "visible", timeout: 8000 }).then(() => true).catch(() => false);
  if (!visible) return;
  await ok.click({ force: true });
  await expect(ok).toBeHidden();
}

export async function login(page: Page, email: string) {
  await page.goto("/login");
  await dismissBanner(page);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL(/\/login/);
}

export async function shot(page: Page, name: string) {
  const safe = name.replace(/[^a-z0-9-]+/gi, "-");
  await page.screenshot({ path: `${shotDir}/${safe}.png`, fullPage: true });
}

export function wantShots(info: TestInfo): boolean {
  return info.project.name === "chromium-desktop";
}

export async function axe(page: Page, label: string) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const serious = result.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
  expect(serious, `${label}: ${serious.map((item) => item.id).join(", ")}`).toEqual([]);
}
