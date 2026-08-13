// The /status page's server half.
//
// GET  — public, CORS, lightly throttled. Serves the CACHED latest state
//        per component from status_snapshots plus a 30-day daily history,
//        with everything vendor-identifying stripped: the browser sees
//        component keys and normalized statuses, never a vendor name,
//        endpoint, or incident text. If the cache is missing or older than
//        30 minutes, one bounded inline refresh runs first so the page is
//        never empty.
// POST {action:"refresh"} — admin-gated (x-support-admin-key = the vault
//        support_ingest_key). Polls every enabled vendor in parallel with
//        a 6s cap each, normalizes via the adapter registry below, writes
//        one snapshot per component, and prunes snapshots older than 45
//        days. pg_cron drives this every 5 minutes.
//
// Anonymity is enforced structurally: the ONLY strings that reach a
// browser are the component keys (matched to public copy in
// src/lib/statusPage.ts) and the normalized status vocabulary. Vendor
// incident titles are deliberately dropped during normalization — they
// name products ("<vendor> Auth degraded") and would undo the whole point.

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

const STALE_AFTER_MS = 10 * 60_000; // flagged in the response
const REFRESH_IF_OLDER_MS = 30 * 60_000; // inline refresh threshold
const VENDOR_TIMEOUT_MS = 6_000;
const HISTORY_DAYS = 30;
const RETENTION_DAYS = 45;

// GET is a cache read; this only bounds scripted hammering.
const GET_WINDOW_MS = 15 * 60_000;
const GET_WINDOW_LIMIT = 120;

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
      if (raw === "") return "unknown";
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

  await client
    .from("status_snapshots")
    .delete()
    .lt("checked_at", new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60_000).toISOString());

  return { polled: results.length, wrote };
}

// ── Public summary ───────────────────────────────────────────────────────

async function buildSummary(client: ReturnType<typeof db>) {
  const since = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60_000).toISOString();
  const { data: rows, error } = await client
    .from("status_snapshots")
    .select("component_key, status, checked_at")
    .gte("checked_at", since)
    .order("checked_at", { ascending: true });
  if (error) throw error;

  const { data: providers } = await client
    .from("status_providers")
    .select("component_key, sort_order")
    .eq("enabled", true)
    .order("sort_order");

  type Row = { component_key: string; status: Status; checked_at: string };
  const byComponent = new Map<string, Row[]>();
  for (const row of (rows ?? []) as Row[]) {
    const list = byComponent.get(row.component_key) ?? [];
    list.push(row);
    byComponent.set(row.component_key, list);
  }

  const components = ((providers ?? []) as Array<{ component_key: string }>).map((p) => {
    const list = byComponent.get(p.component_key) ?? [];
    const latest = list[list.length - 1] ?? null;

    // Daily rollup, worst status per day, oldest → newest.
    const byDay = new Map<string, Status>();
    for (const row of list) {
      const day = row.checked_at.slice(0, 10);
      const existing = byDay.get(day);
      if (!existing || SEVERITY[row.status] > SEVERITY[existing]) byDay.set(day, row.status);
    }
    const history = [...byDay.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-HISTORY_DAYS)
      .map(([date, status]) => ({ date, status }));

    return {
      key: p.component_key,
      status: (latest?.status ?? "unknown") as Status,
      checked_at: latest?.checked_at ?? null,
      history,
    };
  });

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
    stale: newest !== null && Date.now() - Date.parse(newest) > STALE_AFTER_MS,
    components,
    newestMs: newest ? Date.parse(newest) : null,
  };
}

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
      if (body.action !== "refresh") return json({ ok: false, error: "invalid_request" }, 400);

      const client = db();
      if (!(await isAdminCall(client, req))) return json({ ok: false, error: "forbidden" }, 403);
      const result = await refreshAll(client);
      return json({ ok: true, ...result });
    }

    return json({ ok: false, error: "method_not_allowed" }, 405);
  } catch (error) {
    console.error("status-summary: unhandled", error);
    return json({ ok: false, error: "status_failed" }, 500);
  }
});
