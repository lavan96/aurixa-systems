# Support Assistant — the /support screening gateway

Why a "can't change my email" question should never become a P3 bug ticket:
the Support Portal now opens with a chat assistant that answers how-do-I
questions straight from the NPC dashboard's User Guide, with deep links into
the exact guide section. Only what the assistant can't (or must not) handle
reaches the ticket form — pre-filled with the conversation.

## The pieces

```
npc-property-dashbord
  src/lib/userGuideContent.ts     ← the guide's content, as data
  npm run support:kb              ← extractor → support-kb/user-guide-kb.json
        │  (chunks: id "section/item", anchor, title, content)
        ▼
aurixa-systems Supabase (moeyytuduycrvvncdtme)
  support_kb_chunks               ← seeded from that JSON; gte-small
                                    embeddings filled by `reindex`
  support_kb_search()             ← hybrid retrieval: pgvector cosine +
                                    Postgres FTS, RRF-merged (k=60)
  support-assistant edge fn       ← ask / feedback / reindex / eval
        ▲
  /support page                   ← chat panel (screen step) → ticket form
                                    (form step) with conversation prefill
```

Deep links are `<base>/user-guide#<anchor>`; `<base>` is the `dashboard_url`
the dashboard's Support tab passes (validated: https, origin only), falling
back to `https://npcservices.com.au`. UserGuide.tsx handles the `#section-*`
hash by scrolling to and opening the right accordion section.

## Why answers stay on-rails

Constraint is layered; the prompt is the *last* line of defence, not the
first:

1. **Deterministic incident gate.** Outage / repeated-error / security /
   data-loss / billing-dispute language is matched by regex BEFORE any
   retrieval or model call → the reply is "raise a ticket", `escalate: true`,
   and the UI reveals the pre-filled form. Incidents must never receive
   documentation instead of a ticket, so this path has no model in it.
2. **Retrieval floor.** If hybrid search returns nothing above the RRF floor
   (`NO_MATCH_FLOOR = 0.014` ≈ not even rank-4 in a single arm), the reply is
   a fixed "I can only help with the dashboard" — off-topic questions never
   reach the model with an empty context to improvise around.
3. **The model sees only guide excerpts** and returns chunk **ids**, never
   URLs — every link the user sees is built server-side from our own KB rows,
   so neither the user's message nor a hallucination can mint a link.
4. **Schema-checked JSON out; extractive fallback.** A malformed model reply
   degrades to the retrieval-mode answer (top passage + links). The assistant
   degrades; it does not improvise.

Retrieval-only mode is the *default deployment*: with no LLM key configured
the assistant answers extractively and is already a working deflection
gateway. Model mode switches on when operations stores a key —
`select vault.create_secret('gemini:<key>', 'support_assistant_llm_key');`
(also accepts `openai:` / `anthropic:`; env `SUPPORT_ASSISTANT_LLM_KEY`,
`GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` work too). The
function re-reads the key every 5 minutes — no redeploy.

## Latency budget

- gte-small query embedding runs **inside the edge runtime** (`Supabase.ai`),
  no external hop: ~10–40 ms.
- One RPC does the whole hybrid rank in SQL (HNSW + GIN indexes).
- Retrieval mode answers in a single round trip (~100–300 ms typical);
  model mode adds one provider call (temperature 0.2, 500-token cap, 12 s
  abort → extractive fallback).
- Per-stage timings (`embed_ms`, `retrieve_ms`, `generate_ms`, `total_ms`)
  land in `support_assistant_logs` for every question.

## The performance harness

`supabase/functions/_shared/support-golden.json` is the ground truth:
~35 retrieval cases (question → acceptable guide sections, including
"I can't change my email or username" → settings), 5 incident phrasings that
MUST trip the escalation gate, 3 off-topic probes that MUST fall under the
retrieval floor.

`POST {action:"eval"}` (header `x-support-admin-key` = the vault
`support_ingest_key`) runs every case against **live** retrieval and writes a
scorecard to `support_assistant_eval_runs`: hit@1/3/6, MRR, average retrieval
latency, per-case failures, escalation misses, off-topic leaks. Run it after
every KB reseed, ranking change, or floor adjustment and compare rows —
that table is the regression history. `support_assistant_logs` (30-day
retention, pg_cron purge) shows what real users ask and which answers they
marked unhelpful; feed recurring misses back into the golden set.

## Refreshing the knowledge base

1. In npc-property-dashbord: edit the guide content
   (src/lib/userGuideContent.ts), run `npm run support:kb`, commit both.
2. Copy `support-kb/user-guide-kb.json` over `supabase/kb/user-guide-kb.json`
   here and re-seed `support_kb_chunks` (upsert on id; delete ids that
   disappeared).
3. `POST {action:"reindex"}` with the admin header — only chunks whose
   `content_hash` changed are re-embedded.
4. `POST {action:"eval"}` and compare the scorecard to the previous run.

## Things that will bite

- **The extractor is the only content path.** Editing chunk text in the
  database directly means the next reseed silently reverts it.
- **`support_kb_search` is an RPC on purpose** — PostgREST cannot ORDER BY a
  vector distance, and the function is the only thing granted execute.
- **Embeddings are optional at every point**: before the first reindex (or if
  `Supabase.ai` is unavailable) the vector arm contributes nothing and FTS
  carries retrieval alone. Check `embeddings_active` on an eval run before
  reading too much into its scores.
- **The eval's off-topic check can false-alarm** if a probe happens to share
  vocabulary with the guide; that is a prompt-tuning signal, not necessarily
  a bug.
