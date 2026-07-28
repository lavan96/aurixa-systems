/**
 * Stage 1 submission client.
 *
 * Posts the form values to the same-origin `/api/priority-access/submit`
 * endpoint, which re-validates them, forwards the approved payload to the
 * existing Stage 1 Make.com webhook and — only once Make.com has accepted —
 * mints the short-lived Stage 2 session cookie.
 *
 * The endpoint may legitimately not exist yet: this project is a static SPA
 * with a catch-all rewrite, so an undeployed function answers with `index.html`
 * and a 200. That is detected and reported as `api_unavailable`, and the page
 * falls back to the current direct-to-Make.com submission so an application is
 * never lost. The fallback affects delivery only — it never grants Stage 2
 * access, which requires the server-issued cookie.
 */

import { WaitlistFormValues, WaitlistAttribution } from "./waitlist";

export const PRIORITY_ACCESS_SUBMIT_URL = "/api/priority-access/submit";

export type PriorityAccessResult = {
  /** Stage 1 was accepted by Make.com. */
  stageOneReceived: boolean;
  /** A Stage 2 session cookie was issued — the handoff modal may be shown. */
  questionnaireSessionCreated: boolean;
  applicationId?: string;
  /**
   * `api_unavailable` — the same-origin endpoint is not deployed.
   * `submission_failed` — the endpoint ran but Make.com did not accept.
   * `validation_failed` — server-side validation rejected the payload.
   */
  error?: "api_unavailable" | "submission_failed" | "validation_failed";
};

const REQUEST_TIMEOUT_MS = 20_000;

export async function submitPriorityAccess(input: {
  applicationId: string;
  values: WaitlistFormValues;
  attribution: WaitlistAttribution;
}): Promise<PriorityAccessResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(PRIORITY_ACCESS_SUBMIT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // The Set-Cookie on the response must be stored by the browser.
      credentials: "same-origin",
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    // A catch-all SPA rewrite answers 200 with HTML when the function is not
    // deployed. Anything that is not JSON means "no endpoint here".
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return { stageOneReceived: false, questionnaireSessionCreated: false, error: "api_unavailable" };
    }

    const body = (await response.json()) as {
      success?: boolean;
      applicationId?: string;
      stageOneReceived?: boolean;
      questionnaireSessionCreated?: boolean;
      error?: string;
    };

    if (response.status === 404 || response.status === 405) {
      return { stageOneReceived: false, questionnaireSessionCreated: false, error: "api_unavailable" };
    }

    if (!response.ok || !body.success) {
      return {
        stageOneReceived: false,
        questionnaireSessionCreated: false,
        error: body.error === "validation_failed" ? "validation_failed" : "submission_failed",
      };
    }

    return {
      stageOneReceived: body.stageOneReceived === true,
      questionnaireSessionCreated: body.questionnaireSessionCreated === true,
      applicationId: body.applicationId,
    };
  } catch {
    // Network failure or timeout. Deliberately not logged — the request body
    // carries the applicant's personal information.
    return { stageOneReceived: false, questionnaireSessionCreated: false, error: "api_unavailable" };
  } finally {
    clearTimeout(timeout);
  }
}
