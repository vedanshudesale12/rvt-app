-- Demo books. Safe to re-run. The product name lives in src/config/brand.ts.
-- Create the matching auth users with `npm run seed-users` (needs the service role key),
-- or promote your own signup to admin with the SQL in the README.
-- Ids match supabase/seed-ids.json.

insert into public.profiles (id, full_name, role, status, is_owner, owner_slot, commission_bps) values
  ('10000000-0000-4000-8000-000000000001', 'Vedanshu', 'admin', 'active', true, 'vedanshu', 0),
  ('10000000-0000-4000-8000-000000000002', 'Rishab Pawar', 'admin', 'active', true, 'rishab', 0),
  ('10000000-0000-4000-8000-000000000003', 'Aisha Kulkarni', 'pr', 'active', false, null, 0),
  ('10000000-0000-4000-8000-000000000004', 'Kabir Shah', 'pr', 'active', false, null, 0),
  ('10000000-0000-4000-8000-000000000005', 'Neha Deshpande', 'data_entry', 'active', false, null, 0),
  ('10000000-0000-4000-8000-000000000006', 'Imran Shaikh', 'door', 'active', false, null, 0),
  ('10000000-0000-4000-8000-000000000007', 'Box Office', 'ticketing_partner', 'active', false, null, 1000),
  ('10000000-0000-4000-8000-000000000008', 'Northline', 'collab_partner', 'active', false, null, 0)
on conflict (id) do update set role = excluded.role, status = excluded.status, is_owner = excluded.is_owner, owner_slot = excluded.owner_slot, commission_bps = excluded.commission_bps;

insert into public.profile_private (profile_id, email, area) values
  ('10000000-0000-4000-8000-000000000001', 'vedanshu@rvt.demo', 'Koregaon Park'),
  ('10000000-0000-4000-8000-000000000002', 'rishab@rvt.demo', 'Kalyani Nagar'),
  ('10000000-0000-4000-8000-000000000003', 'aisha@rvt.demo', 'Deccan'),
  ('10000000-0000-4000-8000-000000000004', 'kabir@rvt.demo', 'Viman Nagar'),
  ('10000000-0000-4000-8000-000000000005', 'neha@rvt.demo', 'Camp'),
  ('10000000-0000-4000-8000-000000000006', 'imran@rvt.demo', 'Camp'),
  ('10000000-0000-4000-8000-000000000007', 'boxoffice@rvt.demo', 'FC Road'),
  ('10000000-0000-4000-8000-000000000008', 'northline@rvt.demo', 'Baner')
on conflict (profile_id) do nothing;

insert into public.events (id, name, event_date, venue, starts_at, status, pr_commission_paise, bar_revenue_paise, bar_split_bps, bar_partner_name, is_collab, collab_brand, collab_partner_id, collab_split_bps)
values
  ('20000000-0000-4000-8000-000000000001', 'Warehouse Friday', '2026-11-28', 'The Warehouse, Kalyani Nagar', '2026-11-28T15:30:00Z', 'published', 20000, 2000000, 4000, 'Venue bar', false, '', null, 0),
  ('20000000-0000-4000-8000-000000000002', 'RVT x Northline', '2026-12-12', 'Northline, Baner', '2026-12-12T15:30:00Z', 'published', 15000, 0, 0, '', true, 'Northline', '10000000-0000-4000-8000-000000000008', 4000)
on conflict (id) do nothing;

insert into public.ticket_types (id, event_id, name, price_paise, sort_order) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Male', 150000, 1),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'Female', 100000, 2),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'Male', 150000, 1)
on conflict (id) do nothing;

insert into public.event_staff (event_id, profile_id, side) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'rvt'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', 'rvt'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', 'rvt')
on conflict (event_id, profile_id) do nothing;
