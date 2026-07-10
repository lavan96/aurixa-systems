/**
 * Outbound pricing links (user-attributed pricing workflow — marketing-site
 * entry point; see docs/user-tracking-pricing-workflow-plan.md).
 *
 * The live, checkout-capable pricing page is Mission Control's /pricing route.
 * This site's job is to tag every link into it with `origin_source=aurixa_site`
 * plus any inbound UTM params, so purchases arriving from the public web are
 * source-attributed in the purchases ledger.
 *
 * Trust boundary: these URL params are analytics-grade only. Trusted identity
 * (which clone user initiated a purchase) travels exclusively via server-minted
 * handoff tokens — never invent or forward a user id from this site.
 */

const BASE =
  (import.meta.env.VITE_PRICING_URL as string | undefined) ??
  "https://aurixa-mission-control.lovable.app/pricing";

const FORWARDED_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "clone",
] as const;

/** Outbound pricing URL, always tagged with this site as the origin source. */
export function pricingUrl(extra: Record<string, string> = {}): string {
  const url = new URL(BASE);
  url.searchParams.set("origin_source", "aurixa_site");
  const inbound = new URLSearchParams(window.location.search);
  for (const key of FORWARDED_PARAMS) {
    const value = inbound.get(key);
    if (value) url.searchParams.set(key, value);
  }
  for (const [key, value] of Object.entries(extra)) url.searchParams.set(key, value);
  return url.toString();
}
