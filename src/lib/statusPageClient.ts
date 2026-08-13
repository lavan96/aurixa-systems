/**
 * Status page client. One GET against the status-summary edge function —
 * which serves a server-side cache of anonymized upstream states — then
 * `normalizeSummaryPayload` joins the payload's component keys back to the
 * roster copy and degrades anything malformed to "status temporarily
 * unavailable" rather than a broken page.
 */

import { STOREFRONT_BASE } from "./leads";
import { normalizeSummaryPayload, type StatusSummary } from "./statusPage";

export type StatusResult = StatusSummary | { ok: false };

const TIMEOUT_MS = 10_000;

export async function fetchStatusSummary(): Promise<StatusResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${STOREFRONT_BASE}/status-summary`, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false };
    return normalizeSummaryPayload(await response.json());
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}
