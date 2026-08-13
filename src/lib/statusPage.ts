/**
 * Status page — shared vocabulary and pure rules.
 *
 * The status page reports the health of the upstream services Aurixa
 * depends on WITHOUT naming them: each provider appears only as its role
 * ("Backend platform", never the vendor). All vendor polling happens
 * server-side in the status-summary edge function; this module holds what
 * both sides share — the normalized status vocabulary, severity ordering,
 * overall-state computation, display copy, the daily history rollup, and
 * the payload normalizer — so the page and the function cannot drift, and
 * so the anonymity rule is testable (see statusPage.test.ts, which asserts
 * no vendor name ever appears in public-facing copy).
 *
 * The server deliberately sends NO display copy — only component keys and
 * normalized statuses. `normalizeSummaryPayload` below joins those keys
 * back to the roster. That join is load-bearing: the first deploy skipped
 * it and every live row rendered as a generic "Upstream service", which is
 * exactly the failure the regression test now pins.
 */

export const COMPONENT_STATUSES = [
  "operational",
  "maintenance",
  "degraded",
  "partial_outage",
  "major_outage",
  "unknown",
] as const;
export type ComponentStatus = (typeof COMPONENT_STATUSES)[number];

/** Higher = worse. `unknown` ranks below any confirmed problem: a provider
 * we cannot read is not evidence of an outage, and the overall banner must
 * not scream red because one status API changed shape. */
const SEVERITY_RANK: Record<ComponentStatus, number> = {
  operational: 0,
  unknown: 1,
  maintenance: 2,
  degraded: 3,
  partial_outage: 4,
  major_outage: 5,
};

export function severityRank(status: ComponentStatus): number {
  return SEVERITY_RANK[status] ?? SEVERITY_RANK.unknown;
}

export const STATUS_LABELS: Record<ComponentStatus, string> = {
  operational: "Operational",
  maintenance: "Planned maintenance",
  degraded: "Degraded performance",
  partial_outage: "Partial outage",
  major_outage: "Major outage",
  unknown: "Status unavailable",
};

export const OVERALL_LABELS: Record<ComponentStatus, string> = {
  operational: "All systems operational",
  maintenance: "Planned maintenance in progress",
  degraded: "Degraded performance at one of our providers",
  partial_outage: "Partial outage at one of our providers",
  major_outage: "Major outage at one of our providers",
  unknown: "Status temporarily unavailable",
};

export type StatusComponent = {
  key: string;
  label: string;
  description: string;
  /** Aurixa features a problem here can touch — roster copy, never server data. */
  affects: readonly string[];
  status: ComponentStatus;
  status_label: string;
  checked_at: string | null;
  /** Percent of readable checks that were healthy in the observed window, or null. */
  uptime: number | null;
  /** First observation in the reporting window (ISO), or null. */
  since: string | null;
  history: Array<{ date: string; status: ComponentStatus }>;
};

/** Where an incident window came from: the provider's own published
 * record, or a run of our 5-minute checks. */
export type IncidentSource = "vendor_feed" | "observed";

export type ActiveIncident = {
  key: string;
  label: string;
  status: ComponentStatus;
  status_label: string;
  started_at: string | null;
  /** True when the provider's own feed currently lists an open incident. */
  confirmed: boolean;
};

export type ResolvedIncident = {
  key: string;
  label: string;
  worst_status: ComponentStatus;
  status_label: string;
  started_at: string | null;
  ended_at: string;
  source: IncidentSource;
};

export type StatusSummary = {
  ok: true;
  overall: ComponentStatus;
  overall_label: string;
  checked_at: string | null;
  stale: boolean;
  components: StatusComponent[];
  incidents: { active: ActiveIncident[]; resolved: ResolvedIncident[] };
};

export type DayDetailHour = { hour: number; status: ComponentStatus | "none"; checks: number };

export type DayDetailIncident = {
  source: IncidentSource;
  worst_status: ComponentStatus;
  status_label: string;
  started_at: string;
  ended_at: string | null;
};

export type DayDetail =
  | {
      ok: true;
      key: string;
      date: string;
      observed: boolean;
      day_status: ComponentStatus | null;
      checks: { total: number; healthy: number } | null;
      hours: DayDetailHour[];
      incidents: DayDetailIncident[];
    }
  | { ok: false };

/**
 * Overall = worst CONFIRMED state across components. Unknowns only decide
 * the banner when nothing at all is readable.
 */
export function computeOverall(statuses: ComponentStatus[]): ComponentStatus {
  if (statuses.length === 0) return "unknown";
  const known = statuses.filter((s) => s !== "unknown");
  if (known.length === 0) return "unknown";
  return known.reduce((worst, s) => (severityRank(s) > severityRank(worst) ? s : worst));
}

export function isComponentStatus(value: unknown): value is ComponentStatus {
  return typeof value === "string" && (COMPONENT_STATUSES as readonly string[]).includes(value);
}

/**
 * Collapse raw snapshots into one status per calendar day for the 30-day
 * history bars: worst CONFIRMED status wins, and `unknown` marks a day only
 * when not a single check that day was readable — one failed read out of a
 * day of healthy polls is not a grey day. Input rows may be in any order;
 * output is oldest → newest and capped to `days`.
 */
export function rollupDaily(
  rows: Array<{ date: string; status: ComponentStatus }>,
  days = 30,
): Array<{ date: string; status: ComponentStatus }> {
  const byDate = new Map<string, ComponentStatus>();
  for (const row of rows) {
    const existing = byDate.get(row.date);
    if (row.status === "unknown") {
      if (!existing) byDate.set(row.date, "unknown");
      continue;
    }
    if (!existing || existing === "unknown" || severityRank(row.status) > severityRank(existing)) {
      byDate.set(row.date, row.status);
    }
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-days)
    .map(([date, status]) => ({ date, status }));
}

/**
 * The public component roster. Keys and copy are the ONLY provider-related
 * strings that ever reach a browser; the vendor registry (real endpoints)
 * lives server-side in a service-role-only table. Order here is display
 * order. Descriptions say what each role does FOR AURIXA and what an
 * incident there can touch — role-based, but never interchangeable.
 */
export const STATUS_COMPONENT_ROSTER: Array<{
  key: string;
  label: string;
  description: string;
  affects: readonly string[];
}> = [
  {
    key: "backend",
    label: "Backend platform",
    description:
      "Runs our databases, sign-in and application APIs. An incident here can affect logging in, loading dashboards and saving changes.",
    affects: ["Sign-in", "Dashboards", "Data & APIs"],
  },
  {
    key: "security_delivery",
    label: "Edge security & delivery",
    description:
      "Sits in front of every request we serve — DNS, traffic protection and content delivery. An incident here can make our sites slow or unreachable.",
    affects: ["Site reachability", "Load times"],
  },
  {
    key: "web_hosting",
    label: "Web hosting",
    description:
      "Serves this website and the customer-facing portals. An incident here can stop pages loading.",
    affects: ["Website", "Customer portals"],
  },
  {
    key: "dev_platform",
    label: "Code & release pipeline",
    description:
      "Hosts our source code and powers releases. An incident here can delay fixes and updates, but never touches the running product.",
    affects: ["Release cadence only"],
  },
  {
    key: "ai_models",
    label: "AI models",
    description:
      "Runs the models behind AI features such as the Support Portal's screening assistant. An incident here can make AI answers slow or unavailable while everything else keeps working.",
    affects: ["Support assistant", "AI features"],
  },
  {
    key: "payments",
    label: "Payments",
    description:
      "Processes card payments and subscription billing. An incident here can affect checkout and plan changes; active services keep running.",
    affects: ["Checkout", "Billing"],
  },
  {
    key: "email_delivery",
    label: "Email delivery",
    description:
      "Sends our transactional email — receipts, invitations and notifications.",
    affects: ["Email notifications"],
  },
];

/** Shown only for a payload key the roster does not know. */
export const FALLBACK_COMPONENT_LABEL = "Monitored service";

/**
 * Tooltip for one history bar. Days before our own polling began are
 * reconstructed server-side from the provider's published incident history,
 * and their tooltips say so — reconstructed and observed days must never be
 * presented as the same kind of evidence.
 */
export function historyBarTitle(
  date: string,
  status: ComponentStatus,
  observedSince: string | null,
): string {
  const base = `${date} — ${STATUS_LABELS[status]}`;
  const observedDay = observedSince ? observedSince.slice(0, 10) : null;
  if (observedDay && date < observedDay) return `${base} — from the provider's published history`;
  return base;
}

function rosterLabel(key: string): string {
  return STATUS_COMPONENT_ROSTER.find((entry) => entry.key === key)?.label ?? FALLBACK_COMPONENT_LABEL;
}

function isIncidentSource(value: unknown): value is IncidentSource {
  return value === "vendor_feed" || value === "observed";
}

/** "moments" / "42m" / "3h 20m" / "2d 5h" — for incident durations. */
export function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 60_000) return "moments";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rem = minutes % 60;
    return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

/**
 * Turn the status-summary endpoint's JSON into a display-ready summary.
 *
 * The payload carries keys, statuses, timestamps and history — never copy.
 * Labels, descriptions and affected-features chips are joined from the
 * roster HERE, by key. Anything malformed degrades field-by-field (bad
 * status → "unknown", bad history rows dropped) and a payload that is not
 * a summary at all returns `{ ok: false }`.
 */
export function normalizeSummaryPayload(body: unknown): StatusSummary | { ok: false } {
  if (typeof body !== "object" || body === null) return { ok: false };
  const record = body as Record<string, unknown>;
  if (record.ok !== true || !Array.isArray(record.components)) return { ok: false };

  const components: StatusComponent[] = [];
  for (const raw of record.components as Array<unknown>) {
    if (typeof raw !== "object" || raw === null) continue;
    const item = raw as Record<string, unknown>;
    const key = typeof item.key === "string" ? item.key : "";
    const roster = STATUS_COMPONENT_ROSTER.find((entry) => entry.key === key);
    const status: ComponentStatus = isComponentStatus(item.status) ? item.status : "unknown";
    const history = Array.isArray(item.history)
      ? (item.history as Array<Record<string, unknown>>)
          .filter((h) => typeof h === "object" && h !== null && typeof h.date === "string")
          .map((h) => ({
            date: h.date as string,
            status: (isComponentStatus(h.status) ? h.status : "unknown") as ComponentStatus,
          }))
      : [];
    components.push({
      key,
      label: roster?.label ?? FALLBACK_COMPONENT_LABEL,
      description: roster?.description ?? "",
      affects: roster?.affects ?? [],
      status,
      status_label: STATUS_LABELS[status],
      checked_at: typeof item.checked_at === "string" ? item.checked_at : null,
      uptime:
        typeof item.uptime === "number" && Number.isFinite(item.uptime)
          ? Math.min(100, Math.max(0, item.uptime))
          : null,
      since: typeof item.since === "string" ? item.since : null,
      history,
    });
  }

  // The anonymized incident block (jumbotron data). Absent or malformed
  // sections degrade to empty lists, never a broken page.
  const rawIncidents = (record.incidents ?? {}) as Record<string, unknown>;
  const active: ActiveIncident[] = Array.isArray(rawIncidents.active)
    ? (rawIncidents.active as Array<Record<string, unknown>>)
        .filter((i) => typeof i === "object" && i !== null && typeof i.key === "string")
        .map((i) => {
          const status: ComponentStatus = isComponentStatus(i.status) ? i.status : "degraded";
          return {
            key: i.key as string,
            label: rosterLabel(i.key as string),
            status,
            status_label: STATUS_LABELS[status],
            started_at: typeof i.started_at === "string" ? i.started_at : null,
            confirmed: i.confirmed === true,
          };
        })
    : [];
  const resolved: ResolvedIncident[] = Array.isArray(rawIncidents.resolved)
    ? (rawIncidents.resolved as Array<Record<string, unknown>>)
        .filter(
          (i) =>
            typeof i === "object" && i !== null &&
            typeof i.key === "string" && typeof i.ended_at === "string",
        )
        .map((i) => {
          const status: ComponentStatus = isComponentStatus(i.worst_status) ? i.worst_status : "degraded";
          return {
            key: i.key as string,
            label: rosterLabel(i.key as string),
            worst_status: status,
            status_label: STATUS_LABELS[status],
            started_at: typeof i.started_at === "string" ? i.started_at : null,
            ended_at: i.ended_at as string,
            source: isIncidentSource(i.source) ? i.source : "observed",
          };
        })
    : [];

  const overall: ComponentStatus = isComponentStatus(record.overall) ? record.overall : "unknown";
  return {
    ok: true,
    overall,
    overall_label: OVERALL_LABELS[overall],
    checked_at: typeof record.checked_at === "string" ? record.checked_at : null,
    stale: record.stale === true,
    components,
    incidents: { active, resolved },
  };
}

/**
 * Normalize the day-drilldown payload (`?component=<key>&date=YYYY-MM-DD`).
 * Same posture as the summary: tolerate anything, never throw.
 */
export function normalizeDayDetailPayload(body: unknown): DayDetail {
  if (typeof body !== "object" || body === null) return { ok: false };
  const record = body as Record<string, unknown>;
  if (record.ok !== true || typeof record.key !== "string" || typeof record.date !== "string") {
    return { ok: false };
  }
  const hours: DayDetailHour[] = Array.isArray(record.hours)
    ? (record.hours as Array<Record<string, unknown>>)
        .filter((h) => typeof h === "object" && h !== null && typeof h.hour === "number")
        .map((h) => ({
          hour: h.hour as number,
          status: h.status === "none" ? "none" : isComponentStatus(h.status) ? h.status : "unknown",
          checks: typeof h.checks === "number" ? h.checks : 0,
        }))
    : [];
  const incidents: DayDetailIncident[] = Array.isArray(record.incidents)
    ? (record.incidents as Array<Record<string, unknown>>)
        .filter((i) => typeof i === "object" && i !== null && typeof i.started_at === "string")
        .map((i) => {
          const status: ComponentStatus = isComponentStatus(i.worst_status) ? i.worst_status : "degraded";
          return {
            source: isIncidentSource(i.source) ? i.source : "observed",
            worst_status: status,
            status_label: STATUS_LABELS[status],
            started_at: i.started_at as string,
            ended_at: typeof i.ended_at === "string" ? i.ended_at : null,
          };
        })
    : [];
  const rawChecks = record.checks as Record<string, unknown> | null | undefined;
  return {
    ok: true,
    key: record.key,
    date: record.date,
    observed: record.observed === true,
    day_status: isComponentStatus(record.day_status) ? record.day_status : null,
    checks:
      rawChecks && typeof rawChecks.total === "number" && typeof rawChecks.healthy === "number"
        ? { total: rawChecks.total, healthy: rawChecks.healthy }
        : null,
    hours,
    incidents,
  };
}
