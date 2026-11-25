import { createSign } from "node:crypto";
import { execFileSync } from "node:child_process";

const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const sheet = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const dbUrl = process.env.BACKUP_DATABASE_URL;
if (!raw || !sheet || !dbUrl) {
  console.error("Set GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_SHEETS_SPREADSHEET_ID, and BACKUP_DATABASE_URL");
  process.exit(1);
}
const account = JSON.parse(raw);
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
const token = await tokenRes.json();
if (!token.access_token) {
  console.error(token);
  process.exit(1);
}

const csv = execFileSync("psql", [dbUrl, "-At", "-F", ",", "-c", `
  select e.name, e.event_date::text,
    count(s.id) filter (where s.status = 'verified' and s.is_comp = false and s.deleted_at is null),
    coalesce(sum(s.amount_paise) filter (where s.status = 'verified' and s.is_comp = false and s.deleted_at is null), 0) / 100.0
  from public.events e
  left join public.sales s on s.event_id = e.id
  where e.deleted_at is null
  group by e.id
  order by e.event_date
`], { encoding: "utf8" });
const values = csv.trim().split("\n").filter(Boolean).map((line) => line.split(","));
const range = encodeURIComponent("Sheet1!A1");
const append = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheet}/values/${range}:append?valueInputOption=USER_ENTERED`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ values }),
});
if (!append.ok) {
  console.error(await append.text());
  process.exit(1);
}
console.log(`Appended ${values.length} rows`);
