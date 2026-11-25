import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "chromium-desktop", "security checks run once");
});

test("headers, forged CSRF, XSS, and collab IDOR", async ({ page, request }) => {
  const loginPage = await request.get("/login");
  const headers = loginPage.headers();
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["content-security-policy"]).toContain("script-src");
  expect(headers["content-security-policy"]).not.toContain("upgrade-insecure-requests");
  const csrf = decodeURIComponent(/rvt_csrf=([^;]+)/.exec(headers["set-cookie"] || "")?.[1] || "");
  const cookie = `rvt_csrf=${encodeURIComponent(csrf)}`;

  const forged = await request.post("/api/auth/login", {
    data: { email: "vedanshu@rvt.demo", password: "demo-pass-123" },
    headers: { origin: "http://127.0.0.1:3000", cookie, "x-csrf-token": "forged-token" },
  });
  expect(forged.status()).toBe(403);

  const xss = await request.post("/api/auth/login", {
    data: { email: "<script>alert(1)</script>", password: "demo-pass-123" },
    headers: { origin: "http://127.0.0.1:3000", cookie, "x-csrf-token": csrf },
  });
  expect(xss.status()).toBe(400);
  expect(await xss.text()).not.toContain("<script>");

  const tamper = await request.post("/api/auth/signup", {
    data: { fullName: "Nope", phone: "9876543210", email: "nope-role@rvt.demo", password: "demo-pass-123", role: "admin", agreed: true },
    headers: { origin: "http://127.0.0.1:3000", cookie, "x-csrf-token": csrf },
  });
  expect(tamper.status()).toBe(400);
  expect(await tamper.text()).not.toContain("\"role\":\"admin\"");

  await login(page, "northline@rvt.demo");
  const sessionCsrf = await page.evaluate(() => decodeURIComponent(document.cookie.split("; ").find((part) => part.startsWith("rvt_csrf="))?.split("=")[1] ?? ""));
  const idor = await page.request.post("/api/rpc", {
    data: { action: "reviewSale", payload: { id: "40000000-0000-4000-8000-000000000001", decision: "rejected" } },
    headers: { "x-csrf-token": sessionCsrf, origin: "http://127.0.0.1:3000" },
  });
  expect(idor.status()).toBe(403);
  const ownSide = await page.request.post("/api/rpc", {
    data: {
      action: "logSale",
      payload: {
        eventId: "20000000-0000-4000-8000-000000000002",
        guestName: "<script>alert(1)</script>",
        phone: "9988772211",
        ticketTypeId: "30000000-0000-4000-8000-000000000005",
        side: "rvt",
        ageConfirmed: true,
      },
    },
    headers: { "x-csrf-token": sessionCsrf, origin: "http://127.0.0.1:3000" },
  });
  expect(ownSide.status()).toBe(403);
  expect(await ownSide.text()).not.toContain("<script>");
});
