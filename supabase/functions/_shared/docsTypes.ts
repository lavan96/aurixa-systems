// Shape of the Command Center documentation corpus.
//
// This lives under supabase/functions/ rather than src/ for one reason: the
// bodies must never reach a browser that is not entitled to them. Anything
// imported from src/ ends up in the Vite bundle, which would make the gate
// cosmetic — a Launch customer could read the Scale documentation out of the
// JavaScript. The corpus is therefore server-only and the page fetches bodies
// from an edge function that filters them by entitlement first.
//
// What IS public lives in src/lib/docs/publicIndex.ts: slug, title, one-line
// summary, group and tier badge. That is the marketing surface, and a drift
// test keeps the two in step.

/** Blocks a documentation section is built from. */
export type DocsBlock =
  /** A paragraph. Plain text; the renderer handles typography. */
  | { kind: "prose"; text: string }
  /** An ordered walkthrough. */
  | { kind: "steps"; title?: string; items: string[] }
  /** An unordered list of capabilities or points. */
  | { kind: "list"; title?: string; items: string[] }
  /** A reference table — field or control on the left, meaning on the right. */
  | { kind: "fields"; title?: string; rows: Array<{ name: string; detail: string }> }
  /** A callout. `compliance` is used where a regulator would care. */
  | { kind: "note"; tone: "tip" | "warning" | "compliance"; text: string }
  /** A titled grouping of blocks, for modules with several distinct screens. */
  | { kind: "subsection"; title: string; blocks: DocsBlock[] };

export type DocsSection = {
  /** URL fragment on /docs, and the join key to the public index. */
  slug: string;
  title: string;
  /** Public. Shown to anonymous visitors and in the index. Keep to one line. */
  summary: string;
  /** Navigation grouping — mirrors the pricing page's feature headings. */
  group: string;
  /**
   * Pricing-catalogue module slug this section documents, or null when the
   * section is universal (platform basics every plan has).
   *
   * MUST be a key of MODULE_TIERS. A slug that is not in the catalogue would
   * silently fall through the gate as "not a priced module" and be shown to
   * everybody — the same failure mode as an unregistered permission key.
   */
  moduleSlug: string | null;
  /**
   * Anchor id of the matching section in the Command Center user guide, so the
   * dashboard can deep-link "Read documentation" straight to the right place.
   */
  guideSectionId?: string;
  /** Estimated read time in minutes, shown in the index. */
  readMinutes: number;
  /** GATED. Never sent to a browser without entitlement. */
  blocks: DocsBlock[];
};

export type DocsGroup = {
  heading: string;
  blurb: string;
};

/** Navigation order for the section groups. */
export const DOCS_GROUPS: DocsGroup[] = [
  {
    heading: "Getting Started",
    blurb:
      "Signing in, finding your way around, and the ideas the rest of the platform is built on.",
  },
  {
    heading: "Main Dashboard",
    blurb: "The daily working surfaces — your overview, calendar and market intelligence.",
  },
  {
    heading: "Reports & Analysis",
    blurb:
      "Generating, comparing and distributing the investment analysis your clients pay you for.",
  },
  {
    heading: "Client & CRM",
    blurb: "Everything held against a client record, from first contact to settled portfolio.",
  },
  {
    heading: "Operations",
    blurb: "Pipeline, agreements, checklists and the recurring work that keeps deals moving.",
  },
  {
    heading: "Intelligence & AI",
    blurb: "The Aurixa Agent, document understanding, and the AI woven through the product.",
  },
  {
    heading: "Portals",
    blurb: "The external-facing surfaces your clients, brokers, solicitors and builders log into.",
  },
  {
    heading: "Administration",
    blurb: "Users, permissions, branding, integrations and the settings that shape the workspace.",
  },
  {
    heading: "Compliance",
    blurb: "AML/CTF obligations, audit trails and the records a regulator would ask to see.",
  },
  {
    heading: "Help & Usage",
    blurb: "Billing, token consumption, troubleshooting and getting a human when you need one.",
  },
];
