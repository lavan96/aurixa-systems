/**
 * Support Portal submission client.
 *
 * Thin: all rules live in `supportTicket.ts` and the server re-validates in
 * the `support-ticket` edge function, which forwards to Mission Control. This
 * module only maps transport outcomes onto the four states the page renders —
 * accepted, throttled, rejected-with-field-errors, unreachable.
 */

import { STOREFRONT_BASE } from "./leads";
import type { SupportTicketPayload } from "./supportTicket";

/** What Mission Control returns for an accepted ticket. */
export type SupportTicketReceipt = {
  reference: string;
  priority: string;
  status: string;
  sla_due_at?: string;
  /** "queued" | "human_review" | "none" — how Mission Control routed the ticket. */
  auto_remediation?: string;
};

export type SupportTicketResult =
  | { ok: true; ticket: SupportTicketReceipt | null }
  | { ok: false; kind: "throttled"; retryAfterSeconds?: number }
  | { ok: false; kind: "invalid"; fields?: Record<string, string> }
  | { ok: false; kind: "unreachable" };

export async function submitSupportTicket(
  payload: SupportTicketPayload,
): Promise<SupportTicketResult> {
  try {
    const response = await fetch(`${STOREFRONT_BASE}/support-ticket`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (response.ok) {
      const ticket = body.ticket as SupportTicketReceipt | undefined;
      return { ok: true, ticket: ticket ?? null };
    }

    if (response.status === 429) {
      const retry = body.retry_after_seconds;
      return {
        ok: false,
        kind: "throttled",
        retryAfterSeconds: typeof retry === "number" ? retry : undefined,
      };
    }

    if (response.status === 400 && body.error === "validation_failed") {
      const fields = body.fields;
      return {
        ok: false,
        kind: "invalid",
        fields:
          fields && typeof fields === "object"
            ? (fields as Record<string, string>)
            : undefined,
      };
    }

    return { ok: false, kind: "unreachable" };
  } catch {
    return { ok: false, kind: "unreachable" };
  }
}
