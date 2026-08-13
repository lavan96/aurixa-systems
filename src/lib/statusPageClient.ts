/**
 * Status page client. One GET against the status-summary edge function —
 * which serves a server-side cache of anonymized upstream states — then
 * `normalizeSummaryPayload` joins the payload's component keys back to the
 * roster copy and degrades anything malformed to "status temporarily
 * unavailable" rather than a broken page.
 */

import { STOREFRONT_BASE } from "./leads";
import {
  normalizeDayDetailPayload,
  normalizeSummaryPayload,
  type DayDetail,
  type StatusSummary,
} from "./statusPage";

export type StatusResult = StatusSummary | { ok: false };

const TIMEOUT_MS = 10_000;

async function getJson(url: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchStatusSummary(): Promise<StatusResult> {
  const body = await getJson(`${STOREFRONT_BASE}/status-summary`);
  return body === null ? { ok: false } : normalizeSummaryPayload(body);
}

/** Day drilldown: hour-by-hour checks and the incident windows that
 * touched one UTC day for one component. */
export async function fetchStatusDayDetail(componentKey: string, date: string): Promise<DayDetail> {
  const params = new URLSearchParams({ component: componentKey, date });
  const body = await getJson(`${STOREFRONT_BASE}/status-summary?${params}`);
  return body === null ? { ok: false } : normalizeDayDetailPayload(body);
}
