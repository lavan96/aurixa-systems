/**
 * Wires the Stage 3 admission rules to the scenario that decides them.
 *
 * Only the endpoint lives here, so `strategicReviewAccess.ts` stays free of
 * anything a bundler has to resolve and its rules can be tested directly.
 */

import { requestAccessDecision, type AccessDecision } from "./strategicReviewAccess";

/** The "Aurixa Stage 3 Access" scenario: looks a reference up and answers yes or no. */
export const STAGE_THREE_ACCESS_URL = "https://hook.eu2.make.com/72awi6bckbib4axien3u6sqibbdhht29";

export function verifyStrategicReviewAccess(
  reference: string,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<AccessDecision> {
  return requestAccessDecision({ endpoint: STAGE_THREE_ACCESS_URL, reference, ...options });
}
