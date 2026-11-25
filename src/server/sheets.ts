import { createSign } from "node:crypto";
import { AppError } from "@/domain/errors";

export function sheetsConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SHEETS_SPREADSHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
}

export async function appendSheet(values: string[][]): Promise<void> {
  if (!sheetsConfigured()) throw new AppError(503, "Sheets sync is not configured");
  const sheet = process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? "";
  const account = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? "") as { client_email: string; private_key: string };
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const claim = Buffer.from(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })).toString("base64url");
  const unsigned = `${header}.${claim}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(account.private_key).toString("base64url");
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  });
  const token = await tokenRes.json() as { access_token?: string };
  if (!token.access_token) throw new AppError(502, "Sheets did not accept the login");
  const range = encodeURIComponent("Sheet1!A1");
  const append = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheet}/values/${range}:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    },
  );
  if (!append.ok) throw new AppError(502, "Sheets did not accept the rows");
}
