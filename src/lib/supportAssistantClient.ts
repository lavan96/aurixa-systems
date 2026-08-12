/**
 * Support assistant transport.
 *
 * Thin: payload shape, answer formatting and section sanitising all live in
 * `supportAssistant.ts`. This module only maps transport outcomes onto the
 * four states the chat panel renders — answered, throttled, rejected,
 * unavailable — and carries the fire-and-forget feedback ping.
 *
 * A slow answer is an unavailable answer: the ask request is abandoned after
 * 15 seconds so the visitor is offered the ticket form instead of a spinner.
 */

import { STOREFRONT_BASE } from "./leads";
import {
  parseAssistantMode,
  parseGuideSections,
  type AssistantMode,
  type GuideSection,
  type SupportAssistantAskPayload,
} from "./supportAssistant";

const ASSISTANT_URL = `${STOREFRONT_BASE}/support-assistant`;
const ASK_TIMEOUT_MS = 15_000;

export type AskResult =
  | {
      ok: true;
      mode: AssistantMode;
      answerMarkdown: string;
      sections: GuideSection[];
      escalate: boolean;
      escalateReason: string | null;
    }
  | { ok: false; kind: "throttled"; retryAfterSeconds?: number }
  | { ok: false; kind: "invalid" }
  | { ok: false; kind: "unavailable" };

export async function askSupportAssistant(
  payload: SupportAssistantAskPayload,
): Promise<AskResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ASK_TIMEOUT_MS);
  try {
    const response = await fetch(ASSISTANT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (response.ok) {
      if (body.ok === true && typeof body.answer_markdown === "string") {
        return {
          ok: true,
          mode: parseAssistantMode(body.mode),
          answerMarkdown: body.answer_markdown,
          sections: parseGuideSections(body.sections),
          escalate: body.escalate === true,
          escalateReason:
            typeof body.escalate_reason === "string" && body.escalate_reason.trim()
              ? body.escalate_reason.trim()
              : null,
        };
      }
      // A 200 whose body is not the contract is a broken deploy, not an answer.
      return { ok: false, kind: "unavailable" };
    }

    if (response.status === 429) {
      const retry = body.retry_after_seconds;
      return {
        ok: false,
        kind: "throttled",
        retryAfterSeconds: typeof retry === "number" && retry > 0 ? retry : undefined,
      };
    }

    if (response.status === 400) {
      return { ok: false, kind: "invalid" };
    }

    return { ok: false, kind: "unavailable" };
  } catch {
    // Network failure or the 15s abort — either way, unavailable.
    return { ok: false, kind: "unavailable" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fire-and-forget "did this help" ping. Must never affect the visitor's
 * experience: failures are swallowed, and `keepalive` lets it outlive the
 * page if they close the tab straight after clicking.
 */
export function sendAssistantFeedback(helped: boolean, mode: AssistantMode): void {
  try {
    void fetch(ASSISTANT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "feedback", helped, mode }),
      keepalive: true,
    }).catch(() => {
      // Fire-and-forget by contract.
    });
  } catch {
    // Fire-and-forget by contract.
  }
}
