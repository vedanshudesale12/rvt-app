import { b64ToBytes, bytesToB64, safeEqual } from "@/server/bytes";

const text = new TextEncoder();

function rawBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

/** Readable 32-byte key used only when RVT_DEMO=1 and NODE_ENV is not production. */
export const DEMO_ONLY_KEY_TEXT = "rvt-demo-field-key-32b-not-prod!";

export function demoEncryptionKey(): string {
  return bytesToB64(text.encode(DEMO_ONLY_KEY_TEXT));
}

export function fieldKey(): string {
  const configured = process.env.FIELD_ENCRYPTION_KEY;
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production" && process.env.RVT_DEMO === "1") return demoEncryptionKey();
  throw new Error("FIELD_ENCRYPTION_KEY is required");
}

async function aesKey(keyB64: string): Promise<CryptoKey> {
  const raw = b64ToBytes(keyB64);
  if (raw.byteLength !== 32) throw new Error("FIELD_ENCRYPTION_KEY must be 32 bytes of base64");
  return crypto.subtle.importKey("raw", rawBuffer(raw), "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptField(plain: string, keyB64 = fieldKey()): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await aesKey(keyB64);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, text.encode(plain)));
  return `v1.${bytesToB64(iv)}.${bytesToB64(cipher)}`;
}

export async function decryptField(payload: string, keyB64 = fieldKey()): Promise<string> {
  const [version, ivB64, cipherB64] = payload.split(".");
  if (version !== "v1" || !ivB64 || !cipherB64) throw new Error("Unknown secret format");
  const key = await aesKey(keyB64);
  const clear = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: rawBuffer(b64ToBytes(ivB64)) },
    key,
    rawBuffer(b64ToBytes(cipherB64)),
  );
  return new TextDecoder().decode(clear);
}

export async function hmacValue(value: string, keyB64 = fieldKey()): Promise<string> {
  const raw = b64ToBytes(keyB64);
  const key = await crypto.subtle.importKey("raw", rawBuffer(raw), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, text.encode(value)));
  return bytesToB64(sig);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", text.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "PBKDF2", salt: rawBuffer(salt), iterations: 60_000, hash: "SHA-256" }, key, 256),
  );
  return `pbkdf2.${bytesToB64(salt)}.${bytesToB64(bits)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, hashB64] = stored.split(".");
  if (scheme !== "pbkdf2" || !saltB64 || !hashB64) return false;
  const salt = b64ToBytes(saltB64);
  const key = await crypto.subtle.importKey("raw", text.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "PBKDF2", salt: rawBuffer(salt), iterations: 60_000, hash: "SHA-256" }, key, 256),
  );
  return safeEqual(bytesToB64(bits), hashB64);
}
