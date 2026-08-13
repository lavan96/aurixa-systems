/**
 * Status page — shared vocabulary and pure rules.
 *
 * The status page reports the health of the upstream services Aurixa
 * depends on WITHOUT naming them: each provider appears only as its role
 * ("Backend Platform Provider", never the vendor). All vendor polling
 * happens server-side in the status-summary edge function; this module
 * holds what both sides share — the normalized status vocabulary, severity
 * ordering, overall-state computation, display copy, and the daily history
 * rollup — so the page and the function cannot drift, and so the
 * anonymity rule is testable (see statusPage.test.ts, which asserts no
 * vendor name ever appears in public-facing copy).
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
  degraded: "Degraded performance on an upstream service",
  partial_outage: "Partial upstream outage",
  major_outage: "Major upstream outage",
  unknown: "Status temporarily unavailable",
};

export type StatusComponent = {
  key: string;
  label: string;
  description: string;
  status: ComponentStatus;
  status_label: string;
  checked_at: string | null;
  history: Array<{ date: string; status: ComponentStatus }>;
};

export type StatusSummary = {
  ok: true;
  overall: ComponentStatus;
  overall_label: string;
  checked_at: string | null;
  stale: boolean;
  components: StatusComponent[];
};

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
 * Collapse raw snapshots into one status per calendar day (worst wins), for
 * the 30-day history bars. Input rows may be in any order; output is
 * oldest → newest and capped to `days`.
 */
export function rollupDaily(
  rows: Array<{ date: string; status: ComponentStatus }>,
  days = 30,
): Array<{ date: string; status: ComponentStatus }> {
  const byDate = new Map<string, ComponentStatus>();
  for (const row of rows) {
    const existing = byDate.get(row.date);
    if (!existing || severityRank(row.status) > severityRank(existing)) {
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
 * order.
 */
export const STATUS_COMPONENT_ROSTER: Array<{
  key: string;
  label: string;
  description: string;
}> = [
  {
    key: "backend",
    label: "Backend Platform Provider",
    description: "Databases, authentication and application APIs",
  },
  {
    key: "security_delivery",
    label: "Cloud Security & Delivery Provider",
    description: "Edge network, traffic protection and content delivery",
  },
  {
    key: "web_hosting",
    label: "Web Hosting Provider",
    description: "Website hosting and deployments",
  },
  {
    key: "dev_platform",
    label: "Development Platform Provider",
    description: "Code delivery and release automation",
  },
  {
    key: "ai_models",
    label: "AI Model Provider",
    description: "Model inference behind AI-assisted features",
  },
  {
    key: "payments",
    label: "Payments Provider",
    description: "Billing and card processing",
  },
  {
    key: "email_delivery",
    label: "Email Delivery Provider",
    description: "Transactional email delivery",
  },
];
