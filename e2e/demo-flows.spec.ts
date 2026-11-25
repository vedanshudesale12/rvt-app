import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

const shotDir = "/opt/cursor/artifacts";
mkdirSync(shotDir, { recursive: true });

const password = "demo-pass-123";

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${shotDir}/${name}.png`, fullPage: true });
}

async function dismissBanner(page: Page) {
  const ok = page.getByRole("button", { name: "OK" });
  const visible = await ok.waitFor({ state: "visible", timeout: 5000 }).then(() => true).catch(() => false);
  if (!visible) return;
  await ok.click({ force: true, timeout: 5000 });
  await expect(ok).toBeHidden();
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await dismissBanner(page);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForFunction(
    () => !location.pathname.startsWith("/login") || /Too many tries|wrong|turned off/.test(document.body.innerText),
  );
  if (page.url().includes("/login")) {
    throw new Error((await page.locator("main").innerText()).slice(0, 400));
  }
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL(/\/login/);
}

async function pickFriday(page: Page) {
  const select = page.locator("header select");
  if (await select.count()) {
    await select.selectOption({ label: "Warehouse Friday · 2026-11-28" });
    await expect(select).toHaveValue("20000000-0000-4000-8000-000000000001");
  }
}

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "chromium-desktop", "the acceptance suite covers the other browsers");
});

test("dev server accepts the LAN origin", async ({ request }) => {
  const blocked = await request.get("/_next/hmr", {
    headers: { origin: "http://192.168.1.5:3000" },
  });
  expect(blocked.status(), await blocked.text()).not.toBe(403);
});

test.describe.serial("demo flows", () => {
  test("banner, every role, and the main screens", async ({ page }) => {
    const stamp = Date.now().toString().slice(-6);
    const guestName = `Lane ${stamp}`;
    const compName = `Comp ${stamp}`;
    await page.goto("/login");
    await expect(page.getByText("essential cookies")).toBeVisible();
    await shot(page, "01-login-banner");
    await dismissBanner(page);
    await shot(page, "02-login");

    await login(page, "vedanshu@rvt.demo");
    await expect(page.getByText("Live profit")).toBeVisible();
    await shot(page, "03-admin-dashboard");

    await page.goto("/guests");
    await pickFriday(page);
    const guestForm = page.locator("form").filter({ hasText: "Add a guest" });
    await guestForm.getByPlaceholder("Name").fill(guestName);
    await guestForm.getByPlaceholder("Phone").fill(`98765${stamp.slice(0, 5)}`);
    await guestForm.getByRole("checkbox", { name: "Guest is 18 or older" }).check();
    await guestForm.getByRole("button", { name: "Save to pending" }).click();
    const guestRow = page.getByRole("row", { name: new RegExp(guestName) });
    await expect(guestRow).toContainText(/pending/i);
    await shot(page, "04-guest-added");
    await guestRow.getByRole("button", { name: "Verify" }).click();
    await expect(guestRow).toContainText(/verified/i);

    await logout(page);

    await login(page, "aisha@rvt.demo");
    await page.goto("/comps");
    await pickFriday(page);
    const compForm = page.locator("form").filter({ hasText: "Ask for a comp" });
    await compForm.getByPlaceholder("Name").fill(compName);
    await compForm.getByPlaceholder("Phone").fill(`98764${stamp.slice(0, 5)}`);
    await compForm.getByRole("checkbox", { name: "Guest is 18 or older" }).check();
    await compForm.getByRole("button", { name: "Request comp" }).click();
    await expect(page.getByText(compName)).toBeVisible();
    await shot(page, "05-pr-comp-requested");
    await logout(page);

    await login(page, "vedanshu@rvt.demo");
    await page.goto("/comps");
    await pickFriday(page);
    const compRow = page.getByRole("listitem").filter({ hasText: compName });
    await compRow.getByRole("button", { name: "Approve" }).click();
    await expect(compRow).toContainText(/approved/i);
    await shot(page, "06-admin-comp-approved");
    await logout(page);

    await login(page, "imran@rvt.demo");
    await expect(page.getByPlaceholder("Name or phone")).toBeVisible();
    await page.getByPlaceholder("Name or phone").fill(guestName);
    const guestButton = page.getByRole("button", { name: new RegExp(guestName) });
    await expect(guestButton).toBeVisible();
    await guestButton.click();
    await expect(page.getByText(new RegExp(`${guestName} is in`))).toBeVisible();
    await guestButton.click();
    await expect(page.getByText(/Already inside/)).toBeVisible();
    await shot(page, "07-door-already-inside");
    await logout(page);

    await login(page, "vedanshu@rvt.demo");
    await page.goto("/ledger");
    await pickFriday(page);
    await expect(page.getByText("DJ and sound hire")).toBeVisible();
    await shot(page, "08-admin-ledger");
    await page.goto("/settle");
    await expect(page.getByText("Who owes what")).toBeVisible();
    await shot(page, "09-settle");
    await page.goto("/leaderboard");
    await expect(page.getByRole("heading", { name: "PR board" })).toBeVisible();
    await expect(page.getByText("Aisha Kulkarni")).toBeVisible();
    await shot(page, "10-leaderboard");

    await page.goto("/events/new");
    await page.getByPlaceholder("Event name").fill("Play Night");
    await page.locator("input[name=eventDate]").fill("2026-12-20");
    await page.locator("input[name=venue]").fill("Koregaon Park");
    await page.locator("input[name=male]").fill("1500");
    await page.locator("input[name=female]").fill("1000");
    await page.locator("input[name=commission]").fill("200");
    await page.getByRole("button", { name: "Publish and tell the PRs" }).click();
    await expect(page.getByText("Play Night")).toBeVisible();
    await shot(page, "11-event-created");
    await logout(page);
    await shot(page, "12-logged-out");

    await login(page, "neha@rvt.demo");
    await page.goto("/ledger");
    await pickFriday(page);
    await expect(page.getByText("DJ and sound hire")).toBeVisible();
    await expect(page.getByText("Live profit")).toHaveCount(0);
    await shot(page, "13-data-entry-ledger");
    await logout(page);

    await login(page, "northline@rvt.demo");
    await page.goto("/guests");
    await expect(page.getByText("RVT team")).toBeVisible();
    await expect(page.getByText("Aisha Kulkarni")).toHaveCount(0);
    await expect(page.getByText("Kabir Shah")).toHaveCount(0);
    await shot(page, "14-collab-guests");
    await logout(page);
  });
});
