-- Upstream status page storage.
--
-- The /status page reports the health of the services Aurixa depends on
-- WITHOUT naming them: browsers only ever see generic role labels
-- ("Backend Platform Provider"). The vendor registry below — which role
-- maps to which real status endpoint — is therefore service-role only
-- (RLS enabled, no policies): the status-summary edge function reads it,
-- polls each endpoint server-side, and caches normalized results in
-- status_snapshots. The page reads the cache, never the vendors.
--
-- component_key values here must match STATUS_COMPONENT_ROSTER in
-- src/lib/statusPage.ts, which owns all public-facing copy.

create table if not exists public.status_providers (
  component_key text primary key,
  -- statuspage_v2 | stripe_current | instatus_summary — parsers live in the
  -- status-summary edge function. A vendor changing status platforms is a
  -- row update here, not a deploy.
  adapter text not null,
  endpoint text not null,
  enabled boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.status_providers is
  'Vendor status endpoints per anonymized component role. Service-role only: the anonymity of /status depends on this table never being browser-readable.';

alter table public.status_providers enable row level security;
-- No policies: only the edge function (service role) reads this.

create table if not exists public.status_snapshots (
  id uuid primary key default gen_random_uuid(),
  component_key text not null references public.status_providers(component_key) on delete cascade,
  -- Vocabulary from src/lib/statusPage.ts; 'unknown' means the vendor's
  -- status API was unreachable or unparseable, never that they are down.
  status text not null check (status in ('operational','maintenance','degraded','partial_outage','major_outage','unknown')),
  -- Raw vendor payload excerpt for operator debugging. NEVER serialized to
  -- the public response — it names the vendor.
  raw jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now()
);

create index if not exists status_snapshots_component_idx
  on public.status_snapshots (component_key, checked_at desc);

alter table public.status_snapshots enable row level security;
-- No policies: reads go through the edge function, which strips everything
-- vendor-identifying before responding.

-- ── Seed the registry ────────────────────────────────────────────────────
-- Endpoints are the vendors' PUBLIC status APIs (no credentials). This file
-- lives in a private repo; the anonymity requirement applies to what the
-- browser can see, and nothing below is ever served to one.

-- email_delivery is seeded DISABLED: the vendor exposes no machine-readable
-- public status API today (status.resend.com renders HTML only; the Instatus
-- summary.json convention and the Better Stack index.json convention both
-- return 500s). Rather than show a permanent "unknown", the component stays
-- off the page until an endpoint exists — enable it here (or with a row
-- update) once one does.
insert into public.status_providers (component_key, adapter, endpoint, enabled, sort_order) values
  ('backend',           'statuspage_v2',    'https://status.supabase.com/api/v2/status.json',      true,  10),
  ('security_delivery', 'statuspage_v2',    'https://www.cloudflarestatus.com/api/v2/status.json', true,  20),
  ('web_hosting',       'statuspage_v2',    'https://www.vercel-status.com/api/v2/status.json',    true,  30),
  ('dev_platform',      'statuspage_v2',    'https://www.githubstatus.com/api/v2/status.json',     true,  40),
  ('ai_models',         'statuspage_v2',    'https://status.openai.com/api/v2/status.json',        true,  50),
  ('payments',          'stripe_current',   'https://status.stripe.com/current',                   true,  60),
  ('email_delivery',    'instatus_summary', 'https://status.resend.com/summary.json',              false, 70)
on conflict (component_key) do nothing;

-- ── Refresh cron ─────────────────────────────────────────────────────────
-- Every 5 minutes the edge function re-polls all enabled vendors (POST
-- {action:"refresh"}, admin-gated by the vault support_ingest_key — the
-- same key the support pipeline already manages). The GET path only ever
-- serves the cache, so vendor calls never sit on a page load, and the
-- refresh handler prunes snapshots older than 45 days.
do $$
declare
  v_key text;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise warning 'pg_cron not installed - status refresh NOT scheduled.';
    return;
  end if;

  select decrypted_secret into v_key
  from vault.decrypted_secrets where name = 'support_ingest_key' limit 1;

  if v_key is null then
    raise warning 'Vault entry support_ingest_key not found - status refresh NOT scheduled. Drive it manually with POST {action:refresh} until this is set.';
    return;
  end if;

  perform cron.unschedule('status-refresh-5min')
    where exists (select 1 from cron.job where jobname = 'status-refresh-5min');

  perform cron.schedule(
    'status-refresh-5min', '*/5 * * * *',
    $job$
    select net.http_post(
      url := 'https://moeyytuduycrvvncdtme.supabase.co/functions/v1/status-summary',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-support-admin-key', (select decrypted_secret from vault.decrypted_secrets where name = 'support_ingest_key' limit 1)
      ),
      body := '{"action":"refresh"}'::jsonb,
      timeout_milliseconds := 60000
    );
    $job$
  );
exception when others then
  raise warning 'status refresh NOT scheduled (%).', sqlerrm;
end $$;
