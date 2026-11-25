import { describe, expect, it } from "vitest";
import { assertCsrf } from "@/server/http";

function request(origin: string, host: string): Request {
  return new Request(`http://${host}/api/auth/login`, {
    method: "POST",
    headers: {
      origin,
      host,
      cookie: "rvt_csrf=abc",
      "x-csrf-token": "abc",
    },
  });
}

describe("csrf on dev origins", () => {
  it("accepts localhost and the LAN address", () => {
    expect(() => assertCsrf(request("http://localhost:3000", "localhost:3000"))).not.toThrow();
    expect(() => assertCsrf(request("http://192.168.1.5:3000", "192.168.1.5:3000"))).not.toThrow();
    expect(() => assertCsrf(request("http://192.168.1.5:3000", "localhost:3000"))).not.toThrow();
  });

  it("rejects a forged token", () => {
    const forged = new Request("http://localhost:3000/api/rpc", {
      method: "POST",
      headers: { cookie: "rvt_csrf=abc", "x-csrf-token": "zzz", origin: "http://localhost:3000", host: "localhost:3000" },
    });
    expect(() => assertCsrf(forged)).toThrow(/refresh the page/i);
  });

  it("rejects a foreign origin", () => {
    expect(() => assertCsrf(request("https://evil.example", "localhost:3000"))).toThrow(/wrong site/);
  });
});
