/**
 * Stage 3 admission.
 *
 * The scheduling page is not public. An applicant reaches it with the
 * application reference issued at Stage 1, and the reference is checked against
 * Aurixa's own records before the page shows anything at all.
 *
 * The check is deliberately a *server* decision. A rule evaluated in the
 * browser is not a gate — the bundle ships to the visitor, who can edit it — so
 * the page asks the "Aurixa Stage 3 Access" scenario and renders the scheduler
 * only if that answers yes. The admission policy itself is not in this file
 * either: it is the `Stage 3 Access` formula on the Aurixa Waitlist table, and
 * the Airtable query filters on it, so a reference the policy denies is never
 * even read back, let alone returned.
 *
 * Failures are deliberately indistinguishable. An unknown reference, a
 * reference belonging to a declined application and a reference belonging to
 * somebody else all come back the same way, so the page can never be used to
 * discover whether a particular application exists.
 *
 * Everything here is pure or takes its `fetch` as an argument, so the rules are
 * testable without a browser; the endpoint lives in `strategicReviewAccessClient`.
 */

import { normaliseReference } from "./applicationReference";

export const DEFAULT_ACCESS_TIMEOUT_MS = 15_000;

/** Verified Stage 1 details, returned by the server — never taken from the URL. */
export type StrategicReviewApplicant = {
  applicationId: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  organisationName: string;
};

/**
 * Why the page stayed locked.
 *
 * `unverified` covers every "we will not let you in" case on purpose. Only
 * `unavailable` is different, because it is not about the reference at all —
 * it means we could not reach the service, and trying again may well work.
 */
export type AccessFailure = "missing_reference" | "unverified" | "unavailable";

export type AccessDecision = {
  granted: boolean;
  applicant?: StrategicReviewApplicant;
  reason?: AccessFailure;
};

export const ACCESS_COPY: Record<AccessFailure, string> = {
  missing_reference:
    "This page is part of an Aurixa priority access application. Open it from the link in your Aurixa email, or continue with the application reference issued with your application.",
  unverified:
    "We could not verify that application reference. Check it against your Aurixa confirmation email, or contact the team and quote it.",
  unavailable:
    "We could not reach the Aurixa application service just now. Please try again in a moment.",
};

const text = (value: unknown): string => (typeof value === "string" ? value : "");

/**
 * Reads the server's verdict.
 *
 * Anything unexpected is a refusal, not an opening: a truncated body, a
 * non-object, `ok` that is merely truthy rather than `true`, or a grant whose
 * application id does not match the reference we asked about.
 */
export function parseAccessDecision(body: string, requestedReference: string): AccessDecision {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { granted: false, reason: "unavailable" };
  }
  // An array is `typeof "object"` but is not an answer to the question asked.
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { granted: false, reason: "unavailable" };
  }

  const result = parsed as Record<string, unknown>;
  if (result.ok !== true) return { granted: false, reason: "unverified" };

  const applicant = (result.applicant ?? {}) as Record<string, unknown>;
  const applicationId = normaliseReference(text(applicant.applicationId));
  // A grant has to be for the reference we asked about. If it is not, something
  // is wrong at the other end and the safe reading is "no".
  if (!applicationId || applicationId !== normaliseReference(requestedReference)) {
    return { granted: false, reason: "unverified" };
  }

  return {
    granted: true,
    applicant: {
      applicationId,
      firstName: text(applicant.firstName).trim(),
      lastName: text(applicant.lastName).trim(),
      workEmail: text(applicant.workEmail).trim(),
      organisationName: text(applicant.organisationName).trim(),
    },
  };
}

export type AccessRequestInput = {
  endpoint: string;
  reference: string;
  /** Test seam; production always uses the browser fetch implementation. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

/**
 * Asks the server whether this reference may open Stage 3.
 *
 * A malformed reference is refused here without a request: there is nothing to
 * check, and there is no reason to hand an obviously invalid value to a
 * scenario that costs an operation to run.
 */
export async function requestAccessDecision(input: AccessRequestInput): Promise<AccessDecision> {
  const reference = normaliseReference(input.reference);
  if (!reference) return { granted: false, reason: "missing_reference" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? DEFAULT_ACCESS_TIMEOUT_MS);

  try {
    const response = await (input.fetchImpl ?? fetch)(input.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: reference }),
      signal: controller.signal,
      // The verdict is per-applicant and must never be served from a cache.
      cache: "no-store",
      credentials: "omit",
    });
    if (!response.ok) return { granted: false, reason: "unavailable" };
    return parseAccessDecision(await response.text(), reference);
  } catch {
    return { granted: false, reason: "unavailable" };
  } finally {
    clearTimeout(timeout);
  }
}
