import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

mkdirSync("/opt/cursor/artifacts", { recursive: true });

async function dismissBanner(page: Page) {
  const ok = page.getByRole("button", { name: "OK" });
  const visible = await ok.waitFor({ state: "visible", timeout: 3000 }).then(() => true).catch(() => false);
  if (!visible) return;
  await ok.click({ force: true, timeout: 3000 }).catch(() => undefined);
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await dismissBanner(page);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill("demo-pass-123");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

test("admin can browse data and other roles get 403", async ({ page }) => {
  await login(page, "vedanshu@rvt.demo");
  await page.goto("/data");
  await expect(page.getByRole("heading", { name: "Data" })).toBeVisible();
  await expect(page.getByText("Read-only books")).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/admin-data.png", fullPage: true });
  await page.getByRole("link", { name: "Sales" }).click();
  await expect(page.getByRole("columnheader", { name: "guest" })).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/admin-data-sales.png", fullPage: true });
  const first = page.locator("tbody a").first();
  await first.click();
  await expect(page.getByRole("heading", { name: "Record" })).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/admin-data-record.png", fullPage: true });
  const csv = await page.request.get("/api/data?entity=sales&format=csv");
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain("guest");
  const full = await page.request.get("/api/data?entity=all&format=full");
  expect(full.status()).toBe(200);
  const body = await full.json();
  expect(body.sales.length).toBeGreaterThan(0);
  expect(body.audit).toBeTruthy();
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL(/\/login/);

  await login(page, "aisha@rvt.demo");
  const deniedPage = await page.request.get("/data");
  expect(deniedPage.status()).toBe(403);
  const deniedApi = await page.request.get("/api/data?entity=sales&format=csv");
  expect(deniedApi.status()).toBe(403);
  await page.goto("/data");
  await expect(page.getByRole("heading", { name: "Data" })).toHaveCount(0);
});
