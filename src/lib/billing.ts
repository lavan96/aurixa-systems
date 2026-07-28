/**
 * Billing API client (user-attributed pricing workflow, Revision 2).
 *
 * This site hosts THE customer-facing pricing page. The browser now talks only
 * to Aurixa Systems' OWN backend (Supabase edge functions): catalog is served
 * from a local mirror, and checkout/handoff/identity/session forward to Mission
 * Control server-to-server (MC stays the headless billing engine + Stripe).
 *
 * Auth model: possession-based. The pricing link carries a single-use `?h=`
 * handoff or a stable `?uid=`; receipts require the (session_id, credential)
 * pair. No cookies, no keys.
 */

// Aurixa Systems storefront backend (Supabase functions). Prefer an explicit
// override, else derive from the project URL, else fall back to the known
// production project.
const STOREFRONT_BASE = (() => {
  const explicit = import.meta.env.VITE_STOREFRONT_API_URL as string | undefined;
  if (explicit) return explicit.replace(/\/+$/, "");
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (supabaseUrl) return `${supabaseUrl.replace(/\/+$/, "")}/functions/v1`;
  return "https://moeyytuduycrvvncdtme.supabase.co/functions/v1";
})();

export type CheckoutMode = "topup" | "seat_plan" | "setup_package";

/**
 * Every price this site displays is TAX-INCLUSIVE — GST is contained in the
 * figure, not added at checkout. So GST is derived by dividing by 11, never by
 * multiplying by 1.1. Getting that backwards overstates every price by 10%.
 *
 * These mirror Mission Control's `aurixa-catalog.ts`, which is the source of
 * truth. They are duplicated rather than imported because the storefront is a
 * separate deployment that only talks to MC over HTTP.
 */
export const GST_DIVISOR = 11;
export const ANNUAL_DISCOUNT = 0.1;

/** The GST contained within a tax-inclusive amount. */
export const gstComponentCents = (inclGstCents: number): number =>
  Math.round(inclGstCents / GST_DIVISOR);

/** The ex-GST (net) amount of a tax-inclusive total. */
export const exGstCents = (inclGstCents: number): number =>
  inclGstCents - gstComponentCents(inclGstCents);

/** Annual charge for a monthly tax-inclusive price: twelve months less 10%. */
export const annualCents = (monthlyInclGstCents: number): number =>
  Math.round(monthlyInclGstCents * 12 * (1 - ANNUAL_DISCOUNT));

export interface CatalogPlan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  seat_limit: number;
  metadata?: {
    price_min_cents?: number | null;
    price_max_cents?: number | null;
    best_for?: string | null;
    highlights?: string[];
    tier?: number;
    /** Seat band from the price list, e.g. 1–4. */
    seat_min?: number | null;
    seat_max?: number | null;
    /**
     * The annual price as Mission Control minted it in Stripe. Preferred over
     * computing it here: what is displayed must be what is charged, and only
     * the Stripe price is authoritative. Falls back to the 10% calculation for
     * a catalog that predates the cutover.
     */
    annual_price_cents?: number | null;
    tax_inclusive?: boolean | null;
    /**
     * Whether price_cents includes the AML/CTF Compliance module. The price
     * list titles each tier with its with-AML figure, so that is the headline
     * and this is normally true after the catalog cutover.
     */
    includes_aml_ctf?: boolean | null;
    /** The same tier without AML/CTF — the price list's stated alternative. */
    base_price_cents?: number | null;
    base_annual_price_cents?: number | null;
  } | null;
}

/** The annual figure to show: the minted price if we have one, else derived. */
export const planAnnualCents = (plan: CatalogPlan): number =>
  plan.metadata?.annual_price_cents ?? annualCents(plan.price_cents);

/**
 * The tier's price WITHOUT the AML/CTF module, or null when it does not apply.
 *
 * Returns null unless the catalog says the headline includes AML/CTF. Before
 * the cutover a plan's price has no AML relationship at all, and inventing a
 * "without compliance" figure by subtracting from it would be a made-up
 * number on a pricing page.
 */
export const planBaseCents = (
  plan: CatalogPlan,
  period: "monthly" | "annual",
): number | null => {
  const meta = plan.metadata;
  if (!meta?.includes_aml_ctf) return null;
  return (period === "annual" ? meta.base_annual_price_cents : meta.base_price_cents) ?? null;
};

export interface CatalogPack {
  id: string;
  slug: string;
  name: string;
  tokens: number;
  price_cents: number;
  currency: string;
  expires_after_days: number | null;
  metadata?: {
    best_for?: string | null;
    /** The pricing sheet marks one pack the popular choice… */
    popular?: boolean;
    /** …and one the best value. */
    best_value?: boolean;
    /** Position in the ladder, 1 = smallest. */
    stage?: number;
  } | null;
}

/**
 * What one credit costs in this pack, in cents.
 *
 * Deliberately unrounded. Displays round it to the two decimals the price
 * list quotes, but the saving below is computed from the full figure — round
 * first and 2,500 credits advertise 21.5% off instead of the published 21.6%.
 */
export function packPerCreditCents(pack: Pick<CatalogPack, "tokens" | "price_cents">): number {
  return pack.tokens > 0 ? pack.price_cents / pack.tokens : 0;
}

/** The pack the saving is measured against: the smallest one on offer. */
export function smallestPack<T extends Pick<CatalogPack, "tokens" | "price_cents">>(
  packs: readonly T[],
): T | null {
  return packs.reduce<T | null>((min, p) => (!min || p.tokens < min.tokens ? p : min), null);
}

/**
 * How much cheaper a credit is here than in the smallest pack, as a fraction.
 *
 * Measured against whatever is actually on sale rather than a hardcoded
 * baseline, so the page can never advertise a saving against a pack the
 * customer cannot buy.
 */
export function packDiscountFraction(
  pack: Pick<CatalogPack, "tokens" | "price_cents">,
  packs: readonly Pick<CatalogPack, "tokens" | "price_cents">[],
): number {
  const baseline = smallestPack(packs);
  const baseRate = baseline ? packPerCreditCents(baseline) : 0;
  if (!baseRate) return 0;
  return 1 - packPerCreditCents(pack) / baseRate;
}

/**
 * The same saving in money: what these credits would have cost bought at the
 * smallest pack's rate, less what they cost here.
 *
 * A percentage off a per-credit rate is the honest way to compare packs and a
 * poor way to feel the difference — "43.1% cheaper per credit" and "$540.10
 * less than buying 15,000 credits 250 at a time" are the same fact, and only
 * one of them is a number anyone weighs a purchase against.
 */
export function packSavingCents(
  pack: Pick<CatalogPack, "tokens" | "price_cents">,
  packs: readonly Pick<CatalogPack, "tokens" | "price_cents">[],
): number {
  const baseline = smallestPack(packs);
  if (!baseline) return 0;
  return Math.round(pack.tokens * (packPerCreditCents(baseline) - packPerCreditCents(pack)));
}

/**
 * Credits lapse this many days after they are issued — plan allowances,
 * top-up packs and operator-gifted credits alike. Mirrors Mission Control's
 * `TOKEN_EXPIRY_DAYS`, which is where the rule is actually enforced.
 */
export const TOKEN_EXPIRY_DAYS = 30;

/**
 * How long a pack's credits stay spendable.
 *
 * The 30-day platform policy is a CEILING, not a fixed term: a pack that
 * deliberately expires sooner keeps its own shorter window, and a pack with a
 * longer window (or none at all) is capped at 30 days. Same arithmetic as
 * Mission Control's `resolveIssueExpiry`, so the page can never advertise a
 * term the billing engine will not honour.
 */
export function packValidityDays(pack: Pick<CatalogPack, "expires_after_days">): number {
  const packDays = pack.expires_after_days;
  if (packDays == null || packDays <= 0) return TOKEN_EXPIRY_DAYS;
  return Math.min(packDays, TOKEN_EXPIRY_DAYS);
}

export interface CatalogSetup {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_min_cents: number | null;
  price_max_cents: number | null;
  currency: string;
  deliverables: string[] | null;
}

export interface CatalogReport {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  credit_cost: number;
}

export interface CatalogAddon {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_min_cents: number | null;
  price_max_cents: number | null;
  currency: string;
  billing_period: string | null;
  category: string | null;
  included_in_plans: string[] | null;
}

/**
 * Why the restricted sections are or are not present.
 *
 * The server decides and the server enforces — this is the reason it gives,
 * so the page can render an honest gate instead of an empty list that reads
 * as a loading failure.
 */
export interface CatalogAccess {
  granted: boolean;
  reason: string;
  label: string | null;
}

export interface Catalog {
  plans: CatalogPlan[];
  packs: CatalogPack[];
  setups: CatalogSetup[];
  addons: CatalogAddon[];
  reports: CatalogReport[];
  access: CatalogAccess;
}

export interface ResolvedHandoff {
  handoffId: string;
  cloneName: string | null;
  originUsername: string | null;
  intent: string | null;
  /** The plan this workspace is already on, so CTAs can say Upgrade/Downgrade. */
  currentPlanSlug: string | null;
  currentPlanName: string | null;
}

export interface ResolvedIdentity {
  uid: string;
  cloneName: string | null;
  originUsername: string | null;
  currentPlanSlug: string | null;
  currentPlanName: string | null;
}

/** Purchase credential: a single-use handoff, or a stable operator uid. */
export type Credential = { h: string } | { uid: string };

export interface SessionReceipt {
  mode: string | null;
  itemSlug: string | null;
  cloneName: string | null;
  originUsername: string | null;
  amountTotal: number | null;
  currency: string | null;
  paymentStatus: string | null;
  fulfilled: boolean;
  webhookError: string | null;
  returnUrl: string | null;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${STOREFRONT_BASE}${path}`, { method: "GET" });
  const body = (await res.json()) as T & { ok?: boolean; error?: string };
  if (!res.ok || body.ok === false) {
    throw new Error(body.error ?? `billing_api_${res.status}`);
  }
  return body;
}

/**
 * The catalog, scoped to what this visitor may see.
 *
 * The credential travels with the request because the gate is server-side:
 * modules, onboarding and report economics are simply absent from the
 * response unless Mission Control says otherwise. Asking without one is not
 * an error — it returns the public price list.
 */
export async function fetchCatalog(
  credential?: { h?: string | null; uid?: string | null; access?: string | null },
): Promise<Catalog> {
  const qs = new URLSearchParams();
  if (credential?.h) qs.set("h", credential.h);
  if (credential?.uid) qs.set("uid", credential.uid);
  if (credential?.access) qs.set("access", credential.access);
  const suffix = qs.toString() ? `?${qs}` : "";

  const body = await apiGet<Catalog>(`/storefront-catalog${suffix}`);
  return {
    plans: body.plans ?? [],
    packs: body.packs ?? [],
    setups: body.setups ?? [],
    addons: body.addons ?? [],
    reports: body.reports ?? [],
    access: body.access ?? { granted: false, reason: "no_credential", label: null },
  };
}

export async function resolveHandoff(h: string): Promise<ResolvedHandoff | null> {
  try {
    const body = await apiGet<{
      handoff_id: string;
      clone_name: string | null;
      origin_username: string | null;
      intent: string | null;
      current_plan_slug?: string | null;
      current_plan_name?: string | null;
    }>(`/storefront-handoff?h=${encodeURIComponent(h)}`);
    return {
      handoffId: body.handoff_id,
      cloneName: body.clone_name,
      originUsername: body.origin_username,
      intent: body.intent,
      currentPlanSlug: body.current_plan_slug ?? null,
      currentPlanName: body.current_plan_name ?? null,
    };
  } catch {
    // Expired/consumed/unknown token → degrade to the browse-only page.
    return null;
  }
}

export async function resolveIdentity(uid: string): Promise<ResolvedIdentity | null> {
  try {
    const body = await apiGet<{
      uid: string;
      clone_name: string | null;
      origin_username: string | null;
      current_plan_slug?: string | null;
      current_plan_name?: string | null;
    }>(`/storefront-identity?uid=${encodeURIComponent(uid)}`);
    return {
      uid: body.uid,
      cloneName: body.clone_name,
      originUsername: body.origin_username,
      currentPlanSlug: body.current_plan_slug ?? null,
      currentPlanName: body.current_plan_name ?? null,
    };
  } catch {
    // Unknown/invalid uid → degrade to the browse-only page.
    return null;
  }
}

export async function startCheckout(input: {
  credential: Credential;
  mode: CheckoutMode;
  itemId: string;
  quantity?: number;
  /** Annual is a separate Stripe price — without this every purchase bills monthly. */
  period?: "monthly" | "annual";
}): Promise<{ url: string }> {
  // text/plain keeps this a CORS "simple request" (no OPTIONS preflight). The
  // storefront-checkout function reads the raw body and forwards it to Mission
  // Control, which parses JSON regardless of content type; the response carries
  // ACAO: *.
  const res = await fetch(`${STOREFRONT_BASE}/storefront-checkout`, {
    method: "POST",
    headers: { "content-type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({
      ...input.credential,
      mode: input.mode,
      item_id: input.itemId,
      quantity: input.quantity ?? 1,
      period: input.period ?? "monthly",
    }),
  });
  const body = (await res.json()) as { ok?: boolean; url?: string; error?: string };
  if (!res.ok || body.ok === false || !body.url) {
    throw new Error((body.error ?? "checkout_failed").replaceAll("_", " "));
  }
  return { url: body.url };
}

/**
 * Wallet flow: starts a Stripe Checkout session in `setup` mode so the buyer
 * can save a card for later. Card details are entered on Stripe's hosted page
 * — they never touch this site or Mission Control. Same credential model and
 * transport as startCheckout.
 */
export async function startCardSetup(input: { credential: Credential }): Promise<{ url: string }> {
  const res = await fetch(`${STOREFRONT_BASE}/storefront-setup`, {
    method: "POST",
    headers: { "content-type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({ ...input.credential }),
  });
  const body = (await res.json()) as { ok?: boolean; url?: string; error?: string };
  if (!res.ok || body.ok === false || !body.url) {
    throw new Error((body.error ?? "card_setup_failed").replaceAll("_", " "));
  }
  return { url: body.url };
}

export interface WalletStatus {
  saved: boolean;
  brand: string | null;
  last4: string | null;
  priority: number | null;
  returnUrl: string | null;
}

/** Card-saved receipt: polled by /pricing/card-saved until the webhook has
 * persisted the card. Authorised by the (session_id, credential) pair. */
export async function fetchWalletStatus(
  sessionId: string,
  credential: Credential,
): Promise<WalletStatus> {
  const credParam =
    "h" in credential
      ? `h=${encodeURIComponent(credential.h)}`
      : `uid=${encodeURIComponent(credential.uid)}`;
  const body = await apiGet<{
    saved: boolean;
    brand: string | null;
    last4: string | null;
    priority: number | null;
    return_url: string | null;
  }>(`/storefront-wallet?session_id=${encodeURIComponent(sessionId)}&${credParam}`);
  return {
    saved: body.saved,
    brand: body.brand,
    last4: body.last4,
    priority: body.priority,
    returnUrl: body.return_url,
  };
}

export async function fetchSessionReceipt(
  sessionId: string,
  credential: Credential,
): Promise<SessionReceipt> {
  const credParam =
    "h" in credential
      ? `h=${encodeURIComponent(credential.h)}`
      : `uid=${encodeURIComponent(credential.uid)}`;
  const body = await apiGet<{
    mode: string | null;
    item_slug: string | null;
    clone_name: string | null;
    origin_username: string | null;
    amount_total: number | null;
    currency: string | null;
    payment_status: string | null;
    fulfilled: boolean;
    webhook_error: string | null;
    return_url: string | null;
  }>(
    `/storefront-session?session_id=${encodeURIComponent(sessionId)}&${credParam}`,
  );
  return {
    mode: body.mode,
    itemSlug: body.item_slug,
    cloneName: body.clone_name,
    originUsername: body.origin_username,
    amountTotal: body.amount_total,
    currency: body.currency,
    paymentStatus: body.payment_status,
    fulfilled: body.fulfilled,
    webhookError: body.webhook_error,
    returnUrl: body.return_url,
  };
}

export function formatMoney(cents: number | null | undefined, currency = "AUD"): string {
  if (cents == null) return "—";
  try {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}
