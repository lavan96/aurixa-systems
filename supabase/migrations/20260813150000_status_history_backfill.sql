-- Historical daily statuses for the /status page, reconstructed from each
-- vendor's PUBLISHED incident history (the same official status feeds the
-- 5-minute poller reads expose /api/v2/incidents.json).
--
-- Rules that keep this honest:
--   * A backfilled day is derived from what the vendor themselves published:
--     days inside an incident window take the incident's impact, days with
--     no published incident are operational.
--   * The feed only returns the most recent ~50 incidents, so days BEFORE
--     the oldest returned incident are unknowable and are NOT written -
--     absence of data is shown as absence, never guessed as "operational".
--   * Observed data always wins: the summary builder prefers our own
--     snapshot rollup for any day we actually polled, and the backfill
--     never writes today.
--   * Vendors without a machine-readable history API (payments) simply
--     start at our monitoring start.

create table if not exists public.status_history_days (
  component_key text not null references public.status_providers(component_key) on delete cascade,
  day date not null,
  status text not null check (status in ('operational','maintenance','degraded','partial_outage','major_outage','unknown')),
  -- 'vendor_feed' = reconstructed from the vendor's published incidents.
  source text not null default 'vendor_feed',
  updated_at timestamptz not null default now(),
  primary key (component_key, day)
);

comment on table public.status_history_days is
  'Per-day statuses reconstructed from vendors'' published incident feeds. Service-role only; the public response merges these with observed snapshots (observed wins).';

alter table public.status_history_days enable row level security;
-- No policies: only the status-summary edge function (service role) reads this.

-- ── Daily re-sync cron ───────────────────────────────────────────────────
-- Once a day, re-derive the trailing window from each vendor's published
-- incidents (POST {action:"backfill"}, admin-gated by the vault
-- support_ingest_key). Incident timelines get edited after the fact, and a
-- daily sync also heals any gap left if our own poller was ever down.
do $$
declare
  v_key text;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise warning 'pg_cron not installed - status history backfill NOT scheduled.';
    return;
  end if;

  select decrypted_secret into v_key
  from vault.decrypted_secrets where name = 'support_ingest_key' limit 1;

  if v_key is null then
    raise warning 'Vault entry support_ingest_key not found - status history backfill NOT scheduled. Drive it manually with POST {action:backfill} until this is set.';
    return;
  end if;

  perform cron.unschedule('status-backfill-daily')
    where exists (select 1 from cron.job where jobname = 'status-backfill-daily');

  perform cron.schedule(
    'status-backfill-daily', '47 3 * * *',
    $job$
    select net.http_post(
      url := 'https://moeyytuduycrvvncdtme.supabase.co/functions/v1/status-summary',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-support-admin-key', (select decrypted_secret from vault.decrypted_secrets where name = 'support_ingest_key' limit 1)
      ),
      body := '{"action":"backfill"}'::jsonb,
      timeout_milliseconds := 60000
    );
    $job$
  );
exception when others then
  raise warning 'status history backfill NOT scheduled (%).', sqlerrm;
end $$;
