/**
 * Buying a module from the pricing page.
 *
 * Every add-on module that is sold on its own has a live Stripe Payment Link,
 * created from the same product and price Mission Control's catalog quotes. The
 * table below is the only place those URLs live in this repo.
 *
 * Two things about the shape of this, both deliberate:
 *
 *   1. **The amount is recorded next to the URL.** A Payment Link charges
 *      whatever its price says, and the card quotes whatever the catalog says.
 *      Those are two systems, and they can drift — a repriced module in Mission
 *      Control would otherwise leave the page advertising one number and
 *      charging another. So the link is only offered when the catalog's price
 *      and the link's price agree; when they do not, the card simply falls back
 *      to the enquiry route and nobody is charged a stale price.
 *
 *   2. **A missing slug is a normal answer, not an error.** Not every module is
 *      buyable — `lenders` is still in development and has no Stripe product at
 *      all — and a module the catalog adds tomorrow will not be in this table
 *      either. Both cases resolve to `null` and the card renders without a
 *      purchase button, which is the safe direction to fail in.
 *
 * A Payment Link creates its own subscription; it cannot be attached to a plan
 * the customer already has. That is why each link asks for the account name and
 * why the page says the module is enabled by the team rather than instantly.
 */

/** A live Stripe Payment Link, and the amount it actually charges. */
export type AddonPurchaseLink = {
  url: string;
  /** Tax-inclusive, in cents, matching the Stripe price behind the link. */
  amountCents: number;
};

/**
 * Slug → live Payment Link. Slugs are Mission Control's module slugs, which are
 * also carried on the Stripe product as `metadata.aurixa_module`, so a link can
 * always be traced back to the module it sells.
 */
export const ADDON_PURCHASE_LINKS: Readonly<Record<string, AddonPurchaseLink>> = {
  "aurixa-agent": { url: "https://buy.stripe.com/dRmcMY2s2ePs9KvgkI0co00", amountCents: 37500 },
  "api-usage": { url: "https://buy.stripe.com/00w4gsd6G36K3m77Oc0co01", amountCents: 14900 },
  integrations: { url: "https://buy.stripe.com/7sYeV66Ii22G5uf6K80co02", amountCents: 13500 },
  "finance-portal": { url: "https://buy.stripe.com/eVq7sEc2CgXA1dZ1pO0co03", amountCents: 22500 },
  "model-hub": { url: "https://buy.stripe.com/5kQaEQ6Ii22Ge0L6K80co04", amountCents: 19500 },
  "aml-ctf": { url: "https://buy.stripe.com/eVq28k0jUcHkcWH2tS0co05", amountCents: 19500 },
  "deal-pipeline": { url: "https://buy.stripe.com/00waEQd6GcHk3m77Oc0co06", amountCents: 9900 },
  marketing: { url: "https://buy.stripe.com/8x23cofeOcHkaOzecA0co07", amountCents: 17900 },
  agreements: { url: "https://buy.stripe.com/aFafZa3w6bDg1dZ9Wk0co08", amountCents: 6900 },
  "client-ai": { url: "https://buy.stripe.com/00w5kweaK0YC8Gr5G40co09", amountCents: 7900 },
  "borrowing-capacity": { url: "https://buy.stripe.com/9B6eV61nY36KaOz8Sg0co0a", amountCents: 22500 },
  "client-forms": { url: "https://buy.stripe.com/28E5kw2s2fTw5uf5G40co0b", amountCents: 4900 },
  "send-portfolio": { url: "https://buy.stripe.com/14A3coaYyazc8Grb0o0co0c", amountCents: 6900 },
  "portfolio-analysis": { url: "https://buy.stripe.com/7sYfZac2CgXA5uf1pO0co0d", amountCents: 12500 },
  "call-logs": { url: "https://buy.stripe.com/14A00c2s27n0e0L8Sg0co0e", amountCents: 22500 },
  "email-copilot": { url: "https://buy.stripe.com/cNi14gc2CcHkg8T9Wk0co0f", amountCents: 9900 },
  "cashflow-comparisons": { url: "https://buy.stripe.com/8x2bIUd6G5eS09V7Oc0co0g", amountCents: 9900 },
  "report-comparisons": { url: "https://buy.stripe.com/6oU00c5Ee36K6yjgkI0co0h", amountCents: 9900 },
  "intelligence-hub": { url: "https://buy.stripe.com/9B6aEQc2CfTwf4P5G40co0i", amountCents: 7900 },
  "opportunity-marketplace": { url: "https://buy.stripe.com/5kQ4gsfeO36K2i3b0o0co0j", amountCents: 16900 },
  "commercial-industrial": { url: "https://buy.stripe.com/5kQ8wI5EefTw5uf8Sg0co0k", amountCents: 16900 },
  "market-updates": { url: "https://buy.stripe.com/5kQ3cod6Gazc7Cn0lK0co0l", amountCents: 5900 },
};

/**
 * The parts of a catalog add-on this module needs.
 *
 * Structural on purpose: `billing.ts` reads `import.meta.env` when it loads, so
 * importing it here would drag the environment into a file that is pure
 * arithmetic and string work — and into its tests.
 */
export type PurchasableAddon = {
  slug: string;
  price_min_cents: number | null;
  price_max_cents: number | null;
  currency?: string | null;
  included_in_plans?: string[] | null;
};

/** Why a module has no buy button, when it has none. */
export type NoPurchaseReason =
  /** Nothing is sold for this module yet — it has no Stripe product. */
  | "not_sold"
  /** The advertised price is a range, which a single Payment Link cannot be. */
  | "not_a_fixed_price"
  /** The catalog and the link disagree on the price, so we will not charge. */
  | "price_mismatch"
  /** The module already comes with the plan this visitor is on. */
  | "already_included";

/**
 * The absent members are spelled out rather than left off: this project builds
 * without `strictNullChecks`, so TypeScript will not narrow a union by its
 * `available` flag, and a caller reading `reason` after checking `available`
 * needs the field to exist on both arms.
 */
export type AddonPurchase =
  | { available: true; url: string; amountCents: number; reason?: undefined }
  | { available: false; reason: NoPurchaseReason; url?: undefined; amountCents?: undefined };

/** Stripe accepts letters, digits, dashes and underscores here, up to 200. */
const REFERENCE_SAFE = /[^A-Za-z0-9_-]+/g;

/**
 * Tags the checkout with the account it came from, when the page knows it.
 *
 * The link also asks the buyer to type their account name, because most
 * visitors arrive without a handoff; this is the copy of that answer we do not
 * have to trust, and it is what reconciles a standalone subscription back to
 * the right customer.
 */
export function accountReference(value: string | null | undefined): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(REFERENCE_SAFE, "-").replace(/^-+|-+$/g, "").slice(0, 200);
}

export type ResolveOptions = {
  /** The plan the visitor is already on, if the page has identified them. */
  currentPlanSlug?: string | null;
  /** Carried to Stripe as `client_reference_id` so ops can match the payment. */
  accountReference?: string | null;
};

/**
 * Decides whether this module can be bought right now, and at what URL.
 *
 * The price is checked rather than assumed: the card shows the catalog's
 * number, so the only honest thing to offer is a link that charges exactly
 * that.
 */
export function resolveAddonPurchase(
  addon: PurchasableAddon,
  options: ResolveOptions = {},
): AddonPurchase {
  const link = ADDON_PURCHASE_LINKS[addon.slug];
  if (!link) return { available: false, reason: "not_sold" };

  // Selling somebody what their plan already includes is worse than showing no
  // button at all, so this is checked before anything about the price.
  const plan = options.currentPlanSlug;
  if (plan && (addon.included_in_plans ?? []).includes(plan)) {
    return { available: false, reason: "already_included" };
  }

  const { price_min_cents: min, price_max_cents: max } = addon;
  if (typeof min !== "number" || (typeof max === "number" && max !== min)) {
    return { available: false, reason: "not_a_fixed_price" };
  }
  // Everything on this page is AUD; a module quoted in anything else is not
  // something these links can charge for.
  if (addon.currency && addon.currency.toUpperCase() !== "AUD") {
    return { available: false, reason: "price_mismatch" };
  }
  if (min !== link.amountCents) return { available: false, reason: "price_mismatch" };

  const reference = accountReference(options.accountReference);
  const url = reference
    ? `${link.url}?client_reference_id=${encodeURIComponent(reference)}`
    : link.url;

  return { available: true, url, amountCents: link.amountCents };
}
