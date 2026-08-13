-- Richer incident detail for the /status drilldown.
--
-- The providers' published feeds carry far more than start/end: a lifecycle
-- (investigating → identified → monitoring → resolved) with a timestamp per
-- stage, a count of operator updates, the sub-components affected, and a
-- separate feed of SCHEDULED maintenance windows. All of it is worth showing
-- and none of it may name a vendor, so:
--
--   * `lifecycle` stores STAGES AND TIMESTAMPS ONLY. Update bodies are prose
--     written by the vendor about the vendor and are never stored.
--   * `areas` stores slugs from a CLOSED vocabulary owned by the edge
--     function (auth, database, storage, edge_locations, …). A vendor
--     sub-component name that does not map to one is DROPPED, never passed
--     through — "R2" and "Codespaces" identify their vendor instantly.
--   * `kind` separates unplanned incidents from scheduled maintenance, which
--     the page reports differently (planned work is not an outage).

alter table public.status_incidents
  add column if not exists kind text not null default 'incident'
    check (kind in ('incident','maintenance')),
  add column if not exists areas text[] not null default '{}',
  add column if not exists lifecycle jsonb not null default '[]'::jsonb,
  add column if not exists update_count int not null default 0,
  add column if not exists identified_at timestamptz,
  add column if not exists monitoring_at timestamptz,
  add column if not exists scheduled_until timestamptz;

comment on column public.status_incidents.areas is
  'Capability slugs from the edge function''s closed vocabulary. Vendor sub-component names that do not map are dropped - they identify the vendor.';
comment on column public.status_incidents.lifecycle is
  'Array of {stage, at}: the provider''s own status lifecycle. Stages and timestamps only - never update prose.';

create index if not exists status_incidents_kind_idx
  on public.status_incidents (kind, started_at desc);
