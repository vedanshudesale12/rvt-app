import { describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "@/server/csp";

describe("content security policy", () => {
  it("lets Next hydrate on http://localhost", () => {
    const csp = contentSecurityPolicy({ dev: true, https: false, nonce: "abc" });
    expect(csp).toContain("'nonce-abc'");
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("connect-src 'self' http: ws:");
    expect(csp).not.toContain("upgrade-insecure-requests");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });

  it("keeps production scripts nonced and upgrades https", () => {
    const csp = contentSecurityPolicy({ dev: false, https: true, nonce: "abc" });
    expect(csp).toContain("'nonce-abc'");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });
});
