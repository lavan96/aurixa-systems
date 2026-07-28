// POST /readiness-questionnaire — Stage 2 Business Readiness Questionnaire
// service (sections 6, 13.3 and 14.3 of the operating model).
//
// Actions:
//   issue     — admin only (shared secret). Creates the Stage 1 snapshot and a
//               signed, time-bound questionnaire token. Returns the raw token
//               ONCE, for the transactional email. Never called by the browser.
//   authorise — exchanges a questionnaire token for a short-lived session,
//               the verified prefill, the existing draft and completion state.
//   save      — autosaves a draft against an authorised session.
//   complete  — revalidates every active required answer server-side, freezes
//               the response version, records completion and queues review.
//
// Security notes:
//   * Only SHA-256 hashes of the questionnaire token and the session token are
//     stored, so database access cannot be replayed as a link.
//   * Unknown, revoked and mismatched tokens all return the same
//     `invalid_token` response, so the endpoint never reveals whether a
//     particular application or email address exists.
//   * The score, priority class and tier recommendation are Stage 3 outputs.
//     They are never computed here and never returned to the browser.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-aurixa-admin-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json", "cache-control": "no-store" },
  });
}

const QUESTIONNAIRE_VERSION = "business-readiness-v1";
const TOKEN_TTL_DAYS = 21;
const SESSION_TTL_MINUTES = 120;
const MAX_ANSWERS = 200;
const MAX_TEXT_LENGTH = 750;

const db = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** URL-safe opaque token. 32 bytes of CSPRNG output — not derived from any id. */
function opaqueToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const str = (value: unknown, limit = 320): string =>
  typeof value === "string" ? value.trim().slice(0, limit) : "";

// ── Server-side required-answer rules ───────────────────────────────────────
//
// Mirrors src/lib/readinessQuestionnaire.ts. The browser validates for usability;
// this is the authoritative check. Keep the two in step when questions change —
// both are keyed by the same stable BRQ- identifiers and questionnaire version.

const ALWAYS_REQUIRED = [
  "BRQ-01",
  "BRQ-02",
  "BRQ-03",
  "BRQ-04",
  "BRQ-05",
  "BRQ-06",
  "BRQ-07",
  "BRQ-08",
  "BRQ-10",
  "BRQ-11",
  "BRQ-12",
  "BRQ-13",
  "BRQ-14",
  "BRQ-15",
];

const MIGRATION_FOLLOW_UP = [
  "basic_contacts",
  "client_pipeline",
  "documents_history",
  "templates_reports",
  "multiple_systems_complex",
];

type AnswerRow = { questionId: string; value: unknown; active: boolean };

const isEmpty = (value: unknown) =>
  value === null ||
  value === undefined ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

/** Returns the identifiers of active required answers that are missing or invalid. */
function missingRequiredAnswers(answers: AnswerRow[]): string[] {
  const active = new Map<string, unknown>();
  for (const answer of answers) {
    if (answer.active) active.set(answer.questionId, answer.value);
  }

  const missing: string[] = [];
  const require = (questionId: string) => {
    if (isEmpty(active.get(questionId))) missing.push(questionId);
  };

  for (const questionId of ALWAYS_REQUIRED) require(questionId);

  const list = (questionId: string): string[] => {
    const value = active.get(questionId);
    return Array.isArray(value) ? (value as string[]) : [];
  };
  const text = (questionId: string): string => {
    const value = active.get(questionId);
    return typeof value === "string" ? value : "";
  };

  if (text("BRQ-01") === "other") require("BRQ-01-OTHER");
  if (text("BRQ-02") === "other") require("BRQ-02-OTHER");

  const systems = list("BRQ-06");
  if (systems.includes("other")) require("BRQ-06-OTHER");
  if (systems.includes("no_central_system")) {
    require("BRQ-06A");
    if (list("BRQ-06A").includes("other")) require("BRQ-06A-OTHER");
  }

  const problems = list("BRQ-07");
  if (problems.length > 3) missing.push("BRQ-07");
  if (problems.includes("other")) require("BRQ-07-OTHER");

  const capabilities = list("BRQ-10");
  if (capabilities.length !== 5 || new Set(capabilities).size !== 5) missing.push("BRQ-10");

  if (list("BRQ-11").includes("telephony")) require("BRQ-11-PHONE-SYSTEM");

  if (list("BRQ-11").includes("custom_internal_system")) {
    require("BRQ-11-CUSTOM-NAME");
    require("BRQ-11-CUSTOM-API");
    require("BRQ-11-CUSTOM-WORKFLOW");
  }

  if (MIGRATION_FOLLOW_UP.includes(text("BRQ-12"))) {
    require("BRQ-12-SOURCES");
    require("BRQ-12-RECORDS");
    require("BRQ-12-DOCUMENTS");
    require("BRQ-12-TIMING");
  }

  return [...new Set(missing)];
}

/** Rejects an oversized or malformed answer set before it reaches the database. */
function normaliseAnswers(raw: unknown): AnswerRow[] | null {
  if (!Array.isArray(raw) || raw.length > MAX_ANSWERS) return null;

  const rows: AnswerRow[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") return null;
    const record = entry as Record<string, unknown>;
    const questionId = str(record.questionId, 64);
    if (!/^BRQ-[A-Z0-9-]+(:[a-z0-9_]+)?$/.test(questionId)) return null;

    let value = record.value;
    if (typeof value === "string") value = value.slice(0, MAX_TEXT_LENGTH);
    else if (Array.isArray(value)) {
      if (value.length > 40) return null;
      value = value.map((item) => (typeof item === "string" ? item.slice(0, 120) : item));
    } else if (value !== null && typeof value !== "number" && value !== undefined) {
      return null;
    }

    rows.push({ questionId, value: value ?? null, active: record.active !== false });
  }
  return rows;
}

// ── Session handling ────────────────────────────────────────────────────────

type Authorised = { applicationId: string; sessionId: string };

async function resolveSession(client: ReturnType<typeof db>, sessionToken: string): Promise<Authorised | null> {
  if (!sessionToken) return null;
  const hash = await sha256(sessionToken);

  const { data } = await client
    .from("readiness_sessions")
    .select("id, application_id, expires_at")
    .eq("session_hash", hash)
    .maybeSingle();

  if (!data) return null;
  if (new Date(data.expires_at).getTime() <= Date.now()) return null;
  return { applicationId: data.application_id, sessionId: data.id };
}

async function recordEvent(
  client: ReturnType<typeof db>,
  applicationId: string,
  name: string,
  payload: Record<string, unknown>,
) {
  // Reference values only — never free-text answers.
  await client.from("readiness_events").insert({ application_id: applicationId, name, payload });
}

// ── Actions ─────────────────────────────────────────────────────────────────

async function handleIssue(client: ReturnType<typeof db>, body: Record<string, unknown>, req: Request) {
  const secret = Deno.env.get("READINESS_ADMIN_SECRET");
  if (!secret || req.headers.get("x-aurixa-admin-secret") !== secret) {
    return json({ ok: false, error: "unauthorised" }, 401);
  }

  const applicationId = str(body.applicationId, 40);
  const workEmail = str(body.workEmail).toLowerCase();
  if (!applicationId || !workEmail.includes("@")) {
    return json({ ok: false, error: "invalid_request" }, 400);
  }

  const { error: applicationError } = await client.from("readiness_applications").upsert(
    {
      application_id: applicationId,
      first_name: str(body.firstName, 60),
      last_name: str(body.lastName, 60),
      work_email: workEmail,
      organisation_name: str(body.organisationName, 120),
      role: str(body.role, 60),
      organisation_type: str(body.organisationType, 60),
      annual_volume: str(body.annualVolume, 60),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "application_id" },
  );
  if (applicationError) return json({ ok: false, error: "storage_error" }, 500);

  // Reissue revokes any outstanding link for this application.
  await client
    .from("readiness_questionnaire_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("application_id", applicationId)
    .is("revoked_at", null);

  const token = opaqueToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 86_400_000).toISOString();
  const { data: tokenRow, error: tokenError } = await client
    .from("readiness_questionnaire_tokens")
    .insert({ application_id: applicationId, token_hash: await sha256(token), expires_at: expiresAt })
    .select("id")
    .single();
  if (tokenError) return json({ ok: false, error: "storage_error" }, 500);

  await recordEvent(client, applicationId, "readiness.link_issued", {
    tokenId: tokenRow.id,
    expiresAt,
    questionnaireVersion: QUESTIONNAIRE_VERSION,
  });

  // The raw token is returned exactly once, to the caller that will email it.
  return json({ ok: true, token, expiresAt });
}

async function handleAuthorise(client: ReturnType<typeof db>, body: Record<string, unknown>) {
  const token = str(body.token, 512);
  if (!token) return json({ ok: false, error: "missing_token" }, 400);

  const { data: tokenRow } = await client
    .from("readiness_questionnaire_tokens")
    .select("id, application_id, expires_at, revoked_at, use_count")
    .eq("token_hash", await sha256(token))
    .maybeSingle();

  // Unknown and revoked tokens share one response: the endpoint must not reveal
  // whether a given application exists.
  if (!tokenRow || tokenRow.revoked_at) return json({ ok: false, error: "invalid_token" }, 401);
  if (new Date(tokenRow.expires_at).getTime() <= Date.now()) {
    return json({ ok: false, error: "expired_token" }, 401);
  }

  const applicationId = tokenRow.application_id;

  const { data: application } = await client
    .from("readiness_applications")
    .select("application_id, first_name, last_name, work_email, organisation_name, role, organisation_type, annual_volume")
    .eq("application_id", applicationId)
    .maybeSingle();
  if (!application) return json({ ok: false, error: "invalid_token" }, 401);

  let { data: response } = await client
    .from("readiness_responses")
    .select("questionnaire_version, response_version, status, started_at, last_saved_at, completed_at")
    .eq("application_id", applicationId)
    .maybeSingle();

  if (!response) {
    const { data: created } = await client
      .from("readiness_responses")
      .insert({ application_id: applicationId, questionnaire_version: QUESTIONNAIRE_VERSION })
      .select("questionnaire_version, response_version, status, started_at, last_saved_at, completed_at")
      .single();
    response = created;
  }

  if (response?.status === "completed") {
    return json({
      ok: false,
      error: "already_completed",
      applicationId,
      completedAt: response.completed_at,
    });
  }

  const { data: answerRows } = await client
    .from("qualification_responses")
    .select("question_id, answer, active")
    .eq("application_id", applicationId);

  const answers: Record<string, unknown> = {};
  for (const row of answerRows ?? []) answers[row.question_id] = row.answer;

  const sessionToken = opaqueToken();
  const sessionExpiry = new Date(Date.now() + SESSION_TTL_MINUTES * 60_000).toISOString();
  const { error: sessionError } = await client.from("readiness_sessions").insert({
    token_id: tokenRow.id,
    application_id: applicationId,
    session_hash: await sha256(sessionToken),
    expires_at: sessionExpiry,
  });
  if (sessionError) return json({ ok: false, error: "unavailable" }, 500);

  await client
    .from("readiness_questionnaire_tokens")
    .update({ last_used_at: new Date().toISOString(), use_count: (tokenRow.use_count ?? 0) + 1 })
    .eq("id", tokenRow.id);

  return json({
    ok: true,
    session: {
      sessionToken,
      applicationId,
      questionnaireVersion: response?.questionnaire_version ?? QUESTIONNAIRE_VERSION,
      responseVersion: response?.response_version ?? 1,
      status: response?.status ?? "not_started",
      startedAt: response?.started_at ?? null,
      lastSavedAt: response?.last_saved_at ?? null,
      completedAt: response?.completed_at ?? null,
      expiresAt: sessionExpiry,
      prefill: {
        applicationId: application.application_id,
        firstName: application.first_name,
        lastName: application.last_name,
        workEmail: application.work_email,
        organisationName: application.organisation_name,
        role: application.role,
        organisationType: application.organisation_type,
        annualVolume: application.annual_volume,
      },
      answers,
    },
  });
}

async function handleSave(client: ReturnType<typeof db>, body: Record<string, unknown>) {
  const authorised = await resolveSession(client, str(body.sessionToken, 512));
  if (!authorised) return json({ ok: false, error: "unauthorised" }, 401);

  const answers = normaliseAnswers(body.answers);
  if (!answers) return json({ ok: false, error: "invalid" }, 400);

  const { data: response } = await client
    .from("readiness_responses")
    .select("response_version, status, started_at")
    .eq("application_id", authorised.applicationId)
    .maybeSingle();

  if (!response) return json({ ok: false, error: "unauthorised" }, 401);
  if (response.status === "completed") return json({ ok: false, error: "already_completed" }, 409);

  // Optimistic concurrency: a draft saved from another device wins.
  const clientVersion = typeof body.responseVersion === "number" ? body.responseVersion : 0;
  if (clientVersion !== response.response_version) {
    return json({ ok: false, error: "conflict", responseVersion: response.response_version }, 409);
  }

  const nextVersion = response.response_version + 1;
  const now = new Date().toISOString();

  if (answers.length > 0) {
    const { error } = await client.from("qualification_responses").upsert(
      answers.map((answer) => ({
        application_id: authorised.applicationId,
        question_id: answer.questionId,
        answer: answer.value,
        active: answer.active,
        response_version: nextVersion,
        questionnaire_version: QUESTIONNAIRE_VERSION,
        updated_at: now,
      })),
      { onConflict: "application_id,question_id" },
    );
    if (error) return json({ ok: false, error: "storage_error" }, 500);
  }

  const isFirstResponse = !response.started_at;
  const { error: updateError } = await client
    .from("readiness_responses")
    .update({
      response_version: nextVersion,
      status: "in_progress",
      started_at: response.started_at ?? now,
      last_saved_at: now,
      questionnaire_version: QUESTIONNAIRE_VERSION,
    })
    .eq("application_id", authorised.applicationId);
  if (updateError) return json({ ok: false, error: "storage_error" }, 500);

  if (isFirstResponse) {
    await recordEvent(client, authorised.applicationId, "readiness.started", {
      questionnaireVersion: QUESTIONNAIRE_VERSION,
      firstResponseAt: now,
    });
  }

  return json({ ok: true, responseVersion: nextVersion, lastSavedAt: now });
}

async function handleComplete(client: ReturnType<typeof db>, body: Record<string, unknown>) {
  const authorised = await resolveSession(client, str(body.sessionToken, 512));
  if (!authorised) return json({ ok: false, error: "unauthorised" }, 401);

  const answers = normaliseAnswers(body.answers);
  if (!answers) return json({ ok: false, error: "invalid" }, 400);

  const { data: response } = await client
    .from("readiness_responses")
    .select("response_version, status, started_at, completed_at")
    .eq("application_id", authorised.applicationId)
    .maybeSingle();
  if (!response) return json({ ok: false, error: "unauthorised" }, 401);

  // Duplicate final submission is refused, not silently repeated.
  if (response.status === "completed") {
    return json({ ok: false, error: "already_completed", completedAt: response.completed_at }, 409);
  }

  const missing = missingRequiredAnswers(answers);
  if (missing.length > 0) return json({ ok: false, error: "invalid", missing }, 400);

  const now = new Date().toISOString();
  const frozenVersion = response.response_version + 1;

  if (answers.length > 0) {
    const { error } = await client.from("qualification_responses").upsert(
      answers.map((answer) => ({
        application_id: authorised.applicationId,
        question_id: answer.questionId,
        answer: answer.value,
        active: answer.active,
        response_version: frozenVersion,
        questionnaire_version: QUESTIONNAIRE_VERSION,
        updated_at: now,
      })),
      { onConflict: "application_id,question_id" },
    );
    if (error) return json({ ok: false, error: "storage_error" }, 500);
  }

  const { error: freezeError } = await client
    .from("readiness_responses")
    .update({
      response_version: frozenVersion,
      status: "completed",
      started_at: response.started_at ?? now,
      last_saved_at: now,
      completed_at: now,
      questionnaire_version: QUESTIONNAIRE_VERSION,
    })
    .eq("application_id", authorised.applicationId)
    // Guards against two concurrent submissions both freezing the response.
    .eq("status", "in_progress");
  if (freezeError) return json({ ok: false, error: "storage_error" }, 500);

  // The link cannot be reused once the profile is submitted.
  await client
    .from("readiness_questionnaire_tokens")
    .update({ revoked_at: now })
    .eq("application_id", authorised.applicationId)
    .is("revoked_at", null);

  await recordEvent(client, authorised.applicationId, "readiness.completed", {
    questionnaireVersion: QUESTIONNAIRE_VERSION,
    responseVersion: frozenVersion,
    completedAt: now,
  });

  // Scoring and human review are queued from the readiness.completed event.
  // No score, tier or qualification outcome is returned to the applicant.
  return json({
    ok: true,
    applicationId: authorised.applicationId,
    completedAt: now,
    responseVersion: frozenVersion,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const client = db();

  switch (body.action) {
    case "issue":
      return handleIssue(client, body, req);
    case "authorise":
      return handleAuthorise(client, body);
    case "save":
      return handleSave(client, body);
    case "complete":
      return handleComplete(client, body);
    default:
      return json({ ok: false, error: "unknown_action" }, 400);
  }
});
