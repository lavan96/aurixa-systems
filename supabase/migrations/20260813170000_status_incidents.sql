-- Incident windows for the /status page's jumbotron and day drilldown.
--
-- Two sources feed one table:
--   * 'vendor_feed' — the provider's own published incidents, with their
--     real start/resolve timestamps and impact, upserted by the daily
--     backfill (vendor_ref = the feed's incident id, kept server-side only).
--   * 'observed'    — runs of consecutive non-operational polls detected by
--     our own 5-minute checks, opened and closed by the refresh action
--     (vendor_ref = 'obs:<run start ISO>' so the same unique key works).
--
-- Nothing in here reaches a browser verbatim: the public response carries
-- component keys, normalized statuses, timestamps and a source tag — never
-- vendor incident ids or incident prose.

create table if not exists public.status_incidents (
  id uuid primary key default gen_random_uuid(),
  component_key text not null references public.status_providers(component_key) on delete cascade,
  source text not null check (source in ('vendor_feed','observed')),
  -- Vendor incident id, or 'obs:<ISO>' for observed runs. Internal only.
  vendor_ref text not null,
  worst_status text not null check (worst_status in ('maintenance','degraded','partial_outage','major_outage')),
  started_at timestamptz not null,
  ended_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (component_key, vendor_ref)
);

create index if not exists status_incidents_window_idx
  on public.status_incidents (component_key, started_at desc);

comment on table public.status_incidents is
  'Incident windows from vendors'' published feeds and our own observed poll runs. Service-role only; the public response strips vendor refs.';

alter table public.status_incidents enable row level security;
-- No policies: only the status-summary edge function (service role) reads this.

-- Per-day check counts for observed days, so the summary can report uptime
-- without rescanning every snapshot on every read. Written by the refresh
-- action alongside the day's worst-confirmed status.
alter table public.status_history_days
  add column if not exists checks_total int not null default 0,
  add column if not exists checks_healthy int not null default 0;

comment on column public.status_history_days.checks_total is
  'Observed days: readable checks that day (unknown polls excluded). 0 for vendor_feed rows.';
comment on column public.status_history_days.checks_healthy is
  'Observed days: checks reporting operational or maintenance. 0 for vendor_feed rows.';
