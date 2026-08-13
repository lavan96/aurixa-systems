// The /status page's server half.
//
// GET  — public, CORS, lightly throttled. Serves the CACHED latest state
//        per component plus a 30-day daily history and an anonymized
//        incident block (active + recently resolved), with everything
//        vendor-identifying stripped: the browser sees component keys,
//        normalized statuses, timestamps and source tags — never a vendor
//        name, endpoint, incident id, or incident text. If the cache is
//        missing or older than 30 minutes, one bounded inline refresh runs
//        first so the page is never empty.
// GET ?component=<key>&date=YYYY-MM-DD — day drilldown: hour-by-hour
//        rollup of our own checks for that UTC day plus the incident
//        windows that touched it. Same anonymity rules.
// POST {action:"refresh"} — admin-gated (x-support-admin-key = the vault
//        support_ingest_key). Polls every enabled vendor in parallel with
//        a 6s cap each, writes one snapshot per component, maintains the
//        observed day-rows (worst-confirmed status + check counts) and the
//        observed incident runs, and prunes snapshots older than 45 days.
//        pg_cron drives this every 5 minutes.
// POST {action:"backfill"} — admin-gated. Reconstructs per-day history
//        from each statuspage_v2 vendor's PUBLISHED incident feed
//        (/api/v2/incidents.json) into status_history_days, and upserts
//        the same incidents as timestamped windows into status_incidents.
//        Days before the feed's oldest returned incident are never
//        written — absence of data stays absent rather than being guessed.
//        pg_cron drives this daily; observed data ALWAYS WINS on overlap.
//
// Anonymity is enforced structurally: the ONLY strings that reach a
// browser are the component keys (matched to public copy in
// src/lib/statusPage.ts), the normalized status vocabulary, and the
// source tags 'vendor_feed'/'observed'. Vendor incident titles and ids
// are deliberately dropped during normalization — they name products
// ("<vendor> Auth degraded") and would undo the whole point.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { CORS, json } from "../_shared/mc.ts";

const STATUSES = [
  "operational",
  "maintenance",
  "degraded",
  "partial_outage",
  "major_outage",
  "unknown",
] as const;
type Status = (typeof STATUSES)[number];

const SEVERITY: Record<Status, number> = {
  operational: 0,
  unknown: 1,
  maintenance: 2,
  degraded: 3,
  partial_outage: 4,
  major_outage: 5,
};

/** An "issue" for incident purposes: a confirmed problem, not maintenance
 * (planned) and never `unknown` (unreadable is not evidence). */
function isIssue(status: Status): boolean {
  return status === "degraded" || status === "partial_outage" || status === "major_outage";
}

const STALE_AFTER_MS = 10 * 60_000; // flagged in the response
const REFRESH_IF_OLDER_MS = 30 * 60_000; // inline refresh threshold
const VENDOR_TIMEOUT_MS = 6_000;
const HISTORY_DAYS = 30;
const RETENTION_DAYS = 45;
// Backfill: how far back to reconstruct from published incident feeds, and
// a roomier timeout — incidents.json is a much bigger document than
// status.json.
const BACKFILL_DAYS = 90;
const BACKFILL_TIMEOUT_MS = 10_000;
// Resolved incidents stay in the public block this long after they end.
const RESOLVED_WINDOW_MS = 72 * 60 * 60_000;

// GET is a cache read; this only bounds scripted hammering.
const GET_WINDOW_MS = 15 * 60_000;
const GET_WINDOW_LIMIT = 120;

const DAY_MS = 24 * 60 * 60_000;

function db() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function dayKeyFloor(daysBack: number): string {
  return dayKey(Date.now() - daysBack * DAY_MS);
}

// ── Adapters: vendor payload → normalized status ─────────────────────────
// Every adapter is tolerant: anything unexpected is `unknown`, never a
// throw. `unknown` means "we could not read them", not "they are down".

function normStatuspageV2(body: Record<string, unknown>): Status {
  const indicator = (body?.status as Record<string, unknown>)?.indicator;
  switch (indicator) {
    case "none":
      return "operational";
    case "minor":
      return "degraded";
    case "major":
      return "partial_outage";
    case "critical":
      return "major_outage";
    case "maintenance":
      return "maintenance";
    default:
      return "unknown";
  }
}

function normStripeCurrent(body: Record<string, unknown>): Status {
  // status.stripe.com/current — tolerant read of its top-level indicator;
  // shapes have shifted over the years, so scan the likely keys.
  const candidates = [body?.largestatus, body?.status, (body?.message as never)]
    .filter((v) => typeof v === "string")
    .map((v) => (v as string).toLowerCase());
  for (const value of candidates) {
    if (value.includes("up") && !value.includes("disrupt")) return "operational";
    if (value.includes("degrad") || value.includes("minor")) return "degraded";
    if (value.includes("partial")) return "partial_outage";
    if (value.includes("down") || value.includes("major") || value.includes("outage")) {
      return "major_outage";
    }
    if (value.includes("mainten")) return "maintenance";
  }
  return "unknown";
}

function normInstatusSummary(body: Record<string, unknown>): Status {
  const page = body?.page as Record<string, unknown> | undefined;
  const raw = (typeof page?.status === "string" ? page.status : "").toUpperCase();
  switch (raw) {
    case "UP":
      return "operational";
    case "HASISSUES":
      return "degraded";
    case "UNDERMAINTENANCE":
      return "maintenance";
    default: {
      const incidents = body?.activeIncidents;
      if (Array.isArray(incidents) && incidents.length > 0) return "degraded";
      return "unknown";
    }
  }
}

const ADAPTERS: Record<string, (body: Record<string, unknown>) => Status> = {
  statuspage_v2: normStatuspageV2,
  stripe_current: normStripeCurrent,
  instatus_summary: normInstatusSummary,
};

async function pollVendor(endpoint: string, adapter: string): Promise<{ status: Status; raw: unknown }> {
  const normalize = ADAPTERS[adapter];
  if (!normalize) return { status: "unknown", raw: { error: `unknown adapter ${adapter}` } };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VENDOR_TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) return { status: "unknown", raw: { http: res.status } };
    const body = (await res.json()) as Record<string, unknown>;
    // Keep only a small excerpt for operator debugging — the raw column is
    // internal, but there is no reason to store kilobytes per poll.
    const excerpt = JSON.stringify(body).slice(0, 1000);
    return { status: normalize(body), raw: { excerpt } };
  } catch (error) {
    return { status: "unknown", raw: { error: String(error).slice(0, 200) } };
  } finally {
    clearTimeout(timer);
  }
}

// ── Refresh ──────────────────────────────────────────────────────────────

async function isAdminCall(client: ReturnType<typeof db>, req: Request): Promise<boolean> {
  const provided = req.headers.get("x-support-admin-key") ?? "";
  if (!provided) return false;
  try {
    const { data } = await client.rpc("support_ingest_key");
    if (typeof data !== "string" || data.length === 0) return false;
    if (provided.length !== data.length) return false;
    let diff = 0;
    for (let i = 0; i < data.length; i++) diff |= data.charCodeAt(i) ^ provided.charCodeAt(i);
    return diff === 0;
  } catch {
    return false;
  }
}

/** Worst CONFIRMED status of a set of polls; `unknown` only when nothing
 * was readable. One failed read among healthy polls is not a grey result. */
function worstConfirmed(statuses: Status[]): Status {
  let worst: Status | null = null;
  for (const s of statuses) {
    if (s === "unknown") continue;
    if (worst === null || SEVERITY[s] > SEVERITY[worst]) worst = s;
  }
  if (worst !== null) return worst;
  return statuses.length > 0 ? "unknown" : "unknown";
}

/**
 * Recompute today's observed day-row per component from today's snapshots:
 * worst-confirmed status plus check counts (readable / healthy), so the
 * summary never has to rescan a month of snapshots per read.
 */
async function upsertObservedDayRows(client: ReturnType<typeof db>): Promise<void> {
  const todayStartIso = `${dayKey(Date.now())}T00:00:00Z`;
  const { data: rows, error } = await client
    .from("status_snapshots")
    .select("component_key, status")
    .gte("checked_at", todayStartIso);
  if (error) throw error;

  const byComponent = new Map<string, Status[]>();
  for (const row of (rows ?? []) as Array<{ component_key: string; status: Status }>) {
    const list = byComponent.get(row.component_key) ?? [];
    list.push(row.status);
    byComponent.set(row.component_key, list);
  }

  const day = dayKey(Date.now());
  const upserts = [...byComponent.entries()].map(([component_key, statuses]) => {
    const readable = statuses.filter((s) => s !== "unknown");
    const healthy = readable.filter((s) => s === "operational" || s === "maintenance");
    return {
      component_key,
      day,
      status: worstConfirmed(statuses),
      source: "observed",
      checks_total: readable.length,
      checks_healthy: healthy.length,
      updated_at: new Date().toISOString(),
    };
  });
  if (upserts.length > 0) {
    const { error: upErr } = await client
      .from("status_history_days")
      .upsert(upserts, { onConflict: "component_key,day" });
    if (upErr) console.error("status-summary: day-row upsert failed", upErr.message);
  }
}

/**
 * Open, extend and close observed incident runs from the latest poll
 * results. A run opens when a component's status becomes a confirmed issue,
 * carries its worst status, and closes on the first healthy poll. `unknown`
 * polls neither open nor close a run.
 */
async function maintainObservedIncidents(
  client: ReturnType<typeof db>,
  results: Array<{ component_key: string; status: Status }>,
): Promise<void> {
  const { data: openRows, error } = await client
    .from("status_incidents")
    .select("id, component_key, worst_status")
    .eq("source", "observed")
    .is("ended_at", null);
  if (error) {
    console.error("status-summary: open incident read failed", error.message);
    return;
  }
  const open = new Map(
    ((openRows ?? []) as Array<{ id: string; component_key: string; worst_status: Status }>).map(
      (r) => [r.component_key, r],
    ),
  );

  for (const r of results) {
    const existing = open.get(r.component_key);
    if (isIssue(r.status)) {
      if (!existing) {
        // Walk back through recent polls to find where this run started —
        // consecutive issue polls, with `unknown` treated as neutral.
        const { data: recent } = await client
          .from("status_snapshots")
          .select("status, checked_at")
          .eq("component_key", r.component_key)
          .order("checked_at", { ascending: false })
          .limit(200);
        let startedAt = new Date().toISOString();
        let worst: Status = r.status;
        for (const row of (recent ?? []) as Array<{ status: Status; checked_at: string }>) {
          if (row.status === "unknown") continue;
          if (!isIssue(row.status)) break;
          startedAt = row.checked_at;
          if (SEVERITY[row.status] > SEVERITY[worst]) worst = row.status;
        }
        const { error: insErr } = await client.from("status_incidents").insert({
          component_key: r.component_key,
          source: "observed",
          vendor_ref: `obs:${startedAt}`,
          worst_status: worst,
          started_at: startedAt,
        });
        if (insErr) console.error("status-summary: incident open failed", insErr.message);
      } else if (SEVERITY[r.status] > SEVERITY[existing.worst_status]) {
        await client
          .from("status_incidents")
          .update({ worst_status: r.status, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      }
    } else if (r.status !== "unknown" && existing) {
      await client
        .from("status_incidents")
        .update({ ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    }
  }
}

async function refreshAll(client: ReturnType<typeof db>): Promise<{ polled: number; wrote: number }> {
  const { data: providers, error } = await client
    .from("status_providers")
    .select("component_key, adapter, endpoint")
    .eq("enabled", true);
  if (error) throw error;

  const results = await Promise.all(
    (providers ?? []).map(async (p) => ({
      component_key: p.component_key,
      ...(await pollVendor(p.endpoint, p.adapter)),
    })),
  );

  let wrote = 0;
  for (const r of results) {
    const { error: insErr } = await client.from("status_snapshots").insert({
      component_key: r.component_key,
      status: r.status,
      raw: r.raw ?? {},
    });
    if (!insErr) wrote++;
    else console.error("status-summary: snapshot insert failed", r.component_key, insErr.message);
  }

  try {
    await upsertObservedDayRows(client);
    await maintainObservedIncidents(client, results);
  } catch (error) {
    console.error("status-summary: post-refresh upkeep failed", error);
  }

  await client
    .from("status_snapshots")
    .delete()
    .lt("checked_at", new Date(Date.now() - RETENTION_DAYS * DAY_MS).toISOString());

  return { polled: results.length, wrote };
}

// ── History backfill from published incident feeds ──────────────────────

/** Statuspage impact → our vocabulary. `none` carries no status signal. */
function impactToStatus(impact: unknown): Status | null {
  switch (impact) {
    case "minor":
      return "degraded";
    case "major":
      return "partial_outage";
    case "critical":
      return "major_outage";
    case "maintenance":
      return "maintenance";
    default:
      return null;
  }
}

/**
 * Reconstruct per-day statuses for every enabled statuspage_v2 vendor from
 * its published /api/v2/incidents.json, and record the same incidents as
 * timestamped windows. Quiet days are operational, incident days take the
 * incident's worst impact, and days before the feed's oldest returned
 * incident are NOT written — the feed is capped (~50 most recent
 * incidents), so anything older is unknowable, and absent must stay absent.
 * Today's day-row is never written: the live poller owns it, and
 * buildSummary prefers observed data on any overlap anyway.
 */
async function backfillAll(
  client: ReturnType<typeof db>,
): Promise<{ vendors: number; days_written: number; incidents_written: number; skipped: string[] }> {
  const { data: providers, error } = await client
    .from("status_providers")
    .select("component_key, adapter, endpoint")
    .eq("enabled", true);
  if (error) throw error;

  const todayStartMs = Date.parse(`${dayKey(Date.now())}T00:00:00Z`);
  const windowStartMs = todayStartMs - BACKFILL_DAYS * DAY_MS;
  const skipped: string[] = [];
  let vendors = 0;
  let daysWritten = 0;
  let incidentsWritten = 0;

  for (const p of providers ?? []) {
    if (p.adapter !== "statuspage_v2") {
      skipped.push(p.component_key);
      continue;
    }
    const feedUrl = p.endpoint.replace(/\/api\/v2\/status\.json.*$/, "/api/v2/incidents.json");
    if (feedUrl === p.endpoint) {
      skipped.push(p.component_key);
      continue;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), BACKFILL_TIMEOUT_MS);
    let incidents: Array<Record<string, unknown>>;
    try {
      const res = await fetch(feedUrl, {
        headers: { accept: "application/json" },
        signal: controller.signal,
      });
      if (!res.ok) {
        skipped.push(p.component_key);
        continue;
      }
      const body = (await res.json()) as Record<string, unknown>;
      incidents = Array.isArray(body?.incidents)
        ? (body.incidents as Array<Record<string, unknown>>)
        : [];
    } catch (error) {
      console.error("status-summary: backfill fetch failed", p.component_key, String(error).slice(0, 120));
      skipped.push(p.component_key);
      continue;
    } finally {
      clearTimeout(timer);
    }

    // Feed horizon: the oldest incident the capped feed still returns. An
    // empty feed means the vendor publishes no recent incidents at all, so
    // the whole window is legitimately quiet.
    let horizonMs = windowStartMs;
    if (incidents.length > 0) {
      const oldest = incidents
        .map((i) => Date.parse(typeof i.created_at === "string" ? i.created_at : ""))
        .filter((t) => !Number.isNaN(t))
        .sort((a, b) => a - b)[0];
      if (oldest !== undefined) {
        horizonMs = Math.max(windowStartMs, Date.parse(`${dayKey(oldest)}T00:00:00Z`));
      }
    }

    // Quiet default, then overlay each incident's window, worst per day.
    // Alongside the day map, collect the incidents themselves as windows.
    const byDay = new Map<string, Status>();
    for (let ms = horizonMs; ms < todayStartMs; ms += DAY_MS) {
      byDay.set(dayKey(ms), "operational");
    }
    const windowRows: Array<Record<string, unknown>> = [];
    for (const incident of incidents) {
      const status = impactToStatus(incident.impact);
      if (!status) continue;
      const startRaw = typeof incident.started_at === "string" ? incident.started_at
        : typeof incident.created_at === "string" ? incident.created_at : "";
      const startMs = Date.parse(startRaw);
      if (Number.isNaN(startMs)) continue;
      const resolvedRaw = typeof incident.resolved_at === "string" ? incident.resolved_at : null;
      const endRaw = resolvedRaw ?? (typeof incident.updated_at === "string" ? incident.updated_at : startRaw);
      const endMs = Number.isNaN(Date.parse(endRaw)) ? startMs : Date.parse(endRaw);

      const vendorId = typeof incident.id === "string" && incident.id.length > 0 ? incident.id : null;
      if (vendorId && endMs >= windowStartMs) {
        windowRows.push({
          component_key: p.component_key,
          source: "vendor_feed",
          vendor_ref: vendorId,
          worst_status: status,
          started_at: new Date(startMs).toISOString(),
          ended_at: resolvedRaw ? new Date(Date.parse(resolvedRaw)).toISOString() : null,
          updated_at: new Date().toISOString(),
        });
      }

      const firstDay = Math.max(Date.parse(`${dayKey(startMs)}T00:00:00Z`), horizonMs);
      const lastDay = Math.min(Date.parse(`${dayKey(Math.max(startMs, endMs))}T00:00:00Z`), todayStartMs - DAY_MS);
      for (let ms = firstDay; ms <= lastDay; ms += DAY_MS) {
        const key = dayKey(ms);
        const existing = byDay.get(key);
        // Only days inside the horizon window exist in the map.
        if (existing === undefined) continue;
        if (SEVERITY[status] > SEVERITY[existing]) byDay.set(key, status);
      }
    }

    // Never overwrite an observed day: those rows carry our own counts and
    // worst-confirmed status, which beat any reconstruction.
    const { data: observedDays } = await client
      .from("status_history_days")
      .select("day")
      .eq("component_key", p.component_key)
      .eq("source", "observed");
    const observedSet = new Set(
      ((observedDays ?? []) as Array<{ day: string }>).map((d) => d.day),
    );

    const rows = [...byDay.entries()]
      .filter(([day]) => !observedSet.has(day))
      .map(([day, status]) => ({
        component_key: p.component_key,
        day,
        status,
        source: "vendor_feed",
        updated_at: new Date().toISOString(),
      }));
    if (rows.length > 0) {
      const { error: upErr } = await client
        .from("status_history_days")
        .upsert(rows, { onConflict: "component_key,day" });
      if (upErr) {
        console.error("status-summary: backfill upsert failed", p.component_key, upErr.message);
        skipped.push(p.component_key);
        continue;
      }
      daysWritten += rows.length;
    }
    if (windowRows.length > 0) {
      const { error: winErr } = await client
        .from("status_incidents")
        .upsert(windowRows, { onConflict: "component_key,vendor_ref" });
      if (winErr) console.error("status-summary: incident upsert failed", p.component_key, winErr.message);
      else incidentsWritten += windowRows.length;
    }
    vendors++;
  }

  return { vendors, days_written: daysWritten, incidents_written: incidentsWritten, skipped };
}

// ── Public summary ───────────────────────────────────────────────────────

type IncidentRow = {
  component_key: string;
  source: "vendor_feed" | "observed";
  worst_status: Status;
  started_at: string;
  ended_at: string | null;
};

async function buildSummary(client: ReturnType<typeof db>) {
  // Latest polls (48h window is plenty: the cron runs every 5 minutes, and
  // anything staler triggers the inline refresh below anyway).
  const { data: recentRows, error } = await client
    .from("status_snapshots")
    .select("component_key, status, checked_at")
    .gte("checked_at", new Date(Date.now() - 2 * DAY_MS).toISOString())
    .order("checked_at", { ascending: true });
  if (error) throw error;

  const { data: providers } = await client
    .from("status_providers")
    .select("component_key, sort_order")
    .eq("enabled", true)
    .order("sort_order");

  // The strip and the uptime figures come from the materialized day-rows:
  // observed rows (our polls, with check counts) win over vendor_feed rows
  // (reconstructed) on any shared day.
  const historyFloor = dayKeyFloor(HISTORY_DAYS);
  const { data: dayRows } = await client
    .from("status_history_days")
    .select("component_key, day, status, source, checks_total, checks_healthy")
    .gte("day", historyFloor);
  type DayRow = {
    component_key: string;
    day: string;
    status: Status;
    source: string;
    checks_total: number;
    checks_healthy: number;
  };
  const daysByComponent = new Map<string, DayRow[]>();
  for (const row of (dayRows ?? []) as DayRow[]) {
    const list = daysByComponent.get(row.component_key) ?? [];
    list.push(row);
    daysByComponent.set(row.component_key, list);
  }

  type Row = { component_key: string; status: Status; checked_at: string };
  const recentByComponent = new Map<string, Row[]>();
  for (const row of (recentRows ?? []) as Row[]) {
    const list = recentByComponent.get(row.component_key) ?? [];
    list.push(row);
    recentByComponent.set(row.component_key, list);
  }

  // Incident windows for the jumbotron: everything open, plus everything
  // that ended inside the resolved window.
  const resolvedFloor = new Date(Date.now() - RESOLVED_WINDOW_MS).toISOString();
  const { data: incidentRows } = await client
    .from("status_incidents")
    .select("component_key, source, worst_status, started_at, ended_at")
    .or(`ended_at.is.null,ended_at.gte.${resolvedFloor}`);
  const incidentsByComponent = new Map<string, IncidentRow[]>();
  for (const row of (incidentRows ?? []) as IncidentRow[]) {
    const list = incidentsByComponent.get(row.component_key) ?? [];
    list.push(row);
    incidentsByComponent.set(row.component_key, list);
  }

  const active: Array<{ key: string; status: Status; started_at: string | null; confirmed: boolean }> = [];
  const resolved: Array<{
    key: string;
    worst_status: Status;
    started_at: string | null;
    ended_at: string;
    source: string;
  }> = [];

  const components = ((providers ?? []) as Array<{ component_key: string }>).map((p) => {
    const recent = recentByComponent.get(p.component_key) ?? [];
    const latest = recent[recent.length - 1] ?? null;
    const days = (daysByComponent.get(p.component_key) ?? []).slice();

    // Observed beats reconstructed on a shared day.
    const byDay = new Map<string, { status: Status; source: string }>();
    for (const row of days) {
      const existing = byDay.get(row.day);
      if (!existing || (existing.source !== "observed" && row.source === "observed")) {
        byDay.set(row.day, { status: row.status, source: row.source });
      }
    }
    const history = [...byDay.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-HISTORY_DAYS)
      .map(([date, v]) => ({ date, status: v.status }));

    // Observed uptime: summed check counts over the window's observed
    // day-rows. `unknown` polls were excluded from the counts at write
    // time, and maintenance counted as healthy.
    const observed = days.filter((d) => d.source === "observed");
    const total = observed.reduce((sum, d) => sum + (d.checks_total ?? 0), 0);
    const healthy = observed.reduce((sum, d) => sum + (d.checks_healthy ?? 0), 0);
    const uptime = total > 0 ? Math.round((healthy / total) * 1000) / 10 : null;
    const firstObservedDay = observed.map((d) => d.day).sort()[0] ?? null;

    // Incident block entries for this component.
    const windows = incidentsByComponent.get(p.component_key) ?? [];
    const currentStatus = (latest?.status ?? "unknown") as Status;
    if (isIssue(currentStatus)) {
      const vendorOpen = windows
        .filter((w) => w.source === "vendor_feed" && w.ended_at === null)
        .sort((a, b) => (a.started_at < b.started_at ? -1 : 1))[0];
      const observedOpen = windows
        .filter((w) => w.source === "observed" && w.ended_at === null)
        .sort((a, b) => (a.started_at < b.started_at ? -1 : 1))[0];
      active.push({
        key: p.component_key,
        status: currentStatus,
        started_at: vendorOpen?.started_at ?? observedOpen?.started_at ?? null,
        confirmed: vendorOpen !== undefined,
      });
    }
    const vendorWindows = windows.filter((w) => w.source === "vendor_feed");
    for (const w of windows) {
      if (w.ended_at === null) continue;
      // Skip observed runs that a vendor-published window already covers.
      if (w.source === "observed") {
        const covered = vendorWindows.some((v) => {
          const vEnd = v.ended_at ? Date.parse(v.ended_at) : Date.now();
          return Date.parse(v.started_at) <= Date.parse(w.ended_at!) &&
            vEnd >= Date.parse(w.started_at);
        });
        if (covered) continue;
      }
      resolved.push({
        key: p.component_key,
        worst_status: w.worst_status,
        started_at: w.started_at,
        ended_at: w.ended_at,
        source: w.source,
      });
    }

    return {
      key: p.component_key,
      status: currentStatus,
      checked_at: latest?.checked_at ?? null,
      uptime,
      since: firstObservedDay ? `${firstObservedDay}T00:00:00Z` : null,
      history,
    };
  });

  resolved.sort((a, b) => (a.ended_at > b.ended_at ? -1 : 1));

  const known = components.map((c) => c.status).filter((s) => s !== "unknown");
  const overall: Status =
    components.length === 0 || known.length === 0
      ? "unknown"
      : known.reduce((worst, s) => (SEVERITY[s] > SEVERITY[worst] ? s : worst));

  const newest = components
    .map((c) => c.checked_at)
    .filter((t): t is string => t !== null)
    .sort()
    .pop() ?? null;

  return {
    ok: true,
    overall,
    checked_at: newest,
    generated_at: new Date().toISOString(),
    stale: newest !== null && Date.now() - Date.parse(newest) > STALE_AFTER_MS,
    components,
    incidents: { active, resolved: resolved.slice(0, 6) },
    newestMs: newest ? Date.parse(newest) : null,
  };
}

// ── Day drilldown ────────────────────────────────────────────────────────

async function handleDetail(client: ReturnType<typeof db>, componentKey: string, date: string): Promise<Response> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ ok: false, error: "invalid_date" }, 400);
  const dayStartMs = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(dayStartMs)) return json({ ok: false, error: "invalid_date" }, 400);
  const now = Date.now();
  if (dayStartMs > now || dayStartMs < now - (BACKFILL_DAYS + 1) * DAY_MS) {
    return json({ ok: false, error: "date_out_of_range" }, 400);
  }

  const { data: provider } = await client
    .from("status_providers")
    .select("component_key")
    .eq("component_key", componentKey)
    .eq("enabled", true)
    .maybeSingle();
  if (!provider) return json({ ok: false, error: "unknown_component" }, 404);

  const dayEndIso = new Date(dayStartMs + DAY_MS).toISOString();
  const dayStartIso = new Date(dayStartMs).toISOString();

  const { data: snapRows } = await client
    .from("status_snapshots")
    .select("status, checked_at")
    .eq("component_key", componentKey)
    .gte("checked_at", dayStartIso)
    .lt("checked_at", dayEndIso)
    .order("checked_at", { ascending: true });
  const snaps = (snapRows ?? []) as Array<{ status: Status; checked_at: string }>;

  // Hour-by-hour rollup of our own checks (UTC hours). Hours with no
  // checks are reported as such rather than guessed.
  const byHour = new Map<number, Status[]>();
  for (const s of snaps) {
    const hour = new Date(s.checked_at).getUTCHours();
    const list = byHour.get(hour) ?? [];
    list.push(s.status);
    byHour.set(hour, list);
  }
  const hours = Array.from({ length: 24 }, (_, hour) => {
    const list = byHour.get(hour) ?? [];
    return {
      hour,
      status: list.length > 0 ? worstConfirmed(list) : ("none" as const),
      checks: list.length,
    };
  });

  const readable = snaps.filter((s) => s.status !== "unknown");
  const healthy = readable.filter((s) => s.status === "operational" || s.status === "maintenance");

  const { data: incidentRows } = await client
    .from("status_incidents")
    .select("source, worst_status, started_at, ended_at")
    .eq("component_key", componentKey)
    .lt("started_at", dayEndIso)
    .or(`ended_at.is.null,ended_at.gte.${dayStartIso}`)
    .order("started_at", { ascending: true });

  const { data: dayRow } = await client
    .from("status_history_days")
    .select("status, source")
    .eq("component_key", componentKey)
    .eq("day", date)
    .maybeSingle();

  return new Response(
    JSON.stringify({
      ok: true,
      key: componentKey,
      date,
      observed: snaps.length > 0,
      day_status: (dayRow as { status: Status } | null)?.status ?? null,
      checks: snaps.length > 0 ? { total: readable.length, healthy: healthy.length } : null,
      hours: snaps.length > 0 ? hours : [],
      incidents: ((incidentRows ?? []) as IncidentRow[]).map((w) => ({
        source: w.source,
        worst_status: w.worst_status,
        started_at: w.started_at,
        ended_at: w.ended_at,
      })),
    }),
    {
      status: 200,
      headers: {
        ...CORS,
        "content-type": "application/json",
        // Past days barely change (a daily backfill re-sync at most);
        // today's detail changes every 5 minutes.
        "cache-control": "public, max-age=300",
      },
    },
  );
}

// ── HTTP surface ─────────────────────────────────────────────────────────

async function handleGet(req: Request): Promise<Response> {
  const client = db();

  try {
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    const ipHash = await sha256Hex(`status:${ip}`);
    const { count } = await client
      .from("support_assistant_requests")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", new Date(Date.now() - GET_WINDOW_MS).toISOString());
    if ((count ?? 0) >= GET_WINDOW_LIMIT) {
      return json({ ok: false, error: "throttled", retry_after_seconds: GET_WINDOW_MS / 1000 }, 429);
    }
    await client.from("support_assistant_requests").insert({ ip_hash: ipHash });
  } catch (error) {
    console.error("status-summary: throttle unavailable, failing open", error);
  }

  const url = new URL(req.url);
  const componentKey = url.searchParams.get("component");
  const date = url.searchParams.get("date");
  if (componentKey && date) return await handleDetail(client, componentKey, date);

  let summary = await buildSummary(client);

  // Cold or long-stale cache: refresh inline once so the page never shows
  // an empty roster. Normal operation never reaches this — pg_cron does.
  if (summary.newestMs === null || Date.now() - summary.newestMs > REFRESH_IF_OLDER_MS) {
    try {
      await refreshAll(client);
      summary = await buildSummary(client);
    } catch (error) {
      console.error("status-summary: inline refresh failed", error);
    }
  }

  const { newestMs: _drop, ...body } = summary;
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      ...CORS,
      "content-type": "application/json",
      // Shared cache hint: a minute of staleness is invisible on a page
      // that refreshes itself, and it soaks up traffic spikes during the
      // exact moments a status page gets them.
      "cache-control": "public, max-age=60",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    if (req.method === "GET") return await handleGet(req);

    if (req.method === "POST") {
      const raw = await req.text();
      if (raw.length > 4096) return json({ ok: false, error: "payload_too_large" }, 413);
      let body: Record<string, unknown> = {};
      try {
        body = JSON.parse(raw || "{}") as Record<string, unknown>;
      } catch {
        return json({ ok: false, error: "invalid_request" }, 400);
      }
      if (body.action !== "refresh" && body.action !== "backfill") {
        return json({ ok: false, error: "invalid_request" }, 400);
      }

      const client = db();
      if (!(await isAdminCall(client, req))) return json({ ok: false, error: "forbidden" }, 403);
      const result = body.action === "backfill" ? await backfillAll(client) : await refreshAll(client);
      return json({ ok: true, ...result });
    }

    return json({ ok: false, error: "method_not_allowed" }, 405);
  } catch (error) {
    console.error("status-summary: unhandled", error);
    return json({ ok: false, error: "status_failed" }, 500);
  }
});
