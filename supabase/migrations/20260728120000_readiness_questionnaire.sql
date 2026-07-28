-- Stage 2 — Business Readiness Questionnaire storage.
--
-- Implements the data objects in section 13.2 of the Aurixa Systems Priority
-- Access, Qualification & Onboarding Operating Model (v1.0) that the readiness
-- questionnaire needs, and the technical controls in section 13.3:
--
--   * Non-sequential public references only. The public application reference is
--     the AX-XXXXXXXXXX id already generated at Stage 1; every internal row uses
--     a UUID. No sequential id is ever exposed.
--   * Signed, time-bound questionnaire tokens with revocation and reissue. Only
--     the SHA-256 hash of a token is stored, so a database read cannot be
--     replayed as a questionnaire link.
--   * Versioned responses: qualification_responses carries the questionnaire
--     version, the response version and the active/inactive state that
--     conditional logic requires.
--   * Append-only events for material milestones.
--
-- RLS is enabled with NO policies on every table: anon and authenticated roles
-- have no access at all. The readiness-questionnaire edge function is the only
-- reader and writer, using the service role, and it never returns a score, tier
-- or qualification outcome to the browser.

-- ── Stage 1 snapshot used to prefill the questionnaire ──────────────────────

create table if not exists public.readiness_applications (
  application_id text primary key,
  first_name text not null default '',
  last_name text not null default '',
  work_email text not null,
  organisation_name text not null default '',
  role text not null default '',
  organisation_type text not null default '',
  annual_volume text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.readiness_applications is
  'Verified Stage 1 details used to prefill the readiness questionnaire. Written by the intake pipeline, never by the browser.';

-- ── Secure questionnaire links ──────────────────────────────────────────────

create table if not exists public.readiness_questionnaire_tokens (
  id uuid primary key default gen_random_uuid(),
  application_id text not null references public.readiness_applications (application_id) on delete cascade,
  -- SHA-256 hex of the opaque token. The token itself is never stored.
  token_hash text not null unique,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  use_count integer not null default 0
);

create index if not exists readiness_tokens_application_idx
  on public.readiness_questionnaire_tokens (application_id);

comment on column public.readiness_questionnaire_tokens.token_hash is
  'SHA-256 of the issued token. Reissue creates a new row; the previous row is revoked.';

-- ── Short-lived authorised sessions ─────────────────────────────────────────

create table if not exists public.readiness_sessions (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references public.readiness_questionnaire_tokens (id) on delete cascade,
  application_id text not null references public.readiness_applications (application_id) on delete cascade,
  -- SHA-256 hex of the session token handed to the browser.
  session_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists readiness_sessions_application_idx
  on public.readiness_sessions (application_id);

-- ── Response document ───────────────────────────────────────────────────────

create table if not exists public.readiness_responses (
  application_id text primary key references public.readiness_applications (application_id) on delete cascade,
  questionnaire_version text not null,
  response_version integer not null default 1,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed')),
  started_at timestamptz,
  last_saved_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on column public.readiness_responses.response_version is
  'Incremented on every accepted save. A save carrying a stale version is rejected rather than overwriting a newer draft.';

-- ── Individual answers (section 13.2 qualification_responses) ───────────────

create table if not exists public.qualification_responses (
  id uuid primary key default gen_random_uuid(),
  application_id text not null references public.readiness_applications (application_id) on delete cascade,
  -- Stable BRQ- identifier. Labels may be reworded; identifiers must not change.
  question_id text not null,
  answer jsonb,
  -- False when conditional logic means the question was not displayed. Inactive
  -- answers are retained but are never treated as live responses.
  active boolean not null default true,
  response_version integer not null default 1,
  questionnaire_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, question_id)
);

create index if not exists qualification_responses_application_idx
  on public.qualification_responses (application_id);

-- ── Append-only milestone events (section 13.4) ─────────────────────────────

create table if not exists public.readiness_events (
  id uuid primary key default gen_random_uuid(),
  application_id text not null,
  name text not null,
  -- Reference values only. Free-text answers are never written here.
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists readiness_events_application_idx
  on public.readiness_events (application_id, created_at);

-- ── Access control ──────────────────────────────────────────────────────────
-- Enabled with no policies: only the service role (the edge function) can read
-- or write. There is deliberately no anon or authenticated access path.

alter table public.readiness_applications enable row level security;
alter table public.readiness_questionnaire_tokens enable row level security;
alter table public.readiness_sessions enable row level security;
alter table public.readiness_responses enable row level security;
alter table public.qualification_responses enable row level security;
alter table public.readiness_events enable row level security;
