import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import ids from "../supabase/seed-ids.json";

let db: PGlite;

async function asUser(id: string) {
  await db.exec("reset role");
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [id]);
  await db.exec("set role authenticated");
}

async function asSuper() {
  await db.exec("reset role");
}

beforeAll(async () => {
  db = new PGlite();
  const sql = readFileSync("supabase/migrations/20261125120000_init.sql", "utf8");
  await db.exec(sql);
  await db.exec(`
    insert into public.profiles (id, full_name, role, status, is_owner, owner_slot) values
      ('${ids.vedanshu}', 'Vedanshu', 'admin', 'active', true, 'vedanshu'),
      ('${ids.rishab}', 'Rishab Pawar', 'admin', 'active', true, 'rishab'),
      ('${ids.aisha}', 'Aisha Kulkarni', 'pr', 'active', false, null),
      ('${ids.kabir}', 'Kabir Shah', 'pr', 'active', false, null),
      ('${ids.neha}', 'Neha Deshpande', 'data_entry', 'active', false, null),
      ('${ids.imran}', 'Imran Shaikh', 'door', 'active', false, null),
      ('${ids.boxoffice}', 'Box Office', 'ticketing_partner', 'active', false, null),
      ('${ids.northline}', 'Northline', 'collab_partner', 'active', false, null);
    insert into public.profile_private (profile_id, email) values
      ('${ids.aisha}', 'aisha@rvt.demo'),
      ('${ids.kabir}', 'kabir@rvt.demo'),
      ('${ids.northline}', 'northline@rvt.demo');
    insert into public.profile_secrets (profile_id, phone_ciphertext, phone_last4, upi_ciphertext) values
      ('${ids.aisha}', 'cipher-aisha', '1111', 'cipher-upi');
    insert into public.events (id, name, event_date, venue, starts_at, status, pr_commission_paise, is_collab, collab_brand, collab_partner_id, collab_split_bps)
    values
      ('${ids.eventFriday}', 'Warehouse Friday', '2026-11-28', 'Kalyani Nagar', '2026-11-28T15:30:00Z', 'published', 20000, false, '', null, 0),
      ('${ids.eventCollab}', 'RVT x Northline', '2026-12-12', 'Baner', '2026-12-12T15:30:00Z', 'published', 15000, true, 'Northline', '${ids.northline}', 4000);
    insert into public.ticket_types (id, event_id, name, price_paise, sort_order) values
      ('${ids.ttMale}', '${ids.eventFriday}', 'Male', 150000, 1),
      ('${ids.ttCollabMale}', '${ids.eventCollab}', 'Male', 150000, 1);
    insert into public.event_staff (event_id, profile_id, side) values
      ('${ids.eventFriday}', '${ids.aisha}', 'rvt'),
      ('${ids.eventFriday}', '${ids.kabir}', 'rvt'),
      ('${ids.eventFriday}', '${ids.boxoffice}', 'rvt'),
      ('${ids.eventCollab}', '${ids.aisha}', 'rvt');
    insert into public.sales (id, event_id, pr_id, promoter_name, side, guest_name, ticket_type_id, amount_paise, status, is_comp, collected_by, logged_by, phone_last4)
    values
      ('${ids.saleRohan}', '${ids.eventFriday}', '${ids.aisha}', null, 'rvt', 'Rohan Mehta', '${ids.ttMale}', 150000, 'verified', false, 'pr', '${ids.aisha}', '9001'),
      ('${ids.saleNehaK}', '${ids.eventFriday}', '${ids.kabir}', null, 'rvt', 'Neha Kulkarni', '${ids.ttMale}', 100000, 'verified', false, 'pr', '${ids.kabir}', '9005'),
      ('${ids.saleCollabRvt}', '${ids.eventCollab}', '${ids.aisha}', null, 'rvt', 'Meher Joshi', '${ids.ttCollabMale}', 150000, 'verified', false, 'pr', '${ids.aisha}', '8001'),
      ('${ids.saleCollabSide}', '${ids.eventCollab}', null, 'Neel Varghese', 'collab', 'Tara Nair', '${ids.ttCollabMale}', 100000, 'verified', false, 'company', '${ids.vedanshu}', '8002');
    insert into public.expenses (id, event_id, category, description, amount_paise, created_by) values
      ('${ids.expenseSound}', '${ids.eventFriday}', 'Sound', 'DJ', 800000, '${ids.vedanshu}'),
      ('50000000-0000-4000-8000-000000000099', '${ids.eventCollab}', 'Venue', 'private note about Aisha', 1000, '${ids.vedanshu}');
    insert into public.settlements (event_id, snapshot, created_by) values
      ('${ids.eventFriday}', '{"profitPaise":1}', '${ids.vedanshu}');
  `);
});

describe("row level security", () => {
  it("hides PR B's guests from PR A", async () => {
    await asUser(ids.aisha);
    const sales = await db.query<{ guest_name: string }>(`select guest_name from public.sales order by guest_name`);
    expect(sales.rows.map((row) => row.guest_name)).toEqual(["Meher Joshi", "Rohan Mehta"]);
    const kabir = await db.query(`select id from public.sales where id = '${ids.saleNehaK}'`);
    expect(kabir.rows).toHaveLength(0);
  });

  it("blocks PR A from updating PR B", async () => {
    await asUser(ids.aisha);
    await expect(db.exec(`update public.sales set notes = 'nope' where id = '${ids.saleNehaK}'`)).rejects.toThrow(/permission denied|42501/i);
  });

  it("forces a PR log onto their own id", async () => {
    await asUser(ids.aisha);
    const created = await db.query<{ rvt_log_sale: string }>(
      `select public.rvt_log_sale(
        '${ids.eventFriday}', 'Sneha Test', '${ids.ttMale}', '${ids.kabir}', 'rvt', null,
        'cipher', 'hmac', '1212', '', null, null, 'pr', 'manual', false
      )`,
    );
    await asSuper();
    const row = await db.query<{ pr_id: string; amount_paise: number; status: string }>(
      `select pr_id, amount_paise, status from public.sales where id = '${created.rows[0].rvt_log_sale}'`,
    );
    expect(row.rows[0]).toMatchObject({ pr_id: ids.aisha, amount_paise: 150000, status: "pending" });
  });

  it("does not show RVT PR names to a collab partner", async () => {
    await asUser(ids.northline);
    const sales = await db.query<{ guest_name: string; promoter_name: string | null }>(`select guest_name, promoter_name from public.sales`);
    expect(sales.rows).toEqual([{ guest_name: "Tara Nair", promoter_name: "Neel Varghese" }]);
    const names = await db.query(`select full_name from public.profiles where role = 'pr'`);
    expect(names.rows).toHaveLength(0);
    const staff = await db.query(`select profile_id from public.event_staff where side = 'rvt'`);
    expect(staff.rows).toHaveLength(0);
    const facts = await db.query<{ rvt_event_facts: { label: string; tickets: number; amountPaise: number } }>(
      `select public.rvt_event_facts('${ids.eventCollab}') as rvt_event_facts`,
    );
    expect(facts.rows[0].rvt_event_facts).toEqual({ label: "RVT team", tickets: 1, amountPaise: 150000 });
    expect(JSON.stringify(facts.rows[0].rvt_event_facts)).not.toMatch(/Aisha|Kabir|Meher/);
    const preview = await db.query<{ rvt_settlement_preview: Record<string, unknown> }>(
      `select public.rvt_settlement_preview('${ids.eventCollab}') as rvt_settlement_preview`,
    );
    const body = JSON.stringify(preview.rows[0].rvt_settlement_preview);
    expect(body).not.toMatch(/Aisha|Kabir|Meher|Vedanshu|Rishab/);
    expect(preview.rows[0].rvt_settlement_preview.prLines).toBeUndefined();
  });

  it("hides profit from data entry", async () => {
    await asUser(ids.neha);
    const settlements = await db.query(`select id from public.settlements`);
    expect(settlements.rows).toHaveLength(0);
    const preview = await db.query<{ rvt_settlement_preview: Record<string, unknown> }>(
      `select public.rvt_settlement_preview('${ids.eventFriday}') as rvt_settlement_preview`,
    );
    expect(preview.rows[0].rvt_settlement_preview).toEqual({ expensesPaise: 800000 });
    expect(preview.rows[0].rvt_settlement_preview.profitPaise).toBeUndefined();
  });

  it("hides another PR's phone and UPI", async () => {
    await asUser(ids.kabir);
    const secrets = await db.query(`select phone_ciphertext, upi_ciphertext from public.profile_secrets`);
    expect(secrets.rows).toHaveLength(0);
  });

  it("lets a ticketing partner open an event they are on", async () => {
    await asUser(ids.boxoffice);
    const events = await db.query<{ name: string }>(`select name from public.events order by name`);
    expect(events.rows.map((row) => row.name)).toEqual(["Warehouse Friday"]);
  });

  it("lets a collab partner log only their own side", async () => {
    await asUser(ids.northline);
    await expect(db.query(
      `select public.rvt_log_sale(
        '${ids.eventCollab}', 'Nope', '${ids.ttCollabMale}', null, 'rvt', null,
        null, null, '1212', '', null, null, 'company', 'manual', false
      )`,
    )).rejects.toThrow(/forbidden/i);
    const created = await db.query<{ rvt_log_sale: string }>(
      `select public.rvt_log_sale(
        '${ids.eventCollab}', 'Neel Guest', '${ids.ttCollabMale}', null, 'collab', 'Neel Varghese',
        null, null, '3434', '', null, null, 'company', 'manual', false
      )`,
    );
    await asSuper();
    const row = await db.query<{ side: string; collab_partner_id: string; pr_id: string | null }>(
      `select side, collab_partner_id, pr_id from public.sales where id = '${created.rows[0].rvt_log_sale}'`,
    );
    expect(row.rows[0]).toMatchObject({ side: "collab", collab_partner_id: ids.northline, pr_id: null });
    await asUser(ids.northline);
    await expect(db.exec(`update public.sales set notes = 'nope' where id = '${ids.saleCollabRvt}'`)).rejects.toThrow(/permission denied|42501/i);
    await expect(db.query(`select description from public.expenses`)).rejects.toThrow(/permission denied|42501/i);
    const notes = await db.query<{ description: string }>(`select description from public.expense_rows where event_id = '${ids.eventCollab}'`);
    expect(notes.rows.map((item) => item.description)).toEqual([""]);
    expect(JSON.stringify(notes.rows)).not.toMatch(/Aisha/);
  });

  it("lets an admin read both PRs", async () => {
    await asUser(ids.vedanshu);
    const sales = await db.query(`select id from public.sales`);
    expect(sales.rows.length).toBeGreaterThanOrEqual(4);
  });
});
