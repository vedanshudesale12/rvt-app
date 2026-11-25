import { expect, test, type Page } from "@playwright/test";
import { dismissBanner, login, logout } from "./helpers";

const widths = [360, 390, 768, 1280];

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "chromium-desktop", "widths are checked in one browser");
});

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
  expect(overflow, "document should not scroll sideways").toBeLessThanOrEqual(1);
}

async function titlesAndLinks(page: Page, path: string) {
  await page.goto(path);
  if (path === "/login") await dismissBanner(page);
  const title = await page.title();
  expect(title.length).toBeGreaterThan(3);
  expect(title).toContain("Backstage");
  const description = await page.locator('meta[name="description"]').getAttribute("content");
  expect(description && description.length > 10).toBeTruthy();
  await noHorizontalScroll(page);
}

test("public pages, footer, 404, and titles", async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 800 });
    for (const path of ["/login", "/signup", "/privacy", "/terms", "/cookies", "/contact"]) {
      await titlesAndLinks(page, path);
      await expect(page.getByRole("link", { name: "Privacy" }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: "Contact" }).first()).toBeVisible();
      const logo = page.getByRole("link", { name: "Riot Vibe Theory" }).first();
      await expect(logo).toHaveAttribute("href", "/login");
    }
    await page.goto("/contact");
    await expect(page.locator("footer")).toContainText(String(new Date().getFullYear()));
    await expect(page.getByRole("link", { name: "hello@riotvibetheory.in" })).toHaveAttribute("href", "mailto:hello@riotvibetheory.in");
    await page.goto("/this-page-is-not-real");
    await expect(page.getByRole("heading", { name: "Not on the list" })).toBeVisible();
    await expect(page).toHaveTitle(/Not found/);
    await noHorizontalScroll(page);
    const menu = page.getByRole("button", { name: "Menu" });
    expect(await menu.count()).toBe(0);
  }
});

test("footer targets and the mobile menu", async ({ page }) => {
  await page.context().addCookies([{ name: "rvt_cookie_ok", value: "1", url: "http://127.0.0.1:3000" }]);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/login");
  const footer = page.locator("footer");
  for (const [name, path] of [["Privacy", "/privacy"], ["Terms", "/terms"], ["Cookies", "/cookies"], ["Contact", "/contact"]] as const) {
    await footer.getByRole("link", { name }).click();
    await expect(page).toHaveURL(new RegExp(path));
    await expect(page.getByRole("heading").first()).toBeVisible();
    await page.goto("/login");
  }
  await login(page, "vedanshu@rvt.demo");
  await page.setViewportSize({ width: 390, height: 800 });
  const menu = page.getByRole("button", { name: "Menu" });
  await expect(menu).toBeVisible();
  const box = await menu.boundingBox();
  expect(box && box.height >= 44 && box.width >= 44).toBeTruthy();
  await menu.click();
  await expect(page.getByRole("link", { name: "Data" })).toBeVisible();
  await page.getByRole("link", { name: "Data" }).click();
  await expect(page).toHaveURL(/\/data/);
  await expect(page).toHaveTitle(/Data/);
  await noHorizontalScroll(page);
  await page.getByRole("button", { name: "Menu" }).click();
  const logo = page.getByRole("link", { name: "Riot Vibe Theory" });
  await expect(logo).toHaveAttribute("href", "/dashboard");
  const robots = await page.locator('meta[name="robots"]').getAttribute("content");
  expect(robots).toMatch(/noindex/i);
  await page.goto("/account");
  await expect(page.getByRole("link", { name: /@/ })).toHaveAttribute("href", /^mailto:/);
  await page.goto("/guests");
  for (const width of widths) {
    await page.setViewportSize({ width, height: 800 });
    for (const path of ["/dashboard", "/guests", "/door", "/data"]) {
      await page.goto(path);
      await noHorizontalScroll(page);
    }
  }
  await logout(page);
  await login(page, "imran@rvt.demo");
  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("link", { name: "Data" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Door" })).toBeVisible();
});

test("icons and robots", async ({ request }) => {
  for (const path of ["/icons/favicon-32.png", "/icons/apple-touch-icon.png", "/icons/icon-192.png", "/icons/icon-512.png", "/brand/rvt-logo.webp", "/brand/rvt-mark.webp"]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(Number(response.headers()["content-length"] || (await response.body()).length)).toBeGreaterThan(100);
  }
  const login = await request.get("/login");
  const html = await login.text();
  expect(html).toContain("favicon-32.png");
  expect(html).toContain("apple-touch-icon.png");
  const ops = await request.get("/dashboard", { maxRedirects: 0 });
  expect(ops.status()).toBeGreaterThanOrEqual(300);
  expect(ops.status()).toBeLessThan(400);
});
