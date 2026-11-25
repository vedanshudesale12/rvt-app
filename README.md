# Backstage RVT

Staff app for Riot Vibe Theory (Pune). Guest lists, the door, comps, the ledger, and who owes what. The product name is `APP.name` in `src/config/brand.ts` (`Backstage RVT`, short name `Backstage`). Change it there. This README repeats the same words so a rename stays obvious.

Online only. Installable. Every user and guest is 18+.

## What you need

- Node.js 22 (20+ works)
- A Supabase project (free tier)
- A Cloudflare account for the Worker
- Optional: Gemini, Resend, Turnstile, Sentry, Google Sheets

On Fedora:

```bash
sudo dnf install nodejs git
git clone <this-repo>
cd backstage-rvt
npm ci
cp .env.example .env.local
```

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com). Pick a region. Free tier pauses after a week without traffic, so keep the daily ping in step 6.
2. Authentication → Providers → Email. Turn **off** “Confirm email” so staff can log in immediately. Do not enable public signups you do not want; the app still creates users through its own signup page.
3. Authentication → URL configuration. Site URL is your real origin (`https://your-worker.workers.dev` or the custom domain). Add `http://localhost:3000` for local work.
4. Project Settings → API. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / publishable key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (this is the only key that may reach the browser)
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (server only, never `NEXT_PUBLIC_`)
5. Project Settings → Database. Copy the URI for `BACKUP_DATABASE_URL` (server / CI only).
6. SQL editor → paste `supabase/migrations/20261125120000_init.sql`, run it, then paste `supabase/migrations/20261125120100_auth_hook.sql` and run that. Or, with the CLI: `npx supabase login`, `npx supabase link --project-ref YOUR_REF`, `npx supabase db push`.
7. Storage. The migration creates private buckets `proofs` and `avatars` when the storage schema exists. If it did not, create both as **private** in the dashboard. Cap uploads at 5 MB. The app also checks type and size.
8. Optional demo rows: SQL editor → `supabase/seed.sql`. Then:

```bash
SEED_PASSWORD='choose-a-password' npm run seed-users
```

That creates auth users with the ids in `supabase/seed-ids.json`. Emails look like `vedanshu@rvt.demo`. Change them before real use.

### First real admin

Sign up as yourself (you will land as a PR), then in the SQL editor:

```sql
update public.profiles
set role = 'admin', status = 'active', is_owner = true, owner_slot = 'vedanshu'
where id = (select profile_id from public.profile_private where email = 'you@example.com');
```

Do the same for Rishab with `owner_slot = 'rishab'`. Owners are not editable from the People screen. The RVT share splits 50-50 between those two slots. A collab partner’s cut is taken **before** that split.

Door and data-entry logins are created from People. They cannot sign themselves up.

## 2. Env vars

Copy `.env.example` to `.env.local`. Never commit real values.

| Name | Who sees it | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser | Yes, for a real deploy |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Yes |
| `FIELD_ENCRYPTION_KEY` | Server only | Yes. 32 bytes, base64. `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `SESSION_SECRET` | Server only | Yes. Long random string. Signs the idle cookie. |
| `CRON_SECRET` | Server only | Yes. Bearer token for the daily ping. |
| `NEXT_PUBLIC_APP_URL` | Browser | Yes. No trailing slash. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Browser | Yes in production |
| `TURNSTILE_SECRET_KEY` | Server only | Yes in production |
| `GEMINI_API_KEY` | Server only | For chat. Without it, pasted lists still parse locally. |
| `GEMINI_MODEL` | Server only | Optional. Default `gemini-2.0-flash`. |
| `RESEND_API_KEY` | Server only | For event email. |
| `RESEND_FROM` | Server only | Sender address. Not chosen yet. `Name <you@domain>` or a bare address. |
| `LEGAL_CONTACT_EMAIL` | Server | Grievance contact on the policy pages. |
| `COOKIE_SECURE` | Server | Set `1` on HTTPS. Leave unset for `http://localhost`. |
| `SENTRY_DSN` | Server | Optional. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Browser | Optional web push. `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Server only | With the public key. |
| `VAPID_SUBJECT` | Server | `mailto:you@domain` |
| `BACKUP_DATABASE_URL` | CI / your laptop | For `npm run backup`. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | CI | One-line JSON. Weekly sheet export. |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | CI | The sheet id. |
| `SEED_PASSWORD` | Your laptop, once | Only for `npm run seed-users`. |
| `RVT_DEMO` | Local only | `1` to click through without Supabase. Refused when `NODE_ENV=production`. |
| `TURNSTILE_BYPASS` | Local only | `1` skips Turnstile. Refused in production. |

Local demo, no accounts yet:

```bash
RVT_DEMO=1 npm run dev
```

Open http://localhost:3000/login. Password `demo-pass-123`. Vedanshu is `vedanshu@rvt.demo`. A PR is `aisha@rvt.demo`. Door is `imran@rvt.demo`. Data entry is `neha@rvt.demo`. Ticketing is `boxoffice@rvt.demo`. Collab is `northline@rvt.demo`.

## 3. Cloudflare

This repo is stock Next.js for local `npm run dev`, and [OpenNext](https://opennext.js.org/cloudflare) for Workers. Cloudflare also ships vinext; this app stays on OpenNext so Fedora just runs `next dev` / `next build`.

```bash
npx wrangler login
# put every server secret. Do not put NEXT_PUBLIC_ values here if you also set them at build time.
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put FIELD_ENCRYPTION_KEY
npx wrangler secret put SESSION_SECRET
npx wrangler secret put CRON_SECRET
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_FROM
npm run deploy
```

Set `NEXT_PUBLIC_*` before `npm run deploy` so they are inlined into the client bundle. Set `COOKIE_SECURE=1` in the Worker env. `NEXT_PUBLIC_APP_URL` must be the HTTPS origin.

Turnstile: Cloudflare dashboard → Turnstile → add the Worker hostname. Put the site key and secret in env.

Preview: `npm run preview`. Rollback: Cloudflare dashboard → Workers → your worker → Deployments → the previous version → Rollback. CLI: `npx wrangler rollback`.

GitHub → Settings → Secrets → `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` if you later wire deploy on push. Pull requests should get a preview; connect the repo under Workers Builds, or run `npm run preview` from a branch.

## 4. Daily keep-alive

Supabase free projects pause after about 7 days without a query. `GET /api/cron/keepalive` with `Authorization: Bearer $CRON_SECRET` runs `select` on `profiles`.

GitHub → Settings → Secrets → `CRON_SECRET` and `APP_URL`. The workflow `.github/workflows/keepalive.yml` runs every day at 06:00 UTC. You can also point any uptime checker at that URL with the same header.

## 5. Backups and the weekly sheet

Supabase free tier has no automatic backups.

```bash
BACKUP_DATABASE_URL='postgres://...' npm run backup
```

Writes `backups/backstage-YYYYMMDD.sql` via `pg_dump`. Store that file somewhere private. `.github/workflows/backup.yml` runs weekly if `BACKUP_DATABASE_URL` is a GitHub secret and uploads the artifact (GitHub artifacts are not a long-term archive; download them).

Weekly sheet:

```bash
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}' \
GOOGLE_SHEETS_SPREADSHEET_ID='...' \
BACKUP_DATABASE_URL='...' \
npm run sheets
```

The script appends one row per open event: name, date, verified guests, ticket money, expenses, profit. Share the sheet with the service account email. The workflow is `.github/workflows/sheets.yml`.

## 6. Security notes (short)

- HTTPS and HSTS. CSP, `X-Frame-Options: DENY`, nosniff, Referrer-Policy, Permissions-Policy.
- Supabase Auth stores the password hash. Sessions are httpOnly, Secure (in production), SameSite=Lax. Nothing auth-related is put in localStorage.
- Mutations need the `rvt_csrf` cookie echoed in `x-csrf-token`, plus SameSite.
- Idle logout is 30 minutes (`APP.idleMinutes`).
- RLS is on every table. The anon key cannot insert or update. Amounts, roles, verification, comps, and settle-up are functions or server code. Tests in `tests/rls.test.ts` and `tests/security.test.ts` cover PR A vs PR B, collab partners vs PR names, and data entry vs profit.
- Phone and UPI are AES-GCM ciphertext. Door search uses name and last four digits.
- Uploads: jpeg, png, webp, pdf, 5 MB, magic-byte check, private bucket, signed URL for 60 seconds.
- Zod `.strict()` rejects `role`, `amount`, `status`, and `verified` on guest payloads.
- Soft deletes on guests, expenses, profiles, events. `audit_log` is append-only.
- `npm audit` (high), gitleaks, and tests run on pull requests. Dependabot is weekly.

## 7. Scripts

```bash
npm run dev
npm test
npm run lint
npm run typecheck
npm run icons
npm run build
```

## Logo

The full lockup is `public/brand/rvt-logo.png` (login, signup, door, email). The RVT mark is `public/brand/rvt-mark.png` and `public/brand/rvt-mark.svg` (sidebar). `npm run icons` writes the favicon and PWA icons from the mark.
