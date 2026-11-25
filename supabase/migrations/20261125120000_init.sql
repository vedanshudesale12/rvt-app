-- Backstage RVT. Money, approval, comps, and settle-up live in this database.
-- The browser anon key cannot insert or update these tables. Writes go through
-- the functions below, which ignore client-supplied amounts, roles, and status.

-- gen_random_uuid() is built into Postgres 13+. pgcrypto is optional and
-- not required for this schema. Supabase can enable it in the dashboard if
-- a later script wants crypt().

do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'auth') then
    create schema auth;
  end if;
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth' and p.proname = 'uid'
  ) then
    create function auth.uid()
    returns uuid
    language sql
    stable
    as $fn$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $fn$;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

create schema if not exists private;

create or replace function private.trusted()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_setting('app.trusted', true) = 'on';
$$;

create table public.profiles (
  id uuid primary key,
  full_name text not null check (char_length(full_name) between 1 and 120),
  role text check (role in ('admin', 'pr', 'data_entry', 'door', 'ticketing_partner', 'collab_partner')),
  status text not null default 'pending' check (status in ('active', 'pending', 'disabled')),
  is_owner boolean not null default false,
  owner_slot text check (owner_slot in ('vedanshu', 'rishab')),
  commission_bps integer not null default 0 check (commission_bps between 0 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.profile_private (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  email text not null unique,
  instagram_handle text not null default '',
  college_or_workplace text not null default '',
  area text not null default '',
  referrer text not null default '',
  photo_path text
);

create table public.profile_secrets (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  phone_ciphertext text,
  phone_hmac text,
  phone_last4 text,
  upi_ciphertext text
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  event_date date not null,
  venue text not null,
  starts_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'live', 'settled')),
  pr_commission_paise integer not null default 0 check (pr_commission_paise >= 0),
  bar_revenue_paise integer not null default 0 check (bar_revenue_paise >= 0),
  bar_split_bps integer not null default 0 check (bar_split_bps between 0 and 10000),
  bar_partner_name text not null default '',
  is_collab boolean not null default false,
  collab_brand text not null default '',
  collab_partner_id uuid references public.profiles (id),
  collab_split_bps integer not null default 0 check (collab_split_bps between 0 and 10000),
  settled_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  price_paise integer not null check (price_paise >= 0),
  sort_order integer not null default 0
);

create table public.event_staff (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  side text not null check (side in ('rvt', 'collab')),
  commission_paise integer check (commission_paise is null or commission_paise >= 0),
  unique (event_id, profile_id)
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id),
  pr_id uuid references public.profiles (id),
  promoter_name text,
  side text not null check (side in ('rvt', 'collab')),
  guest_name text not null check (char_length(guest_name) between 1 and 120),
  ticket_type_id uuid not null references public.ticket_types (id),
  amount_paise integer not null check (amount_paise >= 0),
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  is_comp boolean not null default false,
  comp_status text check (comp_status in ('pending', 'approved', 'rejected')),
  collected_by text not null default 'pr' check (collected_by in ('pr', 'company', 'ticketing_partner')),
  ticketing_partner_id uuid references public.profiles (id),
  logged_by uuid not null references public.profiles (id),
  proof_path text,
  checked_in_at timestamptz,
  checked_in_by uuid references public.profiles (id),
  source text not null default 'manual' check (source in ('manual', 'bulk_chat')),
  notes text not null default '',
  phone_last4 text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.sale_secrets (
  sale_id uuid primary key references public.sales (id) on delete cascade,
  phone_ciphertext text,
  phone_hmac text,
  phone_last4 text
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id),
  category text not null,
  description text not null,
  amount_paise integer not null check (amount_paise >= 0),
  created_by uuid not null references public.profiles (id),
  receipt_path text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id),
  snapshot jsonb not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid references public.events (id),
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid references public.events (id),
  role text not null check (role in ('user', 'assistant')),
  body text not null,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.rate_limits (
  bucket text primary key,
  window_start timestamptz not null,
  hits integer not null
);

create index sales_event_idx on public.sales (event_id) where deleted_at is null;
create index sales_pr_idx on public.sales (pr_id) where deleted_at is null;
create index sales_ticketing_idx on public.sales (ticketing_partner_id) where deleted_at is null;
create index sale_secrets_hmac_idx on public.sale_secrets (phone_hmac);
create index event_staff_profile_idx on public.event_staff (profile_id);
create index events_date_idx on public.events (event_date);
create index notifications_user_idx on public.notifications (user_id, read_at);
create index audit_created_idx on public.audit_log (created_at desc);
create index expenses_event_idx on public.expenses (event_id) where deleted_at is null;

create or replace function private.actor_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
    and p.deleted_at is null
    and p.status = 'active';
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.actor_role() = 'admin';
$$;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
for each row execute function private.touch_updated_at();
create trigger events_touch before update on public.events
for each row execute function private.touch_updated_at();
create trigger sales_touch before update on public.sales
for each row execute function private.touch_updated_at();

create or replace function private.guard_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if session_user in ('postgres', 'supabase_admin') or private.trusted() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.status is distinct from old.status
     or new.is_owner is distinct from old.is_owner
     or new.owner_slot is distinct from old.owner_slot
     or new.commission_bps is distinct from old.commission_bps then
    raise exception 'role locked';
  end if;
  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
for each row execute function private.guard_profile();

create or replace function private.guard_sale()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.trusted()
     or session_user in ('postgres', 'supabase_admin')
     or coalesce((select rolsuper from pg_catalog.pg_roles where rolname = session_user), false) then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.status is distinct from 'pending' then
      raise exception 'field locked';
    end if;
    return new;
  end if;
  if new.amount_paise is distinct from old.amount_paise
     or new.status is distinct from old.status
     or new.comp_status is distinct from old.comp_status
     or new.pr_id is distinct from old.pr_id
     or new.side is distinct from old.side
     or new.is_comp is distinct from old.is_comp
     or new.checked_in_at is distinct from old.checked_in_at
     or new.event_id is distinct from old.event_id
     or new.ticketing_partner_id is distinct from old.ticketing_partner_id then
    raise exception 'field locked';
  end if;
  return new;
end;
$$;

create trigger sales_guard before insert or update on public.sales
for each row execute function private.guard_sale();

create or replace function private.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_json jsonb := to_jsonb(coalesce(new, old));
  entity uuid;
begin
  entity := nullif(row_json ->> coalesce(tg_argv[0], 'id'), '')::uuid;
  insert into public.audit_log (actor_id, action, entity, entity_id, payload)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    entity,
    case
      when tg_table_name in ('profile_secrets', 'sale_secrets') then '{"redacted":true}'::jsonb
      else jsonb_build_object('op', tg_op)
    end
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_profiles after insert or update on public.profiles
for each row execute function private.audit_row('id');
create trigger audit_events after insert or update on public.events
for each row execute function private.audit_row('id');
create trigger audit_sales after insert or update on public.sales
for each row execute function private.audit_row('id');
create trigger audit_expenses after insert or update on public.expenses
for each row execute function private.audit_row('id');

create or replace function private.audit_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit log is append-only';
end;
$$;

create trigger audit_no_update before update or delete on public.audit_log
for each row execute function private.audit_immutable();

-- Settlement math. Collab share is taken before the RVT 50-50.
-- Remainder paise on the 50-50 go to Vedanshu. Integer division matches the app.
create or replace function private.compute_settlement(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  ev public.events%rowtype;
  ticket_revenue integer := 0;
  expense_total integer := 0;
  pr_commission integer := 0;
  ticketing_commission integer := 0;
  bar_share integer;
  profit integer;
  collab_share integer := 0;
  rvt_share integer;
  rishab integer;
  pr_lines jsonb := '[]'::jsonb;
  ticketing_lines jsonb := '[]'::jsonb;
begin
  select * into ev from public.events where id = p_event_id and deleted_at is null;
  if not found then
    raise exception 'not found';
  end if;

  select coalesce(sum(amount_paise), 0)::integer into ticket_revenue
  from public.sales
  where event_id = p_event_id and deleted_at is null and is_comp = false and status = 'verified';

  select coalesce(sum(amount_paise), 0)::integer into expense_total
  from public.expenses
  where event_id = p_event_id and deleted_at is null;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', grouped.pr_id,
    'name', grouped.full_name,
    'commissionPaise', grouped.tickets * grouped.each_paise,
    'collectedPaise', grouped.collected,
    'dueToCompanyPaise', grouped.collected - grouped.tickets * grouped.each_paise
  )), '[]'::jsonb)
  into pr_lines
  from (
    select s.pr_id,
           p.full_name,
           count(*)::integer as tickets,
           coalesce(max(es.commission_paise), ev.pr_commission_paise) as each_paise,
           coalesce(sum(s.amount_paise) filter (where s.collected_by = 'pr'), 0)::integer as collected
    from public.sales s
    join public.profiles p on p.id = s.pr_id
    left join public.event_staff es on es.event_id = s.event_id and es.profile_id = s.pr_id
    where s.event_id = p_event_id
      and s.deleted_at is null
      and s.is_comp = false
      and s.status = 'verified'
      and s.side = 'rvt'
    group by s.pr_id, p.full_name
  ) grouped;

  select coalesce(sum((line ->> 'commissionPaise')::integer), 0)::integer
  into pr_commission
  from jsonb_array_elements(pr_lines) line;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', grouped.partner_id,
    'name', grouped.full_name,
    'commissionPaise', (grouped.revenue * grouped.bps) / 10000,
    'collectedPaise', grouped.collected,
    'dueToCompanyPaise', grouped.collected - (grouped.revenue * grouped.bps) / 10000
  )), '[]'::jsonb)
  into ticketing_lines
  from (
    select s.ticketing_partner_id as partner_id,
           p.full_name,
           coalesce(sum(s.amount_paise), 0)::integer as revenue,
           p.commission_bps as bps,
           coalesce(sum(s.amount_paise) filter (where s.collected_by = 'ticketing_partner'), 0)::integer as collected
    from public.sales s
    join public.profiles p on p.id = s.ticketing_partner_id
    where s.event_id = p_event_id
      and s.deleted_at is null
      and s.is_comp = false
      and s.status = 'verified'
    group by s.ticketing_partner_id, p.full_name, p.commission_bps
  ) grouped;

  select coalesce(sum((line ->> 'commissionPaise')::integer), 0)::integer
  into ticketing_commission
  from jsonb_array_elements(ticketing_lines) line;

  bar_share := ev.bar_revenue_paise * ev.bar_split_bps / 10000;
  profit := ticket_revenue + (ev.bar_revenue_paise - bar_share) - expense_total - pr_commission - ticketing_commission;
  if ev.is_collab then
    collab_share := profit * ev.collab_split_bps / 10000;
  end if;
  rvt_share := profit - collab_share;
  rishab := rvt_share / 2;

  return jsonb_build_object(
    'ticketRevenuePaise', ticket_revenue,
    'barRevenuePaise', ev.bar_revenue_paise,
    'barPartnerSharePaise', bar_share,
    'barRetainedPaise', ev.bar_revenue_paise - bar_share,
    'barPartnerName', ev.bar_partner_name,
    'expensesPaise', expense_total,
    'prCommissionPaise', pr_commission,
    'ticketingCommissionPaise', ticketing_commission,
    'profitPaise', profit,
    'collabSharePaise', collab_share,
    'collabBrand', case when ev.is_collab then ev.collab_brand else null end,
    'rvtSharePaise', rvt_share,
    'vedanshuPaise', rvt_share - rishab,
    'rishabPaise', rishab,
    'prLines', pr_lines,
    'ticketingLines', ticketing_lines
  );
end;
$$;

create or replace function public.rvt_log_sale(
  p_event_id uuid,
  p_guest_name text,
  p_ticket_type_id uuid,
  p_pr_id uuid,
  p_side text,
  p_promoter_name text,
  p_phone_ciphertext text,
  p_phone_hmac text,
  p_phone_last4 text,
  p_notes text,
  p_proof_path text,
  p_ticketing_partner_id uuid,
  p_collected_by text,
  p_source text,
  p_is_comp boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  role text := private.actor_role();
  ev public.events%rowtype;
  price integer;
  new_id uuid := gen_random_uuid();
  use_pr uuid;
  use_side text;
begin
  if uid is null or role is null then
    raise exception 'unauthenticated';
  end if;
  if role not in ('admin', 'pr', 'data_entry') then
    raise exception 'forbidden';
  end if;
  select * into ev from public.events where id = p_event_id and deleted_at is null;
  if not found or ev.status = 'settled' then
    raise exception 'not found';
  end if;
  use_side := case when p_side = 'collab' then 'collab' else 'rvt' end;
  if role = 'pr' then
    if use_side <> 'rvt' then
      raise exception 'forbidden';
    end if;
    if not exists (
      select 1 from public.event_staff es
      where es.event_id = p_event_id and es.profile_id = uid
    ) then
      raise exception 'forbidden';
    end if;
    use_pr := uid;
  else
    use_pr := case when use_side = 'collab' then null else p_pr_id end;
    if use_side = 'rvt' and use_pr is null then
      raise exception 'pick a pr';
    end if;
  end if;
  if use_side = 'collab' and ev.is_collab = false then
    raise exception 'not a collab';
  end if;
  select price_paise into price from public.ticket_types
  where id = p_ticket_type_id and event_id = p_event_id;
  if price is null then
    raise exception 'unknown ticket';
  end if;
  perform set_config('app.trusted', 'on', true);
  insert into public.sales (
    id, event_id, pr_id, promoter_name, side, guest_name, ticket_type_id,
    amount_paise, status, is_comp, comp_status, collected_by, ticketing_partner_id,
    logged_by, proof_path, source, notes, phone_last4
  ) values (
    new_id, p_event_id, use_pr,
    case when use_side = 'collab' then left(coalesce(p_promoter_name, 'Collab'), 120) else null end,
    use_side, left(p_guest_name, 120), p_ticket_type_id,
    case when p_is_comp then 0 else price end,
    'pending', coalesce(p_is_comp, false),
    case when p_is_comp then 'pending' else null end,
    case when p_is_comp then 'company' else coalesce(p_collected_by, 'pr') end,
    p_ticketing_partner_id, uid, p_proof_path,
    case when p_source = 'bulk_chat' then 'bulk_chat' else 'manual' end,
    left(coalesce(p_notes, ''), 500), left(coalesce(p_phone_last4, ''), 8)
  );
  insert into public.sale_secrets (sale_id, phone_ciphertext, phone_hmac, phone_last4)
  values (new_id, p_phone_ciphertext, p_phone_hmac, p_phone_last4);
  return new_id;
end;
$$;

create or replace function public.rvt_review_sale(p_id uuid, p_decision text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_admin() is not true then
    raise exception 'forbidden';
  end if;
  if p_decision not in ('verified', 'rejected') then
    raise exception 'bad decision';
  end if;
  perform set_config('app.trusted', 'on', true);
  update public.sales
  set status = p_decision
  where id = p_id and deleted_at is null and is_comp = false;
  if not found then
    raise exception 'not found';
  end if;
end;
$$;

create or replace function public.rvt_review_comp(p_id uuid, p_decision text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_admin() is not true then
    raise exception 'forbidden';
  end if;
  perform set_config('app.trusted', 'on', true);
  if p_decision = 'approved' then
    update public.sales
    set comp_status = 'approved', status = 'verified', amount_paise = 0
    where id = p_id and deleted_at is null and is_comp = true;
  elsif p_decision = 'rejected' then
    update public.sales
    set comp_status = 'rejected', status = 'rejected'
    where id = p_id and deleted_at is null and is_comp = true;
  else
    raise exception 'bad decision';
  end if;
  if not found then
    raise exception 'not found';
  end if;
end;
$$;

create or replace function public.rvt_check_in(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  role text := private.actor_role();
  sale public.sales%rowtype;
  stamp timestamptz;
begin
  if uid is null or role not in ('admin', 'pr', 'door') then
    raise exception 'forbidden';
  end if;
  select * into sale from public.sales where id = p_id and deleted_at is null;
  if not found then
    raise exception 'not found';
  end if;
  if role = 'pr' and not exists (
    select 1 from public.event_staff es where es.event_id = sale.event_id and es.profile_id = uid
  ) then
    raise exception 'forbidden';
  end if;
  if sale.is_comp and sale.comp_status is distinct from 'approved' then
    return jsonb_build_object('result', 'not_approved');
  end if;
  if sale.is_comp = false and sale.status is distinct from 'verified' then
    return jsonb_build_object('result', 'not_verified');
  end if;
  if sale.checked_in_at is not null then
    return jsonb_build_object('result', 'already_inside', 'checkedInAt', sale.checked_in_at);
  end if;
  perform set_config('app.trusted', 'on', true);
  update public.sales
  set checked_in_at = now(), checked_in_by = uid
  where id = p_id and checked_in_at is null
  returning checked_in_at into stamp;
  if stamp is null then
    select checked_in_at into stamp from public.sales where id = p_id;
    return jsonb_build_object('result', 'already_inside', 'checkedInAt', stamp);
  end if;
  return jsonb_build_object('result', 'inside', 'checkedInAt', stamp);
end;
$$;

create or replace function public.rvt_event_facts(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  role text := private.actor_role();
  ev public.events%rowtype;
  tickets integer;
  amount integer;
begin
  if uid is null or role is null then
    raise exception 'unauthenticated';
  end if;
  select * into ev from public.events where id = p_event_id and deleted_at is null;
  if not found then
    raise exception 'not found';
  end if;
  if role = 'collab_partner' and (ev.collab_partner_id is distinct from uid or ev.status = 'settled') then
    raise exception 'not found';
  end if;
  if role in ('pr', 'ticketing_partner') and not exists (
    select 1 from public.event_staff es
    where es.event_id = p_event_id and es.profile_id = uid
  ) then
    raise exception 'not found';
  end if;
  if role not in ('admin', 'collab_partner', 'data_entry', 'pr', 'door', 'ticketing_partner') then
    raise exception 'forbidden';
  end if;
  select count(*)::integer, coalesce(sum(amount_paise), 0)::integer
  into tickets, amount
  from public.sales
  where event_id = p_event_id and deleted_at is null and side = 'rvt' and status = 'verified' and is_comp = false;
  return jsonb_build_object('label', 'RVT team', 'tickets', tickets, 'amountPaise', amount);
end;
$$;

create or replace function public.rvt_settlement_preview(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  role text := private.actor_role();
  snapshot jsonb;
begin
  if role is null then
    raise exception 'unauthenticated';
  end if;
  if role = 'collab_partner' and not exists (
    select 1 from public.events e
    where e.id = p_event_id and e.collab_partner_id = auth.uid() and e.status <> 'settled' and e.deleted_at is null
  ) then
    raise exception 'not found';
  end if;
  if role = 'pr' and not exists (
    select 1 from public.event_staff es
    where es.event_id = p_event_id and es.profile_id = auth.uid()
  ) then
    raise exception 'not found';
  end if;
  snapshot := private.compute_settlement(p_event_id);
  if role = 'data_entry' then
    return jsonb_build_object('expensesPaise', snapshot -> 'expensesPaise');
  end if;
  if role = 'collab_partner' then
    return snapshot - 'prLines' - 'ticketingLines' - 'vedanshuPaise' - 'rishabPaise';
  end if;
  if role = 'pr' then
    return jsonb_build_object(
      'prLines',
      coalesce((
        select jsonb_agg(line)
        from jsonb_array_elements(snapshot -> 'prLines') line
        where (line ->> 'id')::uuid = auth.uid()
      ), '[]'::jsonb)
    );
  end if;
  if role = 'ticketing_partner' then
    return jsonb_build_object(
      'ticketingLines',
      coalesce((
        select jsonb_agg(line)
        from jsonb_array_elements(snapshot -> 'ticketingLines') line
        where (line ->> 'id')::uuid = auth.uid()
      ), '[]'::jsonb)
    );
  end if;
  if role <> 'admin' then
    raise exception 'forbidden';
  end if;
  return snapshot;
end;
$$;

create or replace function public.rvt_settle_event(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  snapshot jsonb;
  partner uuid;
begin
  if private.is_admin() is not true then
    raise exception 'forbidden';
  end if;
  snapshot := private.compute_settlement(p_event_id);
  perform set_config('app.trusted', 'on', true);
  update public.events
  set status = 'settled', settled_at = now()
  where id = p_event_id and status <> 'settled' and deleted_at is null
  returning collab_partner_id into partner;
  if partner is not null then
    update public.profiles set status = 'disabled' where id = partner and is_owner = false;
  end if;
  insert into public.settlements (event_id, snapshot, created_by)
  values (p_event_id, snapshot, auth.uid());
  return snapshot;
end;
$$;

create or replace function public.rvt_admin_set_profile(
  p_user_id uuid,
  p_role text,
  p_status text,
  p_full_name text,
  p_commission_bps integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_admin() is not true then
    raise exception 'forbidden';
  end if;
  if p_role is not null and p_role not in ('admin', 'pr', 'data_entry', 'door', 'ticketing_partner', 'collab_partner') then
    raise exception 'bad role';
  end if;
  if exists (
    select 1 from public.profiles
    where id = p_user_id and is_owner = true and p_role is not null and p_role <> 'admin'
  ) then
    raise exception 'forbidden';
  end if;
  if p_status is not null and p_status not in ('active', 'pending', 'disabled') then
    raise exception 'bad status';
  end if;
  perform set_config('app.trusted', 'on', true);
  update public.profiles
  set role = coalesce(p_role, role),
      status = coalesce(p_status, status),
      full_name = coalesce(nullif(p_full_name, ''), full_name),
      commission_bps = coalesce(p_commission_bps, commission_bps)
  where id = p_user_id and deleted_at is null;
end;
$$;

create or replace function public.rvt_service_complete_signup(
  p_user_id uuid,
  p_full_name text,
  p_email text,
  p_role text,
  p_instagram text,
  p_college text,
  p_area text,
  p_referrer text,
  p_photo_path text,
  p_phone_ciphertext text,
  p_phone_hmac text,
  p_phone_last4 text,
  p_upi_ciphertext text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  claim text := current_setting('request.jwt.claim.role', true);
begin
  if coalesce(claim, '') <> 'service_role' and session_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'forbidden';
  end if;
  if p_role not in ('pr', 'ticketing_partner', 'collab_partner') then
    raise exception 'bad role';
  end if;
  perform set_config('app.trusted', 'on', true);
  insert into public.profiles (id, full_name, role, status)
  values (
    p_user_id,
    left(p_full_name, 120),
    p_role,
    case when p_role = 'pr' then 'active' else 'pending' end
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      role = excluded.role,
      status = excluded.status
  where public.profiles.role is null;
  insert into public.profile_private (profile_id, email, instagram_handle, college_or_workplace, area, referrer, photo_path)
  values (p_user_id, lower(p_email), coalesce(p_instagram, ''), coalesce(p_college, ''), coalesce(p_area, ''), coalesce(p_referrer, ''), p_photo_path)
  on conflict (profile_id) do update
  set email = excluded.email,
      instagram_handle = excluded.instagram_handle,
      college_or_workplace = excluded.college_or_workplace,
      area = excluded.area,
      referrer = excluded.referrer,
      photo_path = excluded.photo_path;
  insert into public.profile_secrets (profile_id, phone_ciphertext, phone_hmac, phone_last4, upi_ciphertext)
  values (p_user_id, p_phone_ciphertext, p_phone_hmac, p_phone_last4, p_upi_ciphertext)
  on conflict (profile_id) do update
  set phone_ciphertext = excluded.phone_ciphertext,
      phone_hmac = excluded.phone_hmac,
      phone_last4 = excluded.phone_last4,
      upi_ciphertext = excluded.upi_ciphertext;
end;
$$;

create or replace function public.rvt_rate_hit(p_bucket text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  claim text := current_setting('request.jwt.claim.role', true);
  current_hits integer;
begin
  if coalesce(claim, '') <> 'service_role' and session_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'forbidden';
  end if;
  insert into public.rate_limits (bucket, window_start, hits)
  values (p_bucket, now(), 1)
  on conflict (bucket) do update
  set hits = case
        when public.rate_limits.window_start < now() - make_interval(secs => p_window_seconds) then 1
        else public.rate_limits.hits + 1
      end,
      window_start = case
        when public.rate_limits.window_start < now() - make_interval(secs => p_window_seconds) then now()
        else public.rate_limits.window_start
      end
  returning hits into current_hits;
  return current_hits <= p_limit;
end;
$$;

alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.profile_secrets enable row level security;
alter table public.events enable row level security;
alter table public.ticket_types enable row level security;
alter table public.event_staff enable row level security;
alter table public.sales enable row level security;
alter table public.sale_secrets enable row level security;
alter table public.expenses enable row level security;
alter table public.settlements enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.audit_log enable row level security;
alter table public.rate_limits enable row level security;

alter table public.profiles force row level security;
alter table public.profile_private force row level security;
alter table public.profile_secrets force row level security;
alter table public.events force row level security;
alter table public.ticket_types force row level security;
alter table public.event_staff force row level security;
alter table public.sales force row level security;
alter table public.sale_secrets force row level security;
alter table public.expenses force row level security;
alter table public.settlements force row level security;
alter table public.notifications force row level security;
alter table public.push_subscriptions force row level security;
alter table public.chat_messages force row level security;
alter table public.audit_log force row level security;
alter table public.rate_limits force row level security;

create policy profiles_select on public.profiles
for select to authenticated
using (
  deleted_at is null
  and (
    id = (select auth.uid())
    or (select private.is_admin())
    or (
      (select private.actor_role()) = 'pr'
      and role = 'pr'
      and status = 'active'
    )
    or (
      (select private.actor_role()) = 'data_entry'
      and role in ('pr', 'ticketing_partner', 'collab_partner')
    )
    or (
      (select private.actor_role()) = 'ticketing_partner'
      and role = 'ticketing_partner'
      and status = 'active'
    )
  )
);

create policy profile_private_select on public.profile_private
for select to authenticated
using (
  profile_id = (select auth.uid())
  or (select private.is_admin())
);

create policy profile_secrets_select on public.profile_secrets
for select to authenticated
using (
  profile_id = (select auth.uid())
  or (select private.is_admin())
);

create policy events_select on public.events
for select to authenticated
using (
  deleted_at is null
  and (
    (select private.actor_role()) in ('admin', 'data_entry')
    or ((select private.actor_role()) = 'door' and status <> 'draft')
    or (
      (select private.actor_role()) in ('pr', 'ticketing_partner')
      and exists (
        select 1 from public.event_staff es
        where es.event_id = events.id and es.profile_id = (select auth.uid())
      )
    )
    or (
      (select private.actor_role()) = 'collab_partner'
      and collab_partner_id = (select auth.uid())
      and status <> 'settled'
    )
  )
);

create policy tickets_select on public.ticket_types
for select to authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = ticket_types.event_id
  )
);

create policy staff_select on public.event_staff
for select to authenticated
using (
  (select private.is_admin())
  or (select private.actor_role()) = 'data_entry'
  or profile_id = (select auth.uid())
);

-- Collab partners never receive RVT-side rows, so PR ids are not in their result.
create policy sales_select on public.sales
for select to authenticated
using (
  deleted_at is null
  and (
    (select private.actor_role()) in ('admin', 'data_entry', 'door')
    or (
      (select private.actor_role()) = 'pr'
      and side = 'rvt'
      and pr_id = (select auth.uid())
    )
    or (
      (select private.actor_role()) = 'ticketing_partner'
      and ticketing_partner_id = (select auth.uid())
    )
    or (
      (select private.actor_role()) = 'collab_partner'
      and side = 'collab'
      and exists (
        select 1 from public.events e
        where e.id = sales.event_id
          and e.collab_partner_id = (select auth.uid())
          and e.status <> 'settled'
          and e.deleted_at is null
      )
    )
  )
);

create policy sale_secrets_select on public.sale_secrets
for select to authenticated
using (
  (select private.is_admin())
  or (select private.actor_role()) = 'data_entry'
  or exists (
    select 1 from public.sales s
    where s.id = sale_secrets.sale_id
      and s.pr_id = (select auth.uid())
      and (select private.actor_role()) = 'pr'
  )
);

create policy expenses_select on public.expenses
for select to authenticated
using (
  deleted_at is null
  and (select private.actor_role()) in ('admin', 'data_entry', 'collab_partner')
  and (
    (select private.actor_role()) <> 'collab_partner'
    or exists (
      select 1 from public.events e
      where e.id = expenses.event_id
        and e.collab_partner_id = (select auth.uid())
        and e.status <> 'settled'
    )
  )
);

create policy settlements_admin on public.settlements
for select to authenticated
using ((select private.is_admin()));

create policy notifications_own on public.notifications
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy push_own on public.push_subscriptions
for select to authenticated
using (user_id = (select auth.uid()));

create policy chat_own on public.chat_messages
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy audit_admin on public.audit_log
for select to authenticated
using ((select private.is_admin()));

revoke all on all tables in schema public from public, anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema private to authenticated, service_role;

grant select on public.profiles, public.profile_private, public.profile_secrets,
  public.events, public.ticket_types, public.event_staff, public.sales, public.sale_secrets,
  public.expenses, public.settlements, public.notifications, public.push_subscriptions,
  public.chat_messages, public.audit_log
to authenticated;

revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;

grant execute on function private.actor_role() to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.trusted() to authenticated;

grant execute on function public.rvt_log_sale(uuid, text, uuid, uuid, text, text, text, text, text, text, text, uuid, text, text, boolean) to authenticated;
grant execute on function public.rvt_review_sale(uuid, text) to authenticated;
grant execute on function public.rvt_review_comp(uuid, text) to authenticated;
grant execute on function public.rvt_check_in(uuid) to authenticated;
grant execute on function public.rvt_event_facts(uuid) to authenticated;
grant execute on function public.rvt_settlement_preview(uuid) to authenticated;
grant execute on function public.rvt_settle_event(uuid) to authenticated;
grant execute on function public.rvt_admin_set_profile(uuid, text, text, text, integer) to authenticated;
grant execute on function public.rvt_service_complete_signup(uuid, text, text, text, text, text, text, text, text, text, text, text, text) to service_role;
grant execute on function public.rvt_rate_hit(text, integer, integer) to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public)
    values ('proofs', 'proofs', false)
    on conflict (id) do nothing;
    insert into storage.buckets (id, name, public)
    values ('avatars', 'avatars', false)
    on conflict (id) do nothing;
  end if;
end $$;
