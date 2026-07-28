/**
 * POST /api/priority-access/submit
 *
 * Same-origin Stage 1 submission. The browser no longer talks to Make.com
 * directly: it posts the form values here, this endpoint re-validates them,
 * forwards the approved payload to the existing Stage 1 Make.com webhook, and
 * only once Make.com confirms receipt does it mint the short-lived Stage 2
 * session cookie.
 *
 * The Stage 1 payload mapping is preserved *by construction* — the exact same
 * `buildWaitlistPayload` the browser used is called here, so the Make.com →
 * Airtable field names, option slugs, attribution and consent values cannot
 * drift. Nothing about the Stage 1 form, its questions, its order or its
 * validation rules changes.
 *
 * Failure of the session step must never lose an application: if Make.com has
 * accepted the submission the response still reports success, with
 * `questionnaireSessionCreated: false`, and the Stage 1 page falls back to its
 * existing confirmation screen.
 */

import {
  buildWaitlistPayload,
  validateWaitlistForm,
  cleanTextValue,
  cleanEmailValue,
  EMPTY_WAITLIST_FORM,
  type WaitlistFormValues,
} from "../../src/lib/waitlist";
import { isSameOrigin, isSecureContext, readJsonBody, sendJson, type ApiRequest, type ApiResponse } from "../_lib/http";
import { sealSession, serialiseSessionCookie } from "../_lib/session";

/** The existing Stage 1 scenario. Overridable by env; default is unchanged. */
const MAKE_WAITLIST_WEBHOOK_URL =
  process.env.MAKE_WAITLIST_WEBHOOK_URL ??
  "https://hook.eu2.make.com/589rb23xwbgovfj3iuemtcuxm75cccut";

const MAKE_TIMEOUT_MS = 15_000;

/** Application references are AX-XXXXXXXXXX (section 13.3) — non-sequential. */
const APPLICATION_ID_PATTERN = /^AX-[A-Z0-9]{10}$/;

const ATTRIBUTION_KEYS = [
  "source",
  "page",
  "landingPage",
  "referrer",
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "utmTerm",
  "utmContent",
] as const;

/** Rebuilds the form values from the request, coercing every field to its type. */
function readFormValues(raw: unknown): WaitlistFormValues {
  const input = (raw ?? {}) as Record<string, unknown>;
  const text = (key: keyof WaitlistFormValues) =>
    typeof input[key] === "string" ? (input[key] as string).slice(0, 2000) : "";

  return {
    ...EMPTY_WAITLIST_FORM,
    firstName: text("firstName"),
    lastName: text("lastName"),
    workEmail: text("workEmail"),
    mobileNumber: text("mobileNumber"),
    organisationName: text("organisationName"),
    role: text("role"),
    organisationType: text("organisationType"),
    annualVolume: text("annualVolume"),
    currentTechStackBottlenecks: text("currentTechStackBottlenecks"),
    improvementAreas: Array.isArray(input.improvementAreas)
      ? (input.improvementAreas as unknown[])
          .filter((value): value is string => typeof value === "string")
          .slice(0, 10)
      : [],
    additionalNotes: text("additionalNotes"),
    privacyAcknowledged: input.privacyAcknowledged === true,
    marketingConsent: input.marketingConsent === true,
  };
}

function readAttribution(raw: unknown): Record<string, string> {
  const input = (raw ?? {}) as Record<string, unknown>;
  const attribution: Record<string, string> = {};
  for (const key of ATTRIBUTION_KEYS) {
    if (typeof input[key] === "string") {
      attribution[key] = cleanTextValue(input[key] as string).slice(0, 500);
    }
  }
  return attribution;
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    return sendJson(res, 405, { success: false, error: "method_not_allowed" });
  }
  if (!isSameOrigin(req)) return sendJson(res, 403, { success: false, error: "forbidden" });

  const body = await readJsonBody(req);
  if (!body) return sendJson(res, 400, { success: false, error: "invalid_request" });

  const applicationId = typeof body.applicationId === "string" ? body.applicationId : "";
  if (!APPLICATION_ID_PATTERN.test(applicationId)) {
    return sendJson(res, 400, { success: false, error: "invalid_application_reference" });
  }

  // Server-side validation of the same rules the browser applied. The browser
  // is a convenience; this is the authoritative check.
  const values = readFormValues(body.values);
  const fieldErrors = validateWaitlistForm(values);
  if (Object.keys(fieldErrors).length > 0) {
    return sendJson(res, 422, { success: false, error: "validation_failed", fields: Object.keys(fieldErrors) });
  }

  // Identical mapping to the current browser submission — same builder, so the
  // existing Make.com scenario and Airtable columns are untouched.
  const payload = buildWaitlistPayload(values, applicationId, readAttribution(body.attribution) as never);

  let makeAccepted = false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MAKE_TIMEOUT_MS);
    try {
      const response = await fetch(MAKE_WAITLIST_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Existing idempotency key — repeated deliveries of the same
          // application collapse to a single record downstream.
          "X-Application-Id": applicationId,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      makeAccepted = response.ok;
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    makeAccepted = false;
  }

  if (!makeAccepted) {
    // Stage 1 was not recorded, so no session is created and no modal is shown.
    return sendJson(res, 502, { success: false, error: "submission_failed" });
  }

  // Stage 1 is recorded. From here the application is safe regardless of what
  // happens to the session.
  let questionnaireSessionCreated = false;
  const cookies: string[] = [];

  try {
    const sealed = sealSession(
      {
        applicationId,
        firstName: cleanTextValue(values.firstName),
        lastName: cleanTextValue(values.lastName),
        workEmail: cleanEmailValue(values.workEmail),
        organisationName: cleanTextValue(values.organisationName),
        role: values.role,
        organisationType: values.organisationType,
        annualVolume: values.annualVolume,
      },
      process.env.READINESS_SESSION_SECRET,
    );
    cookies.push(serialiseSessionCookie(sealed, { secure: isSecureContext(req) }));
    questionnaireSessionCreated = true;
  } catch {
    // READINESS_SESSION_SECRET is not configured. The application still stands;
    // the applicant simply does not get the immediate Stage 2 handoff.
    questionnaireSessionCreated = false;
  }

  return sendJson(
    res,
    200,
    {
      success: true,
      applicationId,
      stageOneReceived: true,
      questionnaireSessionCreated,
    },
    cookies,
  );
}
