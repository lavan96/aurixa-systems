# Upstream Status Page

`/status` reports the live health of the services Aurixa Systems is built on —
without ever naming them. Each provider appears as a generic **role**
("Backend Platform Provider", "Cloud Security & Delivery Provider", …), with a
normalized status, a 30-day history strip, and an overall banner. Think
Incident.io, scoped to Aurixa's upstream dependencies, anonymized.

## The one rule

**No vendor is ever named in anything a browser can read.** That covers the
page copy, the roster labels, the public JSON, keys, and comments in
client-shipped code. Two things enforce it:

- `src/lib/statusPage.test.ts` greps every public-facing string in the shared
  vocabulary against a vendor-name regex and fails the suite on a hit.
- The vendor registry (`status_providers`) and raw poll payloads
  (`status_snapshots.raw`) live behind RLS with **no policies** — only the
  edge function's service role can read them, and the public response is
  built exclusively from normalized fields.

If a vendor name has to exist somewhere, it exists in the private repo's
migration seed or the database — never in the response.

## Data flow

```
pg_cron (every 5 min)
  └─ POST status-summary {action:"refresh"}   ← x-support-admin-key (vault support_ingest_key)
       └─ polls every ENABLED provider in parallel (6s cap each)
            └─ adapter normalizes vendor payload → status vocabulary
                 └─ one row per component into status_snapshots (prunes >45 days)

browser GET /functions/v1/status-summary      ← no auth; 120/15min IP throttle
  └─ latest snapshot per component + daily worst-status rollup (30 days)
       └─ overall = worst CONFIRMED state; cache-control max-age=60
```

The page (`src/pages/Status.tsx`) fetches on mount and every 60s via
`src/lib/statusPageClient.ts`, keeps the last good summary through transient
fetch failures, and prerenders a roster-labelled skeleton so the static HTML
is never empty.

**The payload carries keys, never copy.** The server response is
`{ key, status, checked_at, uptime, since, history }` per component;
labels, descriptions and the affected-features chips are joined from
`STATUS_COMPONENT_ROSTER` client-side by `normalizeSummaryPayload`. That
join is load-bearing and has already bitten once: the first deploy skipped
it, so the prerendered skeleton showed real labels and then the live data
replaced every row with the generic fallback ("Upstream service" seven
times). A regression test now pins the join, and a second test pins that
roster labels stay distinct roles rather than one repeated template.
`uptime` is the share of *readable* checks reporting healthy (operational or
maintenance) over the 30-day window — `unknown` polls are excluded from the
denominator, consistent with "unreadable is not evidence of an outage". Vendor endpoints are only ever contacted server-side; a page
load never triggers a vendor call. If the cache is older than 30 minutes the
GET path runs one bounded inline refresh first, so the page recovers even if
cron stalls.

## Vocabulary and severity

`src/lib/statusPage.ts` owns the shared vocabulary — the roster (keys, labels,
descriptions), the status set, and the severity order:

```
operational < unknown < maintenance < degraded < partial_outage < major_outage
```

`unknown` means "we could not read the vendor's status API", never "they are
down". It therefore ranks **below every confirmed problem** and never drives
the overall banner while anything readable exists (`computeOverall`). The
first live day proved both ends of this: a genuine upstream `degraded` event
was detected and bannered, and a vendor status API returning HTTP 500 for one
poll produced a quiet `unknown` snapshot and nothing else.

## Historical backfill

The 30-day strips predate our own monitoring: once a day (and on demand via
`POST {action:"backfill"}`), the function reconstructs per-day history from
each statuspage-style vendor's **published incident feed**
(`/api/v2/incidents.json`) into `status_history_days`. The rules that keep
this honest:

- A backfilled day is the vendor's own record: days inside a published
  incident window take the incident's impact (worst per day), quiet days
  are operational.
- The feed is capped (~50 most recent incidents), so days **before the
  oldest returned incident are never written** — absence of data is shown
  as absence, never guessed.
- **Observed always wins**: `buildSummary` starts from the backfill and
  overlays our own snapshot rollup on any shared day, and the backfill
  never writes today.
- The UI keeps the distinction visible: bars before `since` (first
  observation) carry a "from the provider's published history" tooltip
  (`historyBarTitle`), and the page footer states the reconstruction.
- Vendors without a machine-readable history API (payments) simply start
  at our monitoring start; their strip says "Since <date>".

The observed-uptime line is untouched by backfill — it is computed from our
own polls only (materialized as per-day check counts on the observed
day-rows, so a summary read never rescans a month of snapshots).

## Incidents (jumbotron + drilldown)

`status_incidents` holds timestamped incident windows from two sources:

- **`vendor_feed`** — the provider's own published incidents, upserted by
  the daily backfill with their real start/resolve times and impact.
  Vendor incident ids stay server-side (`vendor_ref`); titles are never
  stored at all.
- **`observed`** — runs of consecutive non-operational polls, opened and
  closed by the 5-minute refresh. `unknown` polls neither open nor close a
  run, and maintenance is not an "issue".

The summary's `incidents` block drives the page's jumbotron: **active** =
components whose current status is a confirmed problem (start time from the
provider's open incident when one exists — `confirmed: true` — else from
our observed run), and **resolved** = windows that ended in the last 72
hours, with observed runs suppressed when a vendor-published window already
covers them.

`GET ?component=<key>&date=YYYY-MM-DD` is the day drilldown: an hour-by-hour
rollup of our own checks for that UTC day (hours with no checks are said to
have none, not guessed) plus every incident window touching the day. The
page opens it when a history bar is clicked; bars also carry a rich hover
card stating date, status, and whether the day is observed or reconstructed.

## Adapters

Three normalizers in `supabase/functions/status-summary/index.ts`, all
tolerant — a shape they don't recognize yields `unknown`, never a throw:

| Adapter            | Source shape                              |
| ------------------ | ----------------------------------------- |
| `statuspage_v2`    | Statuspage `/api/v2/status.json` `indicator` (none/minor/major/critical/maintenance) |
| `stripe_current`   | tolerant string scan of a `{ status }` payload |
| `instatus_summary` | Instatus `summary.json` `page.status` (UP/HASISSUES/UNDERMAINTENANCE) |

Vendor incident titles are deliberately dropped: prose written by the vendor
tends to name the vendor.

## Adding or changing a provider

A vendor changing status platforms is a **row update, not a deploy**: point
`status_providers.endpoint`/`adapter` at the new feed. A new component role
needs (1) a roster entry in `statusPage.ts` — which the anonymity test then
checks — and (2) a registry row with the same `component_key`.

`email_delivery` is seeded **disabled**: that vendor exposes no
machine-readable public status API today (its status host serves HTML only;
the Instatus and Better Stack JSON conventions both return 500s). A permanent
`unknown` row tells users nothing, so the component stays off the page until
an endpoint exists — flipping `enabled` is all it takes.

## Abuse and cost bounds

- Public GET: 120/15min per hashed IP (piggybacks the support assistant's
  throttle table with a `status:` prefix; raw IPs are never stored) plus
  `cache-control: public, max-age=60`.
- Refresh: admin-gated by constant-time comparison against the vault
  `support_ingest_key` — the same key the support pipeline already manages.
- Polls: 6s timeout per vendor, all in parallel, snapshots pruned past
  45 days.

## Deployment notes

- Migration: `supabase/migrations/20260813100000_status_page.sql` (tables,
  RLS, seed, cron). The cron block degrades to a warning if `pg_cron` or the
  vault key is missing.
- Function: `status-summary` with `verify_jwt = false` in
  `supabase/config.toml` — the GET is public by design; abuse is bounded
  inside the function.
- The `/status` route is indexable: eager import in `App.tsx`, a
  `routeMetadata.ts` entry, and it must stay out of `vercel.json`'s noindex
  rules. Sitemap and `llms.txt` are regenerated by the prebuild.
