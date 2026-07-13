/**
 * Billing API client (user-attributed pricing workflow, Revision 2).
 *
 * This site hosts THE customer-facing pricing page: all user-centric
 * monetisation (tokens, plans, seats — prime repo and every clone) flows
 * through /pricing here. Mission Control is the headless billing engine
 * behind these endpoints; customers never see its UI.
 *
 * Auth model: possession-based. Command centers mint a single-use handoff
 * token server-to-server; the browser only ever carries the opaque `?h=`
 * value, and receipts require the (session_id, h) pair. No cookies, no keys.
 */

// Default to Mission Control's production domain. The old lovable.app URL
// 302-redirects here, and a redirect inside the CORS flow can drop the
// checkout POST's headers — call the real origin directly.
const API_BASE = (
  (import.meta.env.VITE_BILLING_API_URL as string | undefined) ??
  "https://mission-control.aurixasystems.com.au"
).replace(/\/+$/, "");

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
  const res = await fetch(`${API_BASE}${path}`, { method: "GET" });
  const body = (await res.json()) as T & { ok?: boolean; error?: string };
  if (!res.ok || body.ok === false) {
    throw new Error(body.error ?? `billing_api_${res.status}`);
  }
  return body;
}

export async function fetchCatalog(): Promise<Catalog> {
  const body = await apiGet<Catalog>("/api/public/storefront/catalog");
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
    }>(`/api/public/storefront/handoff?h=${encodeURIComponent(h)}`);
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

export async function startCheckout(input: {
  h: string;
  mode: CheckoutMode;
  itemId: string;
  quantity?: number;
}): Promise<{ url: string }> {
  // text/plain keeps this a CORS "simple request" (no OPTIONS preflight):
  // Mission Control's framework answers preflights itself without an
  // Access-Control-Allow-Origin header, which would block a preflighted
  // cross-origin POST. The server parses the body as JSON regardless of the
  // content type, and the actual response carries ACAO: * — verified.
  const res = await fetch(`${API_BASE}/api/public/storefront/checkout`, {
    method: "POST",
    headers: { "content-type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({
      h: input.h,
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

export async function fetchSessionReceipt(sessionId: string, h: string): Promise<SessionReceipt> {
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
    `/api/public/storefront/session?session_id=${encodeURIComponent(sessionId)}&h=${encodeURIComponent(h)}`,
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
