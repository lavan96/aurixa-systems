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
  } | null;
}

export interface CatalogPack {
  id: string;
  slug: string;
  name: string;
  tokens: number;
  price_cents: number;
  currency: string;
  expires_after_days: number | null;
  metadata?: { best_for?: string | null; popular?: boolean } | null;
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

export interface Catalog {
  plans: CatalogPlan[];
  packs: CatalogPack[];
  setups: CatalogSetup[];
  addons: CatalogAddon[];
  reports: CatalogReport[];
}

export interface ResolvedHandoff {
  handoffId: string;
  cloneName: string | null;
  originUsername: string | null;
  intent: string | null;
}

export interface ResolvedIdentity {
  uid: string;
  cloneName: string | null;
  originUsername: string | null;
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

export async function fetchCatalog(): Promise<Catalog> {
  const body = await apiGet<Catalog>("/storefront-catalog");
  return {
    plans: body.plans ?? [],
    packs: body.packs ?? [],
    setups: body.setups ?? [],
    addons: body.addons ?? [],
    reports: body.reports ?? [],
  };
}

export async function resolveHandoff(h: string): Promise<ResolvedHandoff | null> {
  try {
    const body = await apiGet<{
      handoff_id: string;
      clone_name: string | null;
      origin_username: string | null;
      intent: string | null;
    }>(`/storefront-handoff?h=${encodeURIComponent(h)}`);
    return {
      handoffId: body.handoff_id,
      cloneName: body.clone_name,
      originUsername: body.origin_username,
      intent: body.intent,
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
    }>(`/storefront-identity?uid=${encodeURIComponent(uid)}`);
    return {
      uid: body.uid,
      cloneName: body.clone_name,
      originUsername: body.origin_username,
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
    }),
  });
  const body = (await res.json()) as { ok?: boolean; url?: string; error?: string };
  if (!res.ok || body.ok === false || !body.url) {
    throw new Error((body.error ?? "checkout_failed").replaceAll("_", " "));
  }
  return { url: body.url };
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
