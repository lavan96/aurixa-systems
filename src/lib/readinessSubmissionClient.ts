/**
 * Wires a completed Stage 2 questionnaire to the systems that need to know.
 *
 * The Stage 2 Make webhook remains the transport of record — it is the
 * pipeline the response actually travels down (the Business Readiness tables,
 * the link back to the applicant's waitlist record, the Stage 3 gate and the
 * invitation email), and the applicant's result reflects it alone.
 *
 * What was missing is everything after it. Stage 1 mirrors to `capture-lead`
 * and Mission Control; Stage 3 does too. Stage 2 did neither, so the operator
 * console showed an applicant sitting at "new" indefinitely while they had, in
 * fact, answered forty questions about their business and named a budget. This
 * closes that gap with the same fire-and-forget contract the other two stages
 * use: the mirrors run only after the webhook has already succeeded, and a
 * failure in one can never reach the applicant.
 *
 * Everything configuration- or network-shaped lives here so
 * `readinessSubmission.ts` stays free of `import.meta.env` and its rules stay
 * testable outside a bundler.
 */

import { STOREFRONT_BASE, mirrorLeadToMissionControl } from "./leads";
import {
  buildReadinessMirrorPayload,
  submitReadinessQuestionnaire,
  type ReadinessSubmissionResult,
} from "./readinessSubmission";

type SubmitInput = Parameters<typeof submitReadinessQuestionnaire>[0];

/** Fire-and-forget mirror: a failure here must never reach the applicant. */
function mirror(endpoint: string, body: Record<string, unknown>, label: string): void {
  try {
    void fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Application-Id": String(body.applicationId ?? ""),
      },
      body: JSON.stringify(body),
      // Let the request outlive the page if the applicant navigates away.
      keepalive: true,
    }).catch((error) => console.warn(`${label} mirror failed (non-blocking)`, error));
  } catch (error) {
    console.warn(`${label} mirror failed (non-blocking)`, error);
  }
}

/**
 * Submits the questionnaire and, once that has landed, mirrors the same
 * response to Aurixa's own store of record and the operator console.
 */
export async function submitReadinessQuestionnaireWithMirrors(
  input: SubmitInput,
): Promise<ReadinessSubmissionResult> {
  const result = await submitReadinessQuestionnaire(input);
  if (!result.ok || !result.payload) return result;

  const body = buildReadinessMirrorPayload(result.payload);
  mirror(`${STOREFRONT_BASE}/capture-lead`, body, "Readiness capture-lead");
  mirrorLeadToMissionControl(body);

  return result;
}
