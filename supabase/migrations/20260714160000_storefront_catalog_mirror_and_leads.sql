-- Aurixa Systems storefront backend, phase 1.
--
-- Catalog MIRROR: Mission Control (fgpvagejkaeqedcwvbte) is the source of
-- truth; these tables are read-only replicas kept fresh by the catalog-sync
-- edge function. Public-readable so the pricing page runs off this DB instead
-- of live cross-calls to Mission Control. Row ids are the Mission Control ids
-- so storefront checkout can still pass item_id straight through to MC.

create table if not exists public.catalog_plans (
  id uuid primary key,
  slug text not null unique,
  name text not null,
  description text,
  price_cents integer not null default 0,
  currency text not null default 'AUD',
  seat_limit integer not null default 0,
  device_limit_per_seat integer,
  overage_policy text,
  is_default boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now()
);

create table if not exists public.catalog_packs (
  id uuid primary key,
  slug text not null unique,
  name text not null,
  tokens integer not null default 0,
  price_cents integer not null default 0,
  currency text not null default 'AUD',
  expires_after_days integer,
  metadata jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now()
);

create table if not exists public.catalog_setups (
  id uuid primary key,
  slug text not null unique,
  name text not null,
  description text,
  price_min_cents integer,
  price_max_cents integer,
  currency text not null default 'AUD',
  deliverables jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now()
);

create table if not exists public.catalog_addons (
  id uuid primary key,
  slug text not null unique,
  name text not null,
  description text,
  price_min_cents integer,
  price_max_cents integer,
  currency text not null default 'AUD',
  billing_period text,
  category text,
  included_in_plans jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now()
);

create table if not exists public.catalog_roles (
  id uuid primary key,
  slug text not null unique,
  name text not null,
  description text,
  price_min_cents integer,
  price_max_cents integer,
  currency text not null default 'AUD',
  permissions jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now()
);

create table if not exists public.catalog_reports (
  id uuid primary key,
  slug text not null unique,
  name text not null,
  category text,
  description text,
  credit_cost integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now()
);

-- One row per catalog sync run (observability + staleness checks).
create table if not exists public.catalog_sync_state (
  id bigint generated always as identity primary key,
  source text not null default 'mission_control',
  status text not null check (status in ('ok','error')),
  counts jsonb not null default '{}'::jsonb,
  error text,
  synced_at timestamptz not null default now()
);

-- Marketing-site contact leads. Written only via the capture-lead edge
-- function (service role) so we can validate / rate-limit there.
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  email text not null,
  company text,
  phone text,
  message text,
  source text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'new'
);
create index if not exists idx_leads_created on public.leads (created_at desc);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.catalog_plans      enable row level security;
alter table public.catalog_packs      enable row level security;
alter table public.catalog_setups     enable row level security;
alter table public.catalog_addons     enable row level security;
alter table public.catalog_roles      enable row level security;
alter table public.catalog_reports    enable row level security;
alter table public.catalog_sync_state enable row level security;
alter table public.leads              enable row level security;

-- Catalog: public read (anon + authenticated). Writes only via service role
-- (the sync function), which bypasses RLS — so no write policies here.
do $$
declare t text;
begin
  foreach t in array array[
    'catalog_plans','catalog_packs','catalog_setups',
    'catalog_addons','catalog_roles','catalog_reports'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      t || '_public_read', t
    );
  end loop;
end $$;

-- catalog_sync_state and leads have RLS enabled with NO policies → only the
-- service role (edge functions) can touch them.
