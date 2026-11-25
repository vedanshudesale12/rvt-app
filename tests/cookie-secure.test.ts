import { afterEach, describe, expect, it } from "vitest";
import { cookieSecure } from "@/server/session";

const previousNode = process.env.NODE_ENV;
const previousCookie = process.env.COOKIE_SECURE;

afterEach(() => {
  process.env.NODE_ENV = previousNode;
  if (previousCookie === undefined) delete process.env.COOKIE_SECURE;
  else process.env.COOKIE_SECURE = previousCookie;
});

describe("cookie secure flag", () => {
  it("is set only when COOKIE_SECURE=1", () => {
    process.env.NODE_ENV = "production";
    delete process.env.COOKIE_SECURE;
    expect(cookieSecure()).toBe(false);
    process.env.COOKIE_SECURE = "1";
    expect(cookieSecure()).toBe(true);
    process.env.NODE_ENV = "development";
    delete process.env.COOKIE_SECURE;
    expect(cookieSecure()).toBe(false);
  });
});
