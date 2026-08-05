# `/pricing-mock` — the A$1 Stripe test catalogue

Testing of the end-to-end purchase workflow is driven from the **prime repo**
(NPC Property Dashboard) through **Mission Control** and out to **Stripe**. Every
one of those paths terminates at a Stripe checkout, and exercising them against
the real price list moves thousands of dollars per sweep — a single pass over the
tiers alone is over A$40,000 at annual prices.

So the whole catalogue has been reminted in Stripe at **A$1.00 an item**, and
`/pricing-mock` is the page that lists them with their links.

---

## Read this before you open a link

**The mocks are in the LIVE Stripe account (`acct_1TbJPK3tNhf9apmH`), not a
sandbox.** That was a deliberate, explicitly-approved decision; the constraint it
creates is that these are test *fixtures*, not test *mode*:

- A$1.00 really leaves a real card. Stripe test cards (`4242…`) will be declined.
- The charges appear in live reporting and live payouts.
- Refund from the Stripe dashboard when a sweep finishes.

The page leads with this in the largest type on it, because the URL will
eventually be opened by somebody who did not read this file.

---

## What was minted

38 products, 41 prices, 41 payment links. All AUD, all `tax_behavior:
inclusive` except the onboarding packages, which mirror their live counterparts'
`unspecified`.

| Group | Count | Billing | Mirrors |
| --- | --- | --- | --- |
| Plans | 4 products / 7 prices | recurring | `seat_plans` |
| Add-on modules | 22 | monthly recurring | `addon_modules` |
| Top-up credit packs | 8 | one-off | `topup_packs` |
| Onboarding packages | 4 | one-off | `setup_packages` |

Each mock bills the way the thing it stands in for bills. That is the point —
a one-off price at the same amount as a subscription is a different product as
far as billing is concerned, and a mock that got it wrong would test the wrong
path.

**Plans** carry two prices on one product (monthly + annual), mirroring
Mission Control's `seat_plans.stripe_price_id` and
`metadata.annual_stripe_price_id`. Minting two products would not exercise that
shape. Enterprise is the exception: it is scoped and quoted in production and has
no annual price, so it has one mock — included anyway because the `seat_plan`
checkout path in Mission Control does resolve it.

**Modules** are the 22 that are actually purchasable, AML/CTF included. AML/CTF
is worth calling out: its `includedIn` is empty in the module matrix, but every
tier's headline price already contains it — that is the A$195 gap between each
tier's two published figures — so its Stripe description says so, exactly as the
live product's does.

### Deliberately not minted

`lenders`. It is `comingSoon` in the catalogue, and Mission Control's module sync
both skips it and actively unlinks any Stripe price it acquires. Minting a mock
would make the mock catalogue behave *differently* from the live one, which is
the one thing a fixture must not do. The page states this rather than leaving a
gap, so a tester never reads the absence as a defect in what they are testing.

---

## Why the mocks cannot corrupt the live catalogue

This is the load-bearing design decision, and it is enforced by a test.

Mission Control resolves a Stripe product by searching metadata:

| Sync | Search |
| --- | --- |
| `stripe-catalog-sync.server.ts` | `metadata['aurixa_tier']` |
| `stripe-module-sync.server.ts` | `metadata['aurixa_module']` |
| `stripe-pack-sync.server.ts` | `metadata['aurixa_pack']` |

If a mock product carried one of those keys, the next press of **Apply** in
Mission Control could adopt it as the live product for a real catalogue row and
repoint that row at a A$1 price — charging every customer on it a dollar.

The mocks therefore use a namespace no live search will ever match:

```
aurixa_mock        = "true"          ← on every mock product, price and link
aurixa_mock_kind   = tier | module | pack | setup
aurixa_mock_tier   / aurixa_mock_module / aurixa_mock_pack / aurixa_mock_setup
live_price_cents   = what the real thing costs
```

`src/lib/pricing/mockCatalog.test.ts` scans the catalogue source (comments and
the reserved-list declaration stripped, since naming a key in prose attaches
nothing to a product) and fails if a reserved key ever appears in the data. A
second test pins the reserved list itself, so it cannot be silently shortened.

The prices are also isolated structurally: `ensurePrice` in each sync lists
prices **by product**, so it can only ever see prices on the live product it
already resolved.

---

## What paying a mock link does — and does not — do

**Nothing is provisioned.** A Payment Link purchase reaches Mission Control's
webhook without the `mode` and `item_id` metadata that fulfilment reads, so
`api.public.stripe.webhook.ts` raises `PermanentError("missing_metadata")`: the
event is recorded in `stripe_events` and stops. No plan is assigned, no credits
are issued, no module is enabled.

That is not a shortcoming of the mocks — it is precisely how the live add-on
Payment Links in `src/lib/addonPurchaseLinks.ts` already behave, which is why
those cards say the module is enabled by the team rather than instantly.
Mirroring it is the requirement.

**To exercise fulfilment**, drive `startCheckout()` from `src/lib/billing.ts`
with a `?h=` handoff or `?uid=` instead. That path goes through
`storefront-checkout` → Mission Control's `startCheckoutCore`, which stamps the
metadata the webhook needs. The mock **price ids** on this page are what you
would point a test catalogue row at to do that; the page offers them as
one-click copies for exactly this reason.

---

## Retiring the fixture set

Every mock object carries `aurixa_mock: "true"`. Searching Stripe for

```
metadata['aurixa_mock']:'true'
```

returns this set and nothing else, so the whole fixture can be deactivated in one
pass. Deactivate rather than delete — the charges against them are real, and the
products need to stay resolvable for the refunds.

---

## Files

| Path | What it is |
| --- | --- |
| `src/lib/pricing/mockCatalog.ts` | The catalogue: ids, links, live prices, exclusions |
| `src/lib/pricing/mockCatalog.test.ts` | The namespace guard and the parity checks |
| `src/pages/PricingMock.tsx` | The page |
| `src/App.tsx` | Route registration; site chrome suppressed as on `/pricing` |

Like `/pricing`, the page is **not linked from public navigation** and is reached
by direct URL only.

### A note on the parity tests

Two of them are worth knowing about because they will fail on you eventually,
and that is intended:

- *"the mock modules are exactly the modules that are live-purchasable"* pins the
  mock set against `ADDON_PURCHASE_LINKS`. A module going on sale, or being
  withdrawn, fails here rather than quietly leaving the fixture one short.
- *"each module's live price matches the amount the live link charges"* compares
  the two independent transcriptions of Mission Control's `aurixa-catalog.ts`. If
  they disagree, one of them drifted.

---

## Observations recorded while minting

Two pre-existing inconsistencies surfaced. Neither is caused by the mocks and
neither was changed:

1. **The live `Aurixa Market Updates` Stripe product still says "Included with
   Growth and Scale."** The catalogue moved Market Updates to Scale-only
   bundling, and the Stripe product description was not re-synced. The mock uses
   the catalogue's current value (Scale only). Re-running the module sync in
   Mission Control would correct the live product.
2. **There are two live products carrying `aurixa_tier: growth`** —
   `prod_Uy9fqonhZurj2E` and `prod_UcfABtrSg7cBle`. This is the duplicate the
   comment in `stripe-module-sync.server.ts` already documents, from a retry
   after a partial failure.
