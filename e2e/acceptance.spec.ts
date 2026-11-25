import { expect, test } from "@playwright/test";
import { axe, dismissBanner, login, logout, roles, shot, submitAction, wantShots, watchConsole } from "./helpers";

const consoleErrors = new WeakMap<import("@playwright/test").Page, string[]>();

test.beforeEach(async ({ page }) => {
  consoleErrors.set(page, watchConsole(page));
});

test.afterEach(async ({ page }) => {
  const errors = consoleErrors.get(page) ?? [];
  expect(errors, errors.join("\n")).toEqual([]);
});

test("cookie banner and demo login render", async ({ page }, info) => {
  await page.goto("/login");
  await expect(page.getByText("essential cookies")).toBeVisible();
  await shot(page, `${info.project.name}-login-banner`);
  await dismissBanner(page);
  await expect(page.getByRole("heading", { name: /Backstage/ })).toBeVisible();
  await page.getByPlaceholder("Email").fill("vedanshu@rvt.demo");
  await page.getByPlaceholder("Password").fill("demo-pass-123");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/dashboard/);
  await expect(page.getByText("Live profit")).toBeVisible();
  await shot(page, `${info.project.name}-admin-after-login`);
  await logout(page);
});

test("each role can log in and open its screens", async ({ page }, info) => {
  for (const role of roles) {
    await login(page, role.email);
    await expect(page).toHaveURL(new RegExp(role.home));
    if (wantShots(info)) await shot(page, `role-${role.key}-home`);
    await axe(page, `${info.project.name} ${role.key} home`);
    for (const path of role.screens) {
      await page.goto(path);
      await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
      if (role.key === "collab") {
        await expect(page.getByText("Aisha Kulkarni")).toHaveCount(0);
        await expect(page.getByText("Kabir Shah")).toHaveCount(0);
      }
      if (role.key === "data" && path === "/ledger") {
        await expect(page.getByText("Live profit")).toHaveCount(0);
      }
      if (wantShots(info)) await shot(page, `role-${role.key}-${path.slice(1) || "home"}`);
      if (wantShots(info)) await axe(page, `${role.key} ${path}`);
    }
    await logout(page);
  }
});

test("guest, comp, door, ledger, and settle", async ({ page }, info) => {
  const stamp = `${info.project.name}-${Date.now().toString().slice(-6)}`;
  const guestName = `Lane ${stamp}`;
  const compName = `Comp ${stamp}`;

  await login(page, "vedanshu@rvt.demo");
  await page.goto("/guests");
  const select = page.locator("header select");
  if (await select.count()) {
    await select.selectOption({ label: "Warehouse Friday · 2026-11-28" });
    await expect(page.getByRole("heading", { name: "Warehouse Friday" })).toBeVisible();
  }
  const guestForm = page.locator("form").filter({ hasText: "Add a guest" });
  await guestForm.getByPlaceholder("Name").fill(guestName);
  await guestForm.getByPlaceholder("Phone").fill(`9${stamp.replace(/\D/g, "").padEnd(9, "1").slice(0, 9)}`);
  await guestForm.getByRole("checkbox", { name: "Guest is 18 or older" }).check();
  await guestForm.getByRole("button", { name: "Save to pending" }).click();
  const guestRow = page.getByRole("row", { name: new RegExp(guestName) });
  await expect(guestRow).toContainText(/pending/i);
  await submitAction(page, guestRow.getByRole("button", { name: "Verify" }));
  await expect(guestRow).toContainText(/verified/i);
  await logout(page);

  await login(page, "aisha@rvt.demo");
  await page.goto("/comps");
  if (await select.count()) await select.selectOption({ label: "Warehouse Friday · 2026-11-28" });
  const compForm = page.locator("form").filter({ hasText: "Ask for a comp" });
  await compForm.getByPlaceholder("Name").fill(compName);
  await compForm.getByPlaceholder("Phone").fill(`8${stamp.replace(/\D/g, "").padEnd(9, "2").slice(0, 9)}`);
  await compForm.getByRole("checkbox", { name: "Guest is 18 or older" }).check();
  await compForm.getByRole("button", { name: "Request comp" }).click();
  await expect(page.getByText(compName)).toBeVisible();
  await logout(page);

  await login(page, "vedanshu@rvt.demo");
  await page.goto("/comps");
  if (await select.count()) await select.selectOption({ label: "Warehouse Friday · 2026-11-28" });
  const compRow = page.getByRole("listitem").filter({ hasText: compName });
  await submitAction(page, compRow.getByRole("button", { name: "Approve" }));
  await expect(compRow).toContainText(/approved/i);
  await logout(page);

  await login(page, "imran@rvt.demo");
  await expect(page.getByText(/inside/i)).toBeVisible();
  await page.getByPlaceholder("Name or phone").fill(guestName);
  const guestButton = page.getByRole("button", { name: new RegExp(guestName) });
  await expect(guestButton).toBeVisible();
  await guestButton.click();
  await expect(page.getByText(new RegExp(`${guestName} is in`))).toBeVisible();
  await guestButton.click();
  await expect(page.getByText(/Already inside/)).toBeVisible();
  if (wantShots(info)) await shot(page, `${info.project.name}-door-already-inside`);
  await logout(page);

  await login(page, "vedanshu@rvt.demo");
  await page.goto("/ledger");
  await expect(page.getByText("DJ and sound hire")).toBeVisible();
  await page.goto("/settle");
  await expect(page.getByRole("main").getByText("Who owes what")).toBeVisible();
  await page.goto("/leaderboard");
  await expect(page.getByText("Aisha Kulkarni")).toBeVisible();
  await page.goto("/chat");
  await expect(page.getByPlaceholder(/Paste a list/)).toBeVisible();
  await logout(page);

  await login(page, "northline@rvt.demo");
  await page.goto("/guests");
  await expect(page.getByText("RVT team")).toBeVisible();
  await expect(page.getByText("Aisha Kulkarni")).toHaveCount(0);
  const own = `Own ${stamp}`;
  const form = page.locator("form").filter({ hasText: "Add a guest" });
  await form.getByPlaceholder("Name").fill(own);
  await form.getByPlaceholder("Phone").fill(`7${stamp.replace(/\D/g, "").padEnd(9, "3").slice(0, 9)}`);
  await form.getByRole("checkbox", { name: "Guest is 18 or older" }).check();
  await form.getByRole("button", { name: "Save to pending" }).click();
  await expect(page.getByRole("row", { name: new RegExp(own) })).toBeVisible();
  await expect(page.getByText("Kabir Shah")).toHaveCount(0);
});

test("localhost and the LAN address both log in every role", async ({ page }, info) => {
  test.skip(info.project.name.includes("mobile"), "desktop browsers cover the two origins");
  // GitHub runners cannot reach the home LAN address, so CI checks localhost only.
  const origins = process.env.CI ? ["http://127.0.0.1:3000"] : ["http://127.0.0.1:3000", "http://192.168.1.5:3000"];
  for (const origin of origins) {
    const host = origin.includes("192.168") ? "lan" : "localhost";
    for (const role of roles) {
      await page.goto(`${origin}/login`);
      await dismissBanner(page);
      await page.getByPlaceholder("Email").fill(role.email);
      await page.getByPlaceholder("Password").fill("demo-pass-123");
      await page.getByRole("button", { name: "Log in" }).click();
      await page.waitForURL(new RegExp(role.home));
      await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
      await shot(page, `${info.project.name}-${host}-${role.key}`);
      await logout(page);
    }
  }
});
