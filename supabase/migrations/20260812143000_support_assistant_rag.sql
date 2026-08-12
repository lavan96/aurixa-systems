-- Support Assistant — RAG storage for the Support Portal screening gateway.
--
-- The /support page now fronts a chat assistant that answers how-do-I
-- questions from the NPC dashboard User Guide before a ticket is raised.
-- This file installs its retrieval layer:
--
--   * support_kb_chunks — the User Guide, one row per guide item, with a
--     384-dim gte-small embedding (computed by the edge function's built-in
--     model on reindex — no external API) and a generated tsvector, so
--     retrieval is hybrid: vector similarity + full-text, merged by RRF.
--   * support_kb_search() — the one retrieval entry point. SECURITY DEFINER,
--     execute granted to service_role only; PostgREST cannot ORDER BY a
--     vector distance, which is why this is an RPC and not a table read.
--   * support_assistant_requests — sliding-window rate-limit ledger.
--   * support_assistant_logs — per-question telemetry (mode, latency,
--     retrieved ids, feedback) that the eval harness and tuning read.
--   * support_assistant_eval_runs — the harness's scorecards over time.
--
-- Chunk CONTENT is seeded from npc-property-dashbord's generated
-- support-kb/user-guide-kb.json (see docs/support-assistant/ARCHITECTURE.md
-- for the refresh flow); embeddings are NULL until the function's reindex
-- action fills them, and retrieval degrades gracefully to full-text alone
-- while they are.

create extension if not exists vector;

-- ── The knowledge base ───────────────────────────────────────────────────

create table if not exists public.support_kb_chunks (
  -- Stable "<section-id>/<item-slug>" identifier from the extractor; the
  -- model cites these ids and the server maps them back to links.
  id text primary key,
  doc text not null default 'user-guide',
  section_id text not null,
  section_title text not null,
  -- DOM anchor on the dashboard's /user-guide page (section-<id> or a
  -- standalone card id); the link the chat renders is <base>/user-guide#<anchor>.
  anchor text not null,
  title text not null,
  content text not null,
  keywords text[] not null default '{}',
  position int not null default 0,
  -- SHA-256 of content at seed time; reindex skips rows whose embedded_hash
  -- already matches, so re-seeding only re-embeds what actually changed.
  content_hash text,
  embedded_hash text,
  embedding vector(384),
  fts tsvector generated always as (
    to_tsvector('english',
      coalesce(section_title, '') || ' ' || coalesce(title, '') || ' ' || coalesce(content, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_kb_chunks_fts_idx
  on public.support_kb_chunks using gin (fts);

-- HNSW over cosine distance; ~a hundred rows today, but the index keeps
-- query latency flat as the guide grows.
create index if not exists support_kb_chunks_embedding_idx
  on public.support_kb_chunks using hnsw (embedding vector_cosine_ops);

alter table public.support_kb_chunks enable row level security;
-- No policies: the edge function (service role) is the only reader/writer.

-- ── Hybrid retrieval ─────────────────────────────────────────────────────

-- Reciprocal-rank fusion of the vector and full-text rankings (k = 60).
-- q_embedding may be NULL (before the first reindex, or if the runtime
-- model is unavailable): the vector arm simply contributes nothing.
create or replace function public.support_kb_search(
  q_text text,
  q_embedding vector(384) default null,
  match_count int default 6
)
returns table (
  id text,
  section_id text,
  section_title text,
  anchor text,
  title text,
  content text,
  score double precision
)
language sql
security definer
set search_path = public
as $$
  with vec as (
    select c.id, row_number() over (order by c.embedding <=> q_embedding) as rnk
    from public.support_kb_chunks c
    where q_embedding is not null and c.embedding is not null
    order by c.embedding <=> q_embedding
    limit 20
  ),
  txt as (
    select c.id, row_number() over (order by ts_rank_cd(c.fts, q) desc) as rnk
    from public.support_kb_chunks c,
         websearch_to_tsquery('english', q_text) q
    where c.fts @@ q
    limit 20
  ),
  merged as (
    select coalesce(v.id, t.id) as id,
           coalesce(1.0 / (60 + v.rnk), 0) + coalesce(1.0 / (60 + t.rnk), 0) as score
    from vec v
    full outer join txt t on t.id = v.id
  )
  select c.id, c.section_id, c.section_title, c.anchor, c.title, c.content, m.score
  from merged m
  join public.support_kb_chunks c on c.id = m.id
  order by m.score desc
  limit match_count;
$$;

revoke all on function public.support_kb_search(text, vector, int) from public;
revoke all on function public.support_kb_search(text, vector, int) from anon;
revoke all on function public.support_kb_search(text, vector, int) from authenticated;
grant execute on function public.support_kb_search(text, vector, int) to service_role;

-- ── Generation model key (optional) ──────────────────────────────────────

-- The assistant runs retrieval-only until operations stores a generation
-- key in Vault:  select vault.create_secret('<provider>:<key>', 'support_assistant_llm_key');
-- where <provider> is gemini | openai | anthropic. The value is NEVER in a
-- migration; this reader is service-role-only, same pattern as
-- support_ingest_key(). The edge function re-checks every few minutes, so
-- adding the key needs no redeploy.
create or replace function public.support_assistant_llm_key()
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'support_assistant_llm_key'
  order by created_at desc
  limit 1
$$;

revoke all on function public.support_assistant_llm_key() from public;
revoke all on function public.support_assistant_llm_key() from anon;
revoke all on function public.support_assistant_llm_key() from authenticated;
grant execute on function public.support_assistant_llm_key() to service_role;

-- ── Rate limiting ────────────────────────────────────────────────────────

create table if not exists public.support_assistant_requests (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists support_assistant_requests_ip_idx
  on public.support_assistant_requests (ip_hash, created_at desc);

alter table public.support_assistant_requests enable row level security;

-- ── Telemetry the harness reads ──────────────────────────────────────────

create table if not exists public.support_assistant_logs (
  id uuid primary key default gen_random_uuid(),
  -- 'ask' rows carry question/mode/latency; 'feedback' rows carry helped.
  kind text not null default 'ask' check (kind in ('ask', 'feedback')),
  question text,
  mode text,
  retrieved jsonb not null default '[]'::jsonb,
  escalated boolean not null default false,
  helped boolean,
  model text,
  embed_ms int,
  retrieve_ms int,
  generate_ms int,
  total_ms int,
  created_at timestamptz not null default now()
);

create index if not exists support_assistant_logs_created_idx
  on public.support_assistant_logs (created_at desc);

alter table public.support_assistant_logs enable row level security;

create table if not exists public.support_assistant_eval_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  cases int not null,
  hit_at_1 numeric(5,4) not null,
  hit_at_3 numeric(5,4) not null,
  hit_at_6 numeric(5,4) not null,
  mrr numeric(5,4) not null,
  avg_retrieve_ms int,
  embeddings_active boolean not null default false,
  failures jsonb not null default '[]'::jsonb,
  notes text
);

alter table public.support_assistant_eval_runs enable row level security;

-- ── Retention ────────────────────────────────────────────────────────────

-- Questions are support content, not analytics: 30 days is enough to tune
-- retrieval and copy; the rate-limit ledger only needs its own window.
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise warning 'pg_cron not installed - support assistant retention purge NOT scheduled.';
    return;
  end if;

  perform cron.unschedule('support-assistant-purge')
    where exists (select 1 from cron.job where jobname = 'support-assistant-purge');

  perform cron.schedule(
    'support-assistant-purge', '45 3 * * *',
    $purge$
    delete from public.support_assistant_logs where created_at < now() - interval '30 days';
    delete from public.support_assistant_requests where created_at < now() - interval '7 days';
    $purge$
  );
exception when others then
  raise warning 'support assistant retention purge NOT scheduled (%).', sqlerrm;
end $$;
