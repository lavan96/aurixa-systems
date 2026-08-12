// POST /support-ticket — validate, throttle and forward a support ticket to
//      Mission Control's public ingest (POST {MC}/api/public/support/tickets).
// GET  /support-ticket?reference=…&workspace_id=… — status lookup passthrough.
//
// The browser only ever talks to Aurixa Systems: this function is the public
// surface, Mission Control owns classification (P0–P3), SLAs and remediation.
// The ingest secret — when configured — is attached here, server-to-server,
// so it never reaches a client.
//
// Validation mirrors src/lib/supportTicket.ts. It must stay self-contained:
// Deno cannot import from src/, so the bounds are duplicated by design and a
// change to either side must be mirrored in the other.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { CORS, json, MC_URL, proxyToMc } from "../_shared/mc.ts";

const MC_TICKETS_PATH = "/api/public/support/tickets";

/** Reject anything larger than this before parsing. A ticket is ~6KB at worst. */
const MAX_BODY_BYTES = 64 * 1024;

// ── Throttle policy ──────────────────────────────────────────────────────────
const SHORT_WINDOW_MS = 15 * 60_000;
const SHORT_WINDOW_LIMIT = 5;
const SHORT_RETRY_SECONDS = 900;
const DAY_WINDOW_MS = 24 * 60 * 60_000;
const DAY_WINDOW_LIMIT = 20;
const DAY_RETRY_SECONDS = 86400;

// ── Contract enums and bounds (mirror src/lib/supportTicket.ts) ──────────────
const CATEGORIES = new Set([
  "security_threat",
  "api_outage",
  "provider_downtime",
  "bug",
  "performance",
  "data_issue",
  "access",
  "billing",
  "feature_request",
  "question",
  "other",
]);

const BREAKAGE_VECTORS = new Set([
  "full_outage",
  "partial_outage",
  "degraded_performance",
  "single_feature",
  "intermittent",
  "cosmetic",
  "none",
]);

const str = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

type TicketPayload = {
  version: 1;
  workspace_id: string;
  user_id?: string;
  reporter_name?: string;
  reporter_email: string;
  category: string;
  breakage_vector: string;
  subject: string;
  description: string;
  impact?: string;
  client_meta: { source: "npc-dashboard" | "direct"; url: string; user_agent: string };
};

/**
 * Re-validate server-side and rebuild the payload from the validated fields,
 * so only the contract's own keys are ever forwarded — never the honeypot,
 * never whatever else a hand-rolled request smuggled in.
 */
function parseTicket(
  body: Record<string, unknown>,
): { ok: true; payload: TicketPayload } | { ok: false; fields: Record<string, string> } {
  const fields: Record<string, string> = {};

  const workspaceId = str(body.workspace_id);
  if (!workspaceId) fields.workspace_id = "workspace_id is required";
  else if (workspaceId.length > 120) fields.workspace_id = "workspace_id must be 120 characters or fewer";

  const userId = str(body.user_id);
  if (userId.length > 120) fields.user_id = "user_id must be 120 characters or fewer";

  const reporterName = str(body.reporter_name);
  if (reporterName.length > 120) fields.reporter_name = "reporter_name must be 120 characters or fewer";

  const reporterEmail = str(body.reporter_email).toLowerCase();
  if (!reporterEmail) fields.reporter_email = "reporter_email is required";
  else if (reporterEmail.length > 320 || !/^[^\s@]+@[^\s@]+$/.test(reporterEmail)) {
    fields.reporter_email = "reporter_email must be a valid email address";
  }

  const category = str(body.category);
  if (!CATEGORIES.has(category)) fields.category = "category is not a recognised value";

  const breakageVector = str(body.breakage_vector);
  if (!BREAKAGE_VECTORS.has(breakageVector)) {
    fields.breakage_vector = "breakage_vector is not a recognised value";
  }

  const subject = str(body.subject);
  if (subject.length < 4 || subject.length > 160) {
    fields.subject = "subject must be between 4 and 160 characters";
  }

  const description = str(body.description);
  if (description.length < 20 || description.length > 5000) {
    fields.description = "description must be between 20 and 5000 characters";
  }

  const impact = str(body.impact);
  if (impact.length > 1000) fields.impact = "impact must be 1000 characters or fewer";

  if (Object.keys(fields).length > 0) return { ok: false, fields };

  const meta = (body.client_meta ?? {}) as Record<string, unknown>;
  const payload: TicketPayload = {
    version: 1,
    workspace_id: workspaceId,
    reporter_email: reporterEmail,
    category,
    breakage_vector: breakageVector,
    subject,
    description,
    client_meta: {
      source: str(meta.source) === "npc-dashboard" ? "npc-dashboard" : "direct",
      url: str(meta.url).slice(0, 500),
      user_agent: str(meta.user_agent).slice(0, 400),
    },
  };
  if (userId) payload.user_id = userId;
  if (reporterName) payload.reporter_name = reporterName;
  if (impact) payload.impact = impact;

  return { ok: true, payload };
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Ingest authentication ────────────────────────────────────────────────────

let cachedIngestKey: string | null | undefined;

/**
 * Resolve the Mission Control ingest key. Preference order: the
 * SUPPORT_INGEST_SECRET function secret, then the vault-backed
 * public.support_ingest_key() RPC (service-role only — see the
 * support_ingest_key migration). Cached for the life of the instance; a
 * missing key does not block the ticket — Mission Control rate-limits and
 * marks unverified submissions itself.
 */
async function resolveIngestKey(): Promise<string | null> {
  if (cachedIngestKey !== undefined) return cachedIngestKey;
  const fromEnv = Deno.env.get("SUPPORT_INGEST_SECRET");
  if (fromEnv) {
    cachedIngestKey = fromEnv;
    return fromEnv;
  }
  try {
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data, error } = await db.rpc("support_ingest_key");
    if (error) throw error;
    cachedIngestKey = typeof data === "string" && data.length > 0 ? data : null;
  } catch (error) {
    console.error("support-ticket: ingest key lookup failed", error);
    cachedIngestKey = null;
  }
  return cachedIngestKey;
}

/** HMAC-SHA256 hex of `body` under `key` — Mission Control's x-support-signature scheme. */
async function hmacHex(key: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * IP throttle backed by `support_ticket_requests` (service role only; RLS with
 * no policies). The attempt is recorded BEFORE the forward so a failing
 * Mission Control does not grant unlimited retries. If the database itself is
 * unreachable the throttle fails OPEN: a support portal that refuses tickets
 * because its rate-limit store is down would be broken in the worst direction.
 */
async function checkThrottle(ipHash: string, workspaceId: string): Promise<Response | null> {
  try {
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const windows: Array<{ sinceMs: number; limit: number; retryAfter: number }> = [
      { sinceMs: SHORT_WINDOW_MS, limit: SHORT_WINDOW_LIMIT, retryAfter: SHORT_RETRY_SECONDS },
      { sinceMs: DAY_WINDOW_MS, limit: DAY_WINDOW_LIMIT, retryAfter: DAY_RETRY_SECONDS },
    ];
    for (const window of windows) {
      const since = new Date(Date.now() - window.sinceMs).toISOString();
      const { count, error } = await db
        .from("support_ticket_requests")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("created_at", since);
      if (error) throw error;
      if ((count ?? 0) >= window.limit) {
        return json({ ok: false, error: "throttled", retry_after_seconds: window.retryAfter }, 429);
      }
    }

    const { error: insertError } = await db
      .from("support_ticket_requests")
      .insert({ ip_hash: ipHash, workspace_id: workspaceId || null });
    if (insertError) throw insertError;
  } catch (error) {
    console.error("support-ticket: throttle check failed, failing open", error);
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // Status lookup for a submitted ticket ("where is my ticket?" nicety).
  if (req.method === "GET") {
    const incoming = new URL(req.url).searchParams;
    const search = new URLSearchParams();
    const reference = incoming.get("reference");
    const workspaceId = incoming.get("workspace_id");
    if (reference) search.set("reference", reference);
    if (workspaceId) search.set("workspace_id", workspaceId);
    const query = search.toString();
    return proxyToMc(MC_TICKETS_PATH, {
      method: "GET",
      search: query ? `?${query}` : "",
    });
  }

  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json({ ok: false, error: "payload_too_large" }, 413);
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  // Honeypot. The page already drops these without calling us; anything that
  // arrives here with the field filled is a bot posting directly. Answer 202
  // so the script believes it succeeded, and forward nothing.
  if (str(body.website)) return json({ ok: true, dropped: true }, 202);

  const parsed = parseTicket(body);
  if (!parsed.ok) {
    return json({ ok: false, error: "validation_failed", fields: parsed.fields }, 400);
  }

  // First hop of x-forwarded-for is the client; later hops are our own infra.
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const throttled = await checkThrottle(await sha256Hex(ip), parsed.payload.workspace_id);
  if (throttled) return throttled;

  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
  };
  // Sign the exact bytes we send. Mission Control verifies x-support-signature
  // against the support-portal intake source's HMAC secret when one is set;
  // the shared-secret header is kept so deployments still on that auth mode
  // keep working. Same key either way.
  const bodyText = JSON.stringify(parsed.payload);
  const ingestKey = await resolveIngestKey();
  if (ingestKey) {
    headers["x-support-signature"] = `sha256=${await hmacHex(ingestKey, bodyText)}`;
    headers["x-aurixa-support-secret"] = ingestKey;
  }

  // Not proxyToMc: this leg carries the ingest auth and a no-store response,
  // neither of which the generic helper does. Status and body are relayed as
  // Mission Control produced them (201 receipt, 400 fields, 429 retry-after).
  try {
    const res = await fetch(`${MC_URL}${MC_TICKETS_PATH}`, {
      method: "POST",
      headers,
      body: bodyText,
    });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { ...CORS, "content-type": "application/json", "cache-control": "no-store" },
    });
  } catch (_e) {
    return json({ ok: false, error: "mission_control_unreachable" }, 502);
  }
});
