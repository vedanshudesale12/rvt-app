import { describe, expect, it } from "vitest";
import { bytesToB64 } from "@/server/bytes";
import { DEMO_ONLY_KEY_TEXT, decryptField, encryptField, hmacValue, verifyPassword, hashPassword } from "@/server/crypto";
import { memoryHit, resetRateLimits } from "@/server/rate-limit";

const key = bytesToB64(new TextEncoder().encode(DEMO_ONLY_KEY_TEXT));

describe("secrets", () => {
  it("round-trips phone and UPI ciphertext", async () => {
    expect(new TextEncoder().encode(DEMO_ONLY_KEY_TEXT).length).toBe(32);
    const phone = await encryptField("919876543210", key);
    const upi = await encryptField("ved@upi", key);
    expect(phone.startsWith("v1.")).toBe(true);
    expect(phone).not.toContain("9876543210");
    expect(await decryptField(phone, key)).toBe("919876543210");
    expect(await decryptField(upi, key)).toBe("ved@upi");
    expect(await hmacValue("919876543210", key)).toBe(await hmacValue("919876543210", key));
    expect(await hmacValue("919876543210", key)).not.toBe(await hmacValue("919000000000", key));
  });

  it("hashes passwords and rate-limits", async () => {
    const hash = await hashPassword("demo-pass-123");
    expect(hash.startsWith("pbkdf2.")).toBe(true);
    expect(await verifyPassword("demo-pass-123", hash)).toBe(true);
    expect(await verifyPassword("nope", hash)).toBe(false);
    resetRateLimits();
    expect(memoryHit("login:1", 2, 1000)).toBe(true);
    expect(memoryHit("login:1", 2, 1000)).toBe(true);
    expect(memoryHit("login:1", 2, 1000)).toBe(false);
  });
});
