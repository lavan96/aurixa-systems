# Stripe branding

Stripe renders a large amount of customer-facing surface on Aurixa's behalf —
email receipts, invoice PDFs, the hosted invoice page, Checkout, Payment Links
and the customer portal. All of it is styled from **four fields** on
`account.settings.branding`. Before this work every one of those fields was
`null`, so every one of those surfaces arrived as an unbranded Stripe default.

This document covers the assets and the palette. The code that applies them
lives in Mission Control (`src/lib/brand/aurixa-brand.ts`,
`src/server/stripe-branding.server.ts`); the two are kept in step by
`aurixa-brand.test.ts`.

## The four fields

| Field             | Value                            | Where it shows up |
| ----------------- | -------------------------------- | ----------------- |
| `icon`            | `aurixa-stripe-icon-dark-512.png` | Emails, Checkout, portal, hosted invoice page, invoice PDFs |
| `logo`            | `aurixa-stripe-logo-dark.png`     | Checkout & Payment Links, invoice PDFs |
| `primary_color`   | `#C89B3C` — the Aurixa gold       | Accents, buttons and headings |
| `secondary_color` | `#040B16` — `--color-base-950`    | **Backgrounds**: emails, Checkout, portal, hosted pages |

### Why the dark colour is the *secondary* one

This is the one thing to get right, and it is silently reversible. Stripe calls
`primary_color` the "brand colour" and uses it for accents; it calls
`secondary_color` the "accent colour" and uses it as the **background** of
emails and hosted pages. So a dark-mode Aurixa is gold in `primary_color` and
the page ground in `secondary_color`.

Swapping them is accepted by the API without complaint and produces a light
page with near-black accents — valid, and not dark mode. `aurixa-brand.test.ts`
asserts the orientation for exactly this reason.

### Stripe's invoice PDF stays light

Not by choice: `secondary_color` is documented as not applying to invoice PDFs,
and invoice rendering templates — the other lever — carry only the memo, the
footer, custom fields and line-item grouping. There is no colour control. So
Stripe's PDF carries the identity through the logo and the brand colour, and
that is the whole of what can be done to it. It is also why the uploaded marks
are opaque dark tiles rather than transparent art (see below).

A genuinely dark tax invoice is a document Mission Control renders itself, from
figures Stripe issued, offered **beside** Stripe's PDF rather than instead of
it. See `aurixa-mission-control/docs/stripe-branding.md`.

## The assets

```
python3 scripts/build-stripe-brand-assets.py
```

Writes four PNGs to `public/brand/stripe/`, all derived from the single source
of truth `public/brand/aurixa-systems-logo-source.jpg` — which, despite the
extension, is a **PNG with a real alpha channel**. That matters: the mark is
gold artwork on transparency, so it can be composited onto the brand's own
ground rather than knocked out of a white one.

| File | Purpose |
| ---- | ------- |
| `aurixa-stripe-icon-dark-512.png` | 512×512, symbol on `#040B16`. Uploaded as `icon`. |
| `aurixa-stripe-logo-dark.png` | 1600×604, full lockup on `#040B16`. Uploaded as `logo`. |
| `aurixa-stripe-icon-transparent-512.png` | Not uploaded. For surfaces whose background we own. |
| `aurixa-stripe-logo-transparent.png` | Same. |

**Why the uploaded marks are opaque tiles.** Stripe places these images on
surfaces we do not control — a white invoice PDF, a white card on the hosted
invoice page, a dark email body. Gold on white is the weak case at roughly
2.5:1. A self-contained dark tile reads identically everywhere and keeps the
dark identity on the surfaces Stripe insists on painting light.

The build script asserts Stripe's limits (square icon, ≥128 px, <512 KB) rather
than trusting them — Stripe rejects an oversized file with a message that does
not name the file.

## Previewing before applying

```
python3 scripts/render-stripe-brand-preview.py [outdir]
```

Renders the email receipt, the hosted invoice page and the invoice PDF using
the exact PNGs and hex values that get uploaded, and writes self-contained HTML
plus PNGs (Chromium is found automatically if present). It is a **colour and
mark proof**, not a pixel-exact replica of Stripe's templates — Stripe owns
those; what we control is the four fields, the footer and the tax display.

## Applying

Two routes, both setting the same four fields.

**Normally — Mission Control.** Billing → Pricing Catalog → *Stripe brand
identity*. Preview reads the live account and writes nothing; Apply uploads the
marks and sets the fields. It fetches the PNGs from this site, so this site has
to be deployed first.

**First run, or from a terminal:**

```
STRIPE_SECRET_KEY=sk_live_... node scripts/apply-stripe-branding.mjs
STRIPE_SECRET_KEY=sk_test_... node scripts/apply-stripe-branding.mjs --dry-run
```

Dependency-free, and it reads the PNGs off disk rather than over HTTP — which
is what makes it usable before the site has shipped.

Stripe restricts which accounts an API key may write `settings.branding` on. If
it refuses, both paths have already uploaded the files and both print the File
ids; those are exactly what
[the Branding page](https://dashboard.stripe.com/settings/branding) takes.

## What branding does not reach

Applied branding styles what Stripe renders **from now on**. Receipts and
invoices already delivered keep the styling they were sent with — Stripe does
not re-render a PDF it has already issued.

Three further things are Dashboard-only and are not set by any of this:

- the account-level **default invoice footer** (Mission Control sets the footer
  per Customer and per one-off invoice instead, which is the only way to do it
  from code);
- the customer portal's **font and corner radius**;
- the **custom email domain**, without which Stripe's emails still send from
  `stripe.com`.
