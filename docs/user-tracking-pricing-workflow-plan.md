# User-Attributed Pricing & Purchase Workflow — Implementation Plan (Marketing Site Entry Point)

> **Repo role in this plan:** `aurixa-systems` is the public marketing site (React + Vite,
> routes: `/`, `/platform`, `/solutions`, `/industries`, `/about`, `/resources`, `/contact`).
> It currently has **no pricing page, no Stripe code, and no link into the billing flow at all** —
> the "Aurixa Systems" pricing page users actually buy from lives inside
> `aurixa-mission-control` at `/pricing` (see `src/routes/pricing.tsx` there, whose page title is
> literally "Pricing — Aurixa Systems").
>
> This repo's slice is small but load-bearing: give the flow a public front door and make sure
> traffic entering through it is **source-attributed** the same way command-center traffic is.
>
> **Canonical spec** (attribution contract, data model, checkout/webhook/dashboard work):
> `aurixa-mission-control` → `docs/user-tracking-pricing-workflow-plan.md`.
> Command-center origin work: `npc-property-dashbord` → `USER_TRACKING_PRICING_WORKFLOW_PLAN.md`.
> All three live on branch `claude/user-tracking-pricing-workflow-deyg3i`.

---

## 1. Why this repo is involved

The end-to-end workflow being built is:

```
Command center (NPC prime/clone) ──► Aurixa Systems pricing page ──► Stripe Checkout
        │                                (aurixa-mission-control          │
        │                                 /pricing route)                 ▼
        └── origin_user_id + clone identity carried the whole way ──► purchases table
                                                                       + Mission Control dashboard
```

Prospects and existing clients also arrive at pricing from the **public web** — this site. If the
marketing site links into `/pricing` without attribution, those purchases show up with no
`origin_source`, muddying the macro-tracking data the whole project exists to produce. The fix is
cheap: this site always tags its outbound pricing links with `origin_source=aurixa_site` (plus
UTM passthrough) using the same canonical field names.

Anonymous web visitors have no `origin_user_id` — that is expected and correct. The attribution
contract treats `origin_user_id` as unknowable from this surface; **never** invent one here, and
never accept one from the URL (spoofable). Source-level attribution is the ceiling for this repo.

## 2. Current state (verified in code)

- `src/App.tsx` routes: Home, Platform, Solutions, Industries, About, Resources, Contact. No
  `/pricing`.
- `src/components/Navbar.tsx`: Home / Platform / Solutions / Industries / About / Resources +
  "Join Waitlist" CTA. No pricing link.
- Zero references to Stripe, checkout, mission-control, or lovable.app anywhere in `src/`.
- No env plumbing for external app URLs (only `GEMINI_API_KEY` from the AI Studio scaffold).

## 3. Work plan

### 3.1 Config

Add to `.env` / Vite env (with a checked-in `.env.example`):

```
VITE_PRICING_URL=https://aurixa-mission-control.lovable.app/pricing
```

Central helper `src/lib/pricing.ts`:

```ts
const BASE = import.meta.env.VITE_PRICING_URL ?? "https://aurixa-mission-control.lovable.app/pricing";

/** Outbound pricing URL, always tagged with this site as the origin source. */
export function pricingUrl(extra: Record<string, string> = {}): string {
  const url = new URL(BASE);
  url.searchParams.set("origin_source", "aurixa_site");
  // Forward acquisition params so paid/organic attribution survives the hop.
  const inbound = new URLSearchParams(window.location.search);
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "clone"]) {
    const v = inbound.get(k);
    if (v) url.searchParams.set(k, v);
  }
  for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  return url.toString();
}
```

(`origin_source` here is display/analytics-grade only — Mission Control treats browser-supplied
params as untrusted and records them as such; trusted identity only ever arrives via the
server-minted handoff tokens described in the canonical spec.)

### 3.2 `/pricing` route on this site

Two acceptable shapes — pick one at build time:

- **Option A (recommended): redirect route.** Add `<Route path="/pricing" element={<PricingRedirect />} />`
  where `PricingRedirect` immediately does `window.location.replace(pricingUrl())`. Cheapest,
  single source of truth for pricing content, and `aurixasystems.*/pricing` becomes a stable
  public URL for campaigns.
- **Option B: teaser page.** A styled summary of tiers (static copy consistent with the site's
  design language — the `#94A3B8`/`#00A8B5`/`#C89B3C` palette in `Navbar.tsx`) whose every CTA
  is `href={pricingUrl()}`. More work, risks drifting from the live catalog; only worth it if
  marketing wants SEO copy on this domain.

Either way the live, checkout-capable page remains mission-control's `/pricing`.

### 3.3 Navigation & CTAs

- `src/components/Navbar.tsx`: add "Pricing" between Industries and About (desktop `navItems`
  and the mobile menu block, matching the existing link styling/active-state pattern).
- `src/components/Footer.tsx`: add a Pricing link in the relevant column.
- Sweep existing pages (`Home.tsx`, `Platform.tsx`, `Solutions.tsx`) for "get started"-style CTAs
  where a pricing link is contextually right, and use `pricingUrl()` there too. Keep
  "Join Waitlist" as-is — it's a different funnel.

### 3.4 Mission Control counterpart (tracked in the canonical plan, restated here for context)

For this site's links to be recorded, mission-control's `/pricing` route must accept and persist
`origin_source` (+ UTM) from its search params into the checkout flow as **untrusted,
analytics-grade** attribution — i.e. stamped into Stripe metadata and the `purchases.metadata`
jsonb, while the trusted `origin_source` column continues to be derived server-side
(`mission_control` for operator purchases, the clone's identity for handoff purchases,
`aurixa_site` allowed from search params only when no handoff/operator context contradicts it).
That work item lives in the canonical plan (Phase 2, `pricing.tsx` changes).

## 4. Sequencing

1. Can ship immediately — the links work against the current mission-control `/pricing` today
   (unknown params are ignored by its `validateSearch`).
2. Full attribution value lands once mission-control Phase 1–2 (purchases table + param
   persistence) deploys.

## 5. Test plan

| Test | Type |
|---|---|
| `pricingUrl()` sets `origin_source=aurixa_site`, forwards present UTM params, ignores absent ones, applies `extra` overrides | unit |
| `/pricing` redirect fires exactly once and lands on `VITE_PRICING_URL` with params | component/manual |
| Navbar + Footer render the Pricing link (desktop + mobile menu) with correct active styling | component/manual |
| `npm run lint` (`tsc --noEmit`) clean | CI |
| End-to-end (staging, once MC Phase 1 is live): visit with `?utm_campaign=x` → Pricing → complete Stripe test purchase → `purchases.metadata` contains `origin_source=aurixa_site` + `utm_campaign=x` | e2e |

## 6. Risks / notes

- **Domain drift:** if the pricing app moves off `aurixa-mission-control.lovable.app`, only
  `VITE_PRICING_URL` changes here. Keep it env-driven, never hard-code in components.
- **Spoofability is accepted:** `origin_source=aurixa_site` from a URL is analytics-grade, not
  security-grade — the canonical spec's trust rules make sure it can never overwrite a trusted
  clone/user attribution.
- **SEO:** if Option A (redirect), make it a client redirect to an external host and keep the
  route out of any sitemap, or search engines may index the bare redirect.
