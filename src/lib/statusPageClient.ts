/**
 * Status page client. One GET against the status-summary edge function —
 * which serves a server-side cache of anonymized upstream states — plus
 * defensive normalization so a malformed payload degrades to "status
 * temporarily unavailable" rather than a broken page.
 */

import { STOREFRONT_BASE } from "./leads";
import {
  OVERALL_LABELS,
  STATUS_LABELS,
  isComponentStatus,
  type ComponentStatus,
  type StatusComponent,
  type StatusSummary,
} from "./statusPage";

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
    const body = (await response.json()) as Record<string, unknown>;
    if (body.ok !== true || !Array.isArray(body.components)) return { ok: false };

    const components: StatusComponent[] = [];
    for (const raw of body.components as Array<Record<string, unknown>>) {
      const status: ComponentStatus = isComponentStatus(raw.status) ? raw.status : "unknown";
      const history = Array.isArray(raw.history)
        ? (raw.history as Array<Record<string, unknown>>)
            .filter((h) => typeof h.date === "string")
            .map((h) => ({
              date: h.date as string,
              status: (isComponentStatus(h.status) ? h.status : "unknown") as ComponentStatus,
            }))
        : [];
      components.push({
        key: typeof raw.key === "string" ? raw.key : "",
        label: typeof raw.label === "string" ? raw.label : "Upstream service",
        description: typeof raw.description === "string" ? raw.description : "",
        status,
        status_label: STATUS_LABELS[status],
        checked_at: typeof raw.checked_at === "string" ? raw.checked_at : null,
        history,
      });
    }

    const overall: ComponentStatus = isComponentStatus(body.overall) ? body.overall : "unknown";
    return {
      ok: true,
      overall,
      overall_label: OVERALL_LABELS[overall],
      checked_at: typeof body.checked_at === "string" ? body.checked_at : null,
      stale: body.stale === true,
      components,
    };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}
