-- Rave schema, migration 001: tables, helpers, and Row Level Security.
-- Multi-tenant from day one. Every table carries tenant_id and RLS is on,
-- deny by default. Authenticated dashboard users only ever see their own
-- tenant's rows. Public diner actions never touch tables directly; they go
-- through Edge Functions that use the service role.

create extension if not exists pgcrypto;

-- ---------- tenants ----------
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  colors jsonb,
  gmb_url text,
  place_id text,
  ghl_location_id text,
  google_invite_min_combined int not null default 7,
  timezone text not null default 'Africa/Johannesburg',
  currency text not null default 'ZAR',
  created_at timestamptz not null default now()
);

-- ---------- app_users (links auth.users -> tenant + role) ----------
create table public.app_users (
  id uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  role text not null check (role in ('manager', 'staff')),
  name text,
  email text,
  created_at timestamptz not null default now()
);
create index on public.app_users (tenant_id);

-- ---------- staff ----------
create table public.staff (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid references public.app_users (id) on delete set null,
  first_name text not null,
  surname text not null,
  category text not null default 'Waiter',
  webhook_url text,
  qr_slug text not null unique,
  created_at timestamptz not null default now()
);
create index on public.staff (tenant_id);

-- ---------- contacts ----------
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  phone text not null,
  added_by text,
  consent_at timestamptz,
  opted_out boolean not null default false,
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, phone)
);
create index on public.contacts (tenant_id);

-- ---------- reviews ----------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  diner_name text,
  staff_id uuid references public.staff (id) on delete set null,
  staff_stars int check (staff_stars between 1 and 5),
  staff_comment text,
  overall_stars int check (overall_stars between 1 and 5),
  route text check (route in ('good', 'bad')),
  issue_category text,
  assigned_staff_id uuid references public.staff (id) on delete set null,
  status text check (status in ('new', 'fixing', 'fixed')),
  google_status text check (google_status in ('invited', 'clicked', 'posted')),
  created_at timestamptz not null default now()
);
create index on public.reviews (tenant_id);
create index on public.reviews (tenant_id, created_at);

-- ---------- google click events ----------
create table public.google_click_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  clicked_at timestamptz not null default now()
);
create index on public.google_click_events (tenant_id);

-- ---------- google reviews (public display cache) ----------
create table public.google_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  author text,
  stars int,
  text text,
  posted_at timestamptz,
  fetched_at timestamptz not null default now()
);
create index on public.google_reviews (tenant_id);

-- ---------- campaigns ----------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  kind text not null check (kind in (
    'review', 'review_followup1', 'review_followup2',
    'winback1', 'winback2', 'winback3', 'winback4'
  )),
  name text not null,
  template text not null,
  webhook_url text,
  offer_text text,
  expiry_days int,
  status text not null default 'Active' check (status in ('Active', 'Paused')),
  created_at timestamptz not null default now()
);
create index on public.campaigns (tenant_id);

-- ---------- campaign sends (10/min batching queue) ----------
create table public.campaign_sends (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  queued_at timestamptz not null default now(),
  sent_at timestamptz,
  batch_no int
);
create index on public.campaign_sends (tenant_id);

-- ---------- winback state ----------
create table public.winback_state (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  stage int not null check (stage between 1 and 4),
  entered_at timestamptz not null default now(),
  sent_at timestamptz,
  offer_expires_at timestamptz,
  claimed_at timestamptz,
  expired_at timestamptz,
  voided boolean not null default false
);
create index on public.winback_state (tenant_id);

-- ---------- review invites (phone-match tracker, PRD 5) ----------
create table public.review_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  phone text not null,
  staff_id uuid references public.staff (id) on delete set null,
  sent_at timestamptz not null default now(),
  follow_up1_at timestamptz,
  follow_up2_at timestamptz,
  engaged_at timestamptz,
  reviewed_at timestamptz
);
create index on public.review_invites (tenant_id);

-- ---------- RLS helpers ----------
-- The tenant of the currently logged-in user. security definer so it can read
-- app_users regardless of that table's own policies (avoids recursion).
create or replace function public.current_tenant_id()
returns uuid language sql stable security definer set search_path = public as $$
  select tenant_id from public.app_users where id = auth.uid()
$$;

create or replace function public.current_user_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.app_users where id = auth.uid()
$$;

-- ---------- enable RLS everywhere ----------
alter table public.tenants            enable row level security;
alter table public.app_users          enable row level security;
alter table public.staff              enable row level security;
alter table public.contacts           enable row level security;
alter table public.reviews            enable row level security;
alter table public.google_click_events enable row level security;
alter table public.google_reviews     enable row level security;
alter table public.campaigns          enable row level security;
alter table public.campaign_sends     enable row level security;
alter table public.winback_state      enable row level security;
alter table public.review_invites     enable row level security;

-- ---------- policies ----------
-- tenants: read your own; only a manager may update it.
create policy tenants_select on public.tenants
  for select using (id = public.current_tenant_id());
create policy tenants_update on public.tenants
  for update using (id = public.current_tenant_id() and public.current_user_role() = 'manager');

-- app_users: read members of your tenant; manager manages them.
create policy app_users_select on public.app_users
  for select using (tenant_id = public.current_tenant_id());
create policy app_users_manage on public.app_users
  for all using (tenant_id = public.current_tenant_id() and public.current_user_role() = 'manager')
  with check (tenant_id = public.current_tenant_id() and public.current_user_role() = 'manager');

-- Per-tenant tables: any authenticated member of the tenant may read and write
-- their tenant's rows. Staff-specific narrowing is layered in a later migration
-- once staff logins are exercised; tenant isolation is the security boundary.
do $$
declare t text;
begin
  foreach t in array array[
    'staff','contacts','reviews','google_click_events','google_reviews',
    'campaigns','campaign_sends','winback_state','review_invites'
  ] loop
    execute format(
      'create policy %1$s_rw on public.%1$s for all
         using (tenant_id = public.current_tenant_id())
         with check (tenant_id = public.current_tenant_id())', t);
  end loop;
end $$;
