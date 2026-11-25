alter table public.events add column if not exists collab_shares jsonb not null default '[]'::jsonb;
alter table public.events add column if not exists kind text not null default 'club_night';
alter table public.events add column if not exists capacity integer;
alter table public.events add column if not exists min_age integer not null default 18;
alter table public.events add column if not exists alcohol boolean not null default true;
alter table public.events add column if not exists guardian_required boolean not null default false;
alter table public.events add column if not exists waitlist_count integer not null default 0;
alter table public.events add column if not exists postponed_to date;

alter table public.sales add column if not exists payment_method text not null default 'upi';
alter table public.sales add column if not exists check_in_code text;
alter table public.sales add column if not exists collab_partner_id uuid references public.profiles (id);

alter table public.sales drop constraint if exists sales_status_check;
alter table public.sales add constraint sales_status_check check (status in ('pending', 'verified', 'rejected', 'refunded'));

create index if not exists sales_code_idx on public.sales (check_in_code) where check_in_code is not null;
