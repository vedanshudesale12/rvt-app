export function cleanText(input: string, max: number): string {
  return input
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length < 8 || digits.length > 15) {
    throw new Error("Enter a real phone number");
  }
  return digits;
}

export function last4(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-4);
}

const PROOF_PATH = /^(proofs|avatars)\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|pdf)$/;

export function assertStoragePath(path: string): string {
  const trimmed = path.trim();
  if (!PROOF_PATH.test(trimmed)) throw new Error("That file path is not allowed");
  return trimmed;
}

export function isAdminCommand(text: string): boolean {
  return /^(please\s+)?(approve|reject|verify|settle|delete|disable|enable|set\s+role|mark\s+settled)\b/i.test(
    text.trim(),
  );
}
