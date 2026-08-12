-- Support Portal rate-limit ledger.
--
-- One row per POST /support-ticket attempt, written by the support-ticket edge
-- function (service role) BEFORE the ticket is forwarded to Mission Control —
-- so attempts that fail downstream still count against the caller. The
-- function counts rows per hashed client IP over 15-minute and 24-hour
-- windows; the raw IP is never stored, only its SHA-256 hex.

create table if not exists public.support_ticket_requests (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  workspace_id text,
  created_at timestamptz not null default now()
);

-- The throttle query: rows for this ip_hash newer than the window start.
create index if not exists support_ticket_requests_ip_created_idx
  on public.support_ticket_requests (ip_hash, created_at desc);

-- RLS enabled with NO policies → only the service role (the edge function)
-- can read or write; anon/authenticated see nothing.
alter table public.support_ticket_requests enable row level security;
