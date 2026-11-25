import { expect, test, type Page } from "@playwright/test";

async function dismissBanner(page: Page) {
  const ok = page.getByRole("button", { name: "OK" });
  if (await ok.count()) await ok.click({ force: true });
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await dismissBanner(page);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill("demo-pass-123");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

test("collab partner logs their guest and cannot touch an RVT sale", async ({ page }) => {
  await login(page, "northline@rvt.demo");
  await page.goto("/guests");
  await expect(page.getByText("RVT team")).toBeVisible();
  await expect(page.getByText("Aisha Kulkarni")).toHaveCount(0);
  await expect(page.getByText("Kabir Shah")).toHaveCount(0);
  const form = page.locator("form").filter({ hasText: "Add a guest" });
  const name = `Collab ${Date.now().toString().slice(-5)}`;
  await form.getByPlaceholder("Name").fill(name);
  await form.getByPlaceholder("Phone").fill("9988771122");
  await form.getByRole("checkbox", { name: "Guest is 18 or older" }).check();
  await form.getByRole("button", { name: "Save to pending" }).click();
  await expect(page.getByRole("row", { name: new RegExp(name) })).toBeVisible();
  await expect(page.getByText("Aisha Kulkarni")).toHaveCount(0);

  const csrf = await page.evaluate(() => decodeURIComponent(document.cookie.split("; ").find((part) => part.startsWith("rvt_csrf="))?.split("=")[1] ?? ""));
  const forged = await page.request.post("/api/rpc", {
    data: { action: "reviewSale", payload: { id: "40000000-0000-4000-8000-000000000007", decision: "rejected" } },
    headers: { "x-csrf-token": csrf },
  });
  expect(forged.status()).toBe(403);
  const wrongSide = await page.request.post("/api/rpc", {
    data: {
      action: "logSale",
      payload: {
        eventId: "20000000-0000-4000-8000-000000000002",
        guestName: "Not theirs",
        phone: "9988771133",
        ticketTypeId: "30000000-0000-4000-8000-000000000004",
        side: "rvt",
        prId: "10000000-0000-4000-8000-000000000003",
        ageConfirmed: true,
      },
    },
    headers: { "x-csrf-token": csrf },
  });
  expect(wrongSide.status()).toBe(403);
  await page.screenshot({ path: "/opt/cursor/artifacts/collab-own-guests.png", fullPage: true });
});
