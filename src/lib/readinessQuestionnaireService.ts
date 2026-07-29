/**
 * Stage 2 questionnaire service client.
 *
 * The browser never holds a privileged key and never writes questionnaire
 * responses directly to a database. Everything goes through the
 * `readiness-questionnaire` edge function, which owns token verification,
 * session issuance, autosave and completion (sections 13.3 and 14.3).
 *
 * Access model:
 *   1. The applicant arrives with an opaque, signed, time-bound token issued
 *      with their Priority Access Application. Only the token appears in the
 *      URL — never a name, email, organisation or database id.
 *   2. `authoriseQuestionnaire` exchanges it for a short-lived session token
 *      plus the verified Stage 1 prefill and any existing draft.
 *   3. The raw token is then removed from the visible URL by the page.
 *   4. Autosave and completion authenticate with the session token only.
 *
 * The service deliberately returns the same `invalid_token` outcome for an
 * unknown token, a revoked token and a token belonging to somebody else, so the
 * response never reveals whether a particular application or email exists.
 */

import { AnswerMap, QUESTIONNAIRE_VERSION, StoredAnswer } from "./readinessQuestionnaire";
import { STOREFRONT_BASE } from "./leads";
import { clearReadinessHandoff } from "./readinessHandoff";

const READINESS_API_URL = (() => {
  const explicit = import.meta.env.VITE_READINESS_API_URL as string | undefined;
  if (explicit) return explicit.replace(/\/+$/, "");
  return `${STOREFRONT_BASE}/readiness-questionnaire`;
})();

/** Verified Stage 1 details, returned by the server — never taken from the URL. */
export type ReadinessPrefill = {
  applicationId: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  organisationName: string;
  role: string;
  organisationType: string;
  annualVolume: string;
};

export type ReadinessStatus = "not_started" | "in_progress" | "completed";

/**
 * How the current session was authorised:
 *   `token`   — a secure questionnaire link: prefill, draft resume and autosave.
 *   `handoff` — the same-tab Stage 1 → Stage 2 handoff: prefill, no server
 *               draft store yet, so no autosave.
 *   `open`    — the explicit open-access escape hatch: neither.
 */
export type ReadinessAccessMode = "token" | "handoff" | "open";

export type ReadinessSession = {
  access: ReadinessAccessMode;
  /** Opaque session reference. Held in memory only — never persisted client-side. */
  sessionToken: string;
  applicationId: string;
  questionnaireVersion: string;
  responseVersion: number;
  status: ReadinessStatus;
  startedAt: string | null;
  lastSavedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  prefill: ReadinessPrefill;
  /** Draft answers already saved for this application. */
  answers: AnswerMap;
};

export type ReadinessAccessFailure =
  | "missing_token"
  | "invalid_token"
  | "expired_token"
  | "already_completed"
  | "unavailable";

/**
 * Result shapes use optional fields rather than a discriminated union: the
 * project compiles without `strictNullChecks`, where union narrowing on a
 * boolean discriminant is unreliable. Callers check `ok` and the field they
 * need together.
 */
export type AuthoriseResult = {
  ok: boolean;
  session?: ReadinessSession;
  reason?: ReadinessAccessFailure;
  completedAt?: string | null;
  applicationId?: string;
};

export type SaveResult = {
  ok: boolean;
  responseVersion?: number;
  lastSavedAt?: string;
  reason?: "unauthorised" | "conflict" | "unavailable";
};

export type CompleteResult = {
  ok: boolean;
  applicationId?: string;
  completedAt?: string;
  responseVersion?: number;
  reason?: "unauthorised" | "already_completed" | "invalid" | "unavailable" | "not_configured";
};

/**
 * Escape hatch that drops the access requirement entirely.
 *
 * OFF by default: `/questionnaire` is reachable through the Stage 1 handoff
 * session or a secure questionnaire link, and direct visitors see the locked
 * screen. Set `VITE_QUESTIONNAIRE_OPEN_ACCESS="true"` only to expose the page
 * deliberately — for stakeholder review, for instance.
 */
export const allowsOpenAccess = () =>
  (import.meta.env.VITE_QUESTIONNAIRE_OPEN_ACCESS as string | undefined) === "true";

// ── Same-tab Stage 1 → Stage 2 handoff ──────────────────────────────────────

/** Invalidates the handoff after Stage 2 has been submitted successfully. */
export function endHandoffSession(): void {
  clearReadinessHandoff();
}

/** Builds a questionnaire session from verified Stage 1 handoff details. */
export function handoffSession(prefill: ReadinessPrefill): ReadinessSession {
  return {
    access: "handoff",
    sessionToken: "",
    applicationId: prefill.applicationId,
    questionnaireVersion: QUESTIONNAIRE_VERSION,
    responseVersion: 1,
    status: "not_started",
    startedAt: null,
    lastSavedAt: null,
    completedAt: null,
    expiresAt: null,
    prefill,
    answers: {},
  };
}

/**
 * Open access, used while the token gate is off. There is no session, so there
 * is nothing to autosave against and no verified Stage 1 details to prefill —
 * the page states both plainly rather than implying persistence it does not
 * have.
 */
export function openAccessSession(): ReadinessSession {
  return {
    access: "open",
    sessionToken: "",
    applicationId: "",
    questionnaireVersion: QUESTIONNAIRE_VERSION,
    responseVersion: 1,
    status: "not_started",
    startedAt: null,
    lastSavedAt: null,
    completedAt: null,
    expiresAt: null,
    prefill: {
      applicationId: "",
      firstName: "",
      lastName: "",
      workEmail: "",
      organisationName: "",
      role: "",
      organisationType: "",
      annualVolume: "",
    },
    answers: {},
  };
}

/** Verified Stage 1 details are available to display and prefill. */
export const hasVerifiedPrefill = (session: ReadinessSession | null) =>
  session?.access === "token" || session?.access === "handoff";

/** A server-side draft store exists, so autosave and resume are real. */
export const canAutosave = (session: ReadinessSession | null) =>
  session?.access === "token" && Boolean(session.sessionToken);

/**
 * Development-only preview. Guarded by `import.meta.env.DEV`, which Vite
 * statically replaces with `false` in a production build so the branch — and
 * the fixture below — are removed by dead-code elimination. The fixture carries
 * no real applicant information.
 */
export const isPreviewAvailable = () => import.meta.env.DEV;

const PREVIEW_SESSION: ReadinessSession = {
  access: "token",
  sessionToken: "dev-preview-session",
  applicationId: "AX-DEVPREVIEW",
  questionnaireVersion: QUESTIONNAIRE_VERSION,
  responseVersion: 1,
  status: "not_started",
  startedAt: null,
  lastSavedAt: null,
  completedAt: null,
  expiresAt: null,
  prefill: {
    applicationId: "AX-DEVPREVIEW",
    firstName: "Preview",
    lastName: "Applicant",
    workEmail: "preview@example.invalid",
    organisationName: "Preview Organisation",
    role: "founder_director",
    organisationType: "buyers_agent",
    annualVolume: "26_to_75",
  },
  answers: {},
};

const REQUEST_TIMEOUT_MS = 15_000;

async function post<T>(action: string, body: Record<string, unknown>): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(READINESS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
      signal: controller.signal,
    });
    if (!response.ok && response.status >= 500) return null;
    return (await response.json()) as T;
  } catch {
    // Network, timeout or malformed response — the caller degrades gracefully.
    // Deliberately not logged: request bodies carry questionnaire answers.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

type AuthoriseResponse = {
  ok: boolean;
  error?: string;
  session?: ReadinessSession;
  completedAt?: string | null;
  applicationId?: string;
};

const ACCESS_FAILURES: ReadinessAccessFailure[] = [
  "missing_token",
  "invalid_token",
  "expired_token",
  "already_completed",
  "unavailable",
];

const toAccessFailure = (error: string | undefined): ReadinessAccessFailure =>
  ACCESS_FAILURES.includes(error as ReadinessAccessFailure)
    ? (error as ReadinessAccessFailure)
    : "invalid_token";

/** Exchanges a secure questionnaire token for an authorised session. */
export async function authoriseQuestionnaire(token: string): Promise<AuthoriseResult> {
  if (!token) return { ok: false, reason: "missing_token" };

  if (isPreviewAvailable() && token === "dev-preview") {
    return { ok: true, session: { ...PREVIEW_SESSION, answers: {} } };
  }

  const result = await post<AuthoriseResponse>("authorise", { token });
  if (!result) return { ok: false, reason: "unavailable" };
  if (!result.ok || !result.session) {
    return {
      ok: false,
      reason: toAccessFailure(result.error),
      completedAt: result.completedAt ?? null,
      applicationId: result.applicationId,
    };
  }
  return { ok: true, session: { ...result.session, access: "token" } };
}

/**
 * Autosaves the current draft. `responseVersion` is the version the client
 * believes it holds; the server rejects a stale write rather than overwriting a
 * newer draft saved from another device.
 */
export async function saveQuestionnaireDraft(input: {
  sessionToken: string;
  applicationId: string;
  responseVersion: number;
  answers: StoredAnswer[];
}): Promise<SaveResult> {
  // Open access: no session to save against. Answers stay in the page.
  if (!input.sessionToken) return { ok: false, reason: "unavailable" };

  if (isPreviewAvailable() && input.sessionToken === PREVIEW_SESSION.sessionToken) {
    return {
      ok: true,
      responseVersion: input.responseVersion + 1,
      lastSavedAt: new Date().toISOString(),
    };
  }

  const result = await post<{
    ok: boolean;
    error?: string;
    responseVersion?: number;
    lastSavedAt?: string;
  }>("save", {
    sessionToken: input.sessionToken,
    applicationId: input.applicationId,
    questionnaireVersion: QUESTIONNAIRE_VERSION,
    responseVersion: input.responseVersion,
    answers: input.answers,
    savedAt: new Date().toISOString(),
  });

  if (!result) return { ok: false, reason: "unavailable" };
  if (!result.ok || result.responseVersion === undefined) {
    return { ok: false, reason: result.error === "conflict" ? "conflict" : result.error === "unauthorised" ? "unauthorised" : "unavailable" };
  }
  return {
    ok: true,
    responseVersion: result.responseVersion,
    lastSavedAt: result.lastSavedAt ?? new Date().toISOString(),
  };
}

/**
 * Final submission. The server revalidates every active required answer,
 * freezes the response version and queues scoring and human review — none of
 * which is returned to, or computed in, the browser.
 */
export async function completeQuestionnaire(input: {
  sessionToken: string;
  applicationId: string;
  responseVersion: number;
  answers: StoredAnswer[];
  activeConditionalQuestionIds: string[];
}): Promise<CompleteResult> {
  // Open access: there is no authorised session and no issuance flow behind it,
  // so there is nothing to submit to. Say so rather than showing a completion
  // screen for a submission that was never received.
  if (!input.sessionToken) return { ok: false, reason: "not_configured" };

  if (isPreviewAvailable() && input.sessionToken === PREVIEW_SESSION.sessionToken) {
    return {
      ok: true,
      applicationId: input.applicationId,
      completedAt: new Date().toISOString(),
      responseVersion: input.responseVersion + 1,
    };
  }

  const result = await post<{
    ok: boolean;
    error?: string;
    applicationId?: string;
    completedAt?: string;
    responseVersion?: number;
  }>("complete", {
    sessionToken: input.sessionToken,
    applicationId: input.applicationId,
    questionnaireVersion: QUESTIONNAIRE_VERSION,
    responseVersion: input.responseVersion,
    answers: input.answers,
    activeConditionalQuestionIds: input.activeConditionalQuestionIds,
    completedAt: new Date().toISOString(),
  });

  if (!result) return { ok: false, reason: "unavailable" };
  if (!result.ok || !result.completedAt) {
    const reason =
      result.error === "already_completed"
        ? "already_completed"
        : result.error === "unauthorised"
          ? "unauthorised"
          : result.error === "invalid"
            ? "invalid"
            : "unavailable";
    return { ok: false, reason };
  }
  return {
    ok: true,
    applicationId: result.applicationId ?? input.applicationId,
    completedAt: result.completedAt,
    responseVersion: result.responseVersion ?? input.responseVersion + 1,
  };
}

/**
 * Section 13.4 events. Emitted server-side from the edge function so ordinary
 * analytics never carries free-text answers; this client-side helper only
 * reports the milestone reference values.
 */
export type ReadinessEvent =
  | { name: "readiness.started"; applicationId: string; questionnaireVersion: string; firstResponseAt: string }
  | {
      name: "readiness.completed";
      applicationId: string;
      questionnaireVersion: string;
      responseVersion: number;
      completedAt: string;
    };
