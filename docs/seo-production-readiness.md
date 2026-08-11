# Pre-launch production readiness — metadata, discoverability, asset hygiene

What a stranger can tell about this site from outside it, and what was fixed.

The prompt was a checklist of twenty "tells" that a site was shipped fast and
never given a pre-launch pass. Rather than take it at face value, every item was
audited against the repository **and** against live production. Half of them
already passed. This documents the half that did not, the two items where the
checklist was simply wrong about this codebase, and the two problems it implied
but never named.

## Audit outcome

| # | Item | Before | Now |
| --- | --- | --- | --- |
| 1 | `.vercel.app` URL | pass — `aurixasystems.com.au` | unchanged |
| 2 | view-source empty | **fail** | prerendered — 11 public routes ship real markup |
| 3 | no 404 page | **fail** — unknown paths rendered an empty `<main>`, HTTP 200 | real `404.html`, genuine **HTTP 404** |
| 4 | default "Vite + React" title | pass | unchanged |
| 5 | same title on every page | **fail** — 3 of 19 routes set one | all 19 distinct |
| 6 | no meta description | **fail** | sitewide default + per route |
| 7 | no `og:image` | **fail** — no tags, no asset | 1200×630 card, full OG + Twitter |
| 8 | no structured data | **fail** | `Organization` + `WebSite` JSON-LD |
| 9 | multiple H1s | pass | unchanged |
| 10 | no H1 | pass — **the audit got this wrong first, see below** | unchanged |
| 11 | no canonical | **fail** | static default + per route |
| 12 | no `llms.txt` | **fail** | generated |
| 13 | AI blocked in `robots.txt` | **fail** — no `robots.txt` at all | published, AI agents allowed |
| 14 | no favicon | pass, but it was 535 KB | 1.6 KB PNG + apple-touch-icon |
| 15 | no `sitemap.xml` | **fail** | generated, 11 public routes |
| 16 | no `lang` | pass | refined to `en-AU` |
| 17 | missing alt text | pass | unchanged |
| 18 | public source maps | pass — none emitted | unchanged |
| 19 | leftover comments | pass | unchanged |
| 20 | *(obscured by the video's own overlay)* | — | — |

## Two corrections worth recording

**Every page already had exactly one `<h1>`.** The first pass reported seven
public pages with none, from a `grep '<h1'`. They are written `<motion.h1>` —
`motion/react` renders a real `<h1>` — so the grep missed all of them. Acting on
that finding would have added a *second* `<h1>` to seven pages, turning a passing
check into a failing one. The real defect was heading-level *skips*.

**`robots.txt` does not disallow the unlisted routes**, though the checklist
implies it should. Two reasons, both load-bearing:

1. `Disallow` and `noindex` defeat each other. A disallowed URL is never
   fetched, so the crawler never sees the `X-Robots-Tag` — and Google will still
   index a URL it finds linked, listing it without a description. Guaranteed
   de-indexing requires *permitting* the crawl and serving `noindex`.
2. `robots.txt` is world-readable at a well-known address. Listing
   `/pricing-mock` there would publish the URL of the page that charges real
   cards against the live Stripe account. Nothing in `src/` links to it.

The `X-Robots-Tag` headers in `vercel.json` are what actually keeps those pages
out of an index. `src/lib/routeMetadata.test.ts` asserts no unlisted path appears
in `robots.txt`, `sitemap.xml` or `llms.txt`.

## The route registry

`src/lib/routeMetadata.ts` is the single source of truth. One record per route:
path, title, description, and `indexable`.

That last field is read by four separate mechanisms — the sitemap, `llms.txt`,
the per-page `robots` directive, and the `X-Robots-Tag` list in `vercel.json`.
Keeping the decision in one table is what stops them drifting apart, because the
consequence of drift is not an SEO regression. `/pricing-mock` drives A$1
fixtures against the **live** Stripe account; `/questionnaire` and
`/schedule-strategic-review` are reached only by token; the `/pricing/*` receipts
carry a handoff token in the URL. Publishing any of them is an incident.

`routeMetadata.test.ts` fails if a route in `App.tsx` has no registry entry, so a
new route cannot ship without someone deciding whether it is indexable.

| Public (11) | Unlisted (8) |
| --- | --- |
| `/` `/platform` `/solutions` `/industries` `/about` `/resources` `/docs` `/contact` `/compliance` `/privacy-policy` `/terms-and-conditions` | `/pricing` `/pricing/success` `/pricing/cancel` `/pricing/card-saved` `/pricing-mock` `/questionnaire` `/schedule-strategic-review` `/feedback` |

## One metadata implementation

`src/lib/pageMetadata.ts` replaces three near-identical hand-rolled effects in
`LegalDocumentLayout`, `Questionnaire` and `ScheduleStrategicReview`.

All three used capture-previous / restore-on-unmount, which assumes the outgoing
route's cleanup runs before the incoming route's effect. That is the usual order
but not a guarantee — under StrictMode's double invocation or a concurrent
transition it inverts, and the outgoing page overwrites the title the incoming
page just set. The shared hook keys its restore on **identity**: it only reverts a
tag whose current value is still the one it wrote. Managed tags are stamped
`data-page-meta` so the hook never removes the static defaults from
`index.html`; it updates those in place and restores them.

## Files served from `public/`

`robots.txt`, `sitemap.xml` and `llms.txt` are plain files. No `vercel.json`
change was needed: Vercel's filesystem check runs *before* the catch-all rewrite,
which was confirmed empirically — production already served
`/brand/…png` as `image/png` while `/robots.txt` fell through to the rewrite and
returned HTML. The files were simply absent.

`sitemap.xml` and `llms.txt` are generated by `scripts/generate-seo-files.ts`,
wired to `prebuild`, and committed so they appear in review. A hand-maintained
sitemap is exactly how `/pricing-mock` would eventually get published.

`lastmod` and `changefreq` are deliberately omitted — `lastmod` would move on
every deploy whether or not the page changed, and a `lastmod` that cannot be
trusted is worse than none.

## Assets

Five of the six `ChatGPT Image Jun 5, 2026, 04_32_43 PM.png` files were **not**
orphans — they were the homepage's five capability card images, live in
production, their generator's filename visible in every network waterfall and
right-click.

The five are now WebP at 1024 px with descriptive names: **9.07 MB → 0.31 MB, a
96.6% reduction.** They are resized, never cropped, because LYR-03 depends on an
`objectPosition` of `30% 25%`. Counting the sixth file below, which was removed
outright, `public/brand/` sheds 10.4 MB and `dist/` goes from roughly 13 MB to
3.4 MB.

The sixth (`08_04_59`) was genuinely unreferenced. It was briefly carried
through the rename to preserve the intent of open PR #21, which proposed it for
the Enterprise Governance card — but that PR was investigated and closed as
superseded: commit `c370bef` (30 Jul) imported that very asset *and* chose
`09_23_40` for the card in the same commit, and that image is being kept. With
nothing left pointing at it, the sixth file was dropped rather than shipped. The
original PNG remains in git history if the decision is ever revisited.

### The two the checklist implied but never named

Neither of these is an SEO problem. Both were on every page.

**The favicon was 535 KB.** `aurixa-symbol.svg` was a base64-encoded JPEG
wrapped in an SVG — nothing about it was vector — fetched on every page load to
paint a 16 px tab icon, and again on the home page to fill a 96 px square. It is
deleted. The tab icon is a 1.6 KB PNG; the home page uses a 19 KB WebP.

**The logo was the build source.** `BrandLogo` renders in the header *and* the
footer of every page, and it was pointed at
`public/brand/aurixa-systems-logo-source.jpg` — a 401 KB, 2048 px original that
the brand scripts derive from. It now renders a 48 KB WebP, and the source has
moved to `brand-source/`, outside `public/`, so it is not deployed at all.

Sizing it is worth a note, because the obvious answer is wrong: the widest CSS
box is `w-[560px]`, but the image is `object-contain` against a 112 px height
and the lockup is ~3.16:1, so it actually paints at 354 px wide. Building for
the declared 560 would have shipped 60% more pixels than any display can use.

`scripts/build-share-assets.py` builds the OG card, both app icons and both
display marks, reusing the ground, glow and placement helpers from
`build-stripe-brand-assets.py` so the sets cannot drift. Every constraint it
depends on — exact OG dimensions, alpha present or absent, file size ceilings —
is asserted in the script rather than trusted.

The same reasoning removed one more thing: `public/brand/stripe/` held 814 KB of
PNGs that `apply-stripe-branding.mjs` uploads **from disk** to Stripe's Files
API. Nothing ever fetched them over HTTP. They were in the served directory by
accident and are now in `brand-source/stripe/` with the rest of the build
inputs.

**`public/brand/` is now 503 KB, down from 12.7 MB** — and every file left in it
is a derivative sized for the box it renders in.

## Prerendering — what closed item 2

`scripts/prerender.ts` runs after the client build and writes a real file for
every route: `dist/platform/index.html`, `dist/privacy-policy/index.html`, and
so on. `src/entry-server.tsx` renders the same `AppShell` under a `StaticRouter`
with `react-dom/server`, and the script rewrites the head tags per route from
the same registry everything else reads.

The result, measured on the built output:

| Route | Visible text in served HTML |
| --- | --- |
| `/` | 4,205 chars |
| `/platform` | 9,702 chars |
| `/privacy-policy` | 10,740 chars |
| `/questionnaire` | 590 chars (chrome only — correct, see below) |

**Unlisted routes prerender as a shell on purpose.** They are `lazy()` in
`App.tsx`, so `renderToString` emits the Suspense fallback rather than their
content. That is the right outcome twice over: a token-gated page has no
business publishing its markup, and the heavy pages stay out of the entry
bundle. They still get their own title, canonical and `noindex` baked into the
served bytes.

The corollary is load-bearing and easy to break: **an indexable route must be
imported eagerly.** Making one `lazy()` would silently ship an empty page to
every crawler — visually identical in a browser, because the client renders it
either way. The prerender script fails the build if an indexable route comes out
without an `<h1>`, and `routeMetadata.test.ts` asserts the same thing against
the built output.

**The output is not hydrated.** `src/main.tsx` still calls `createRoot`, which
discards the prerendered markup and renders fresh. That is deliberate:
`HeroBackgrounds` seeds its particle field from `Math.random()`, so server and
client markup differ by construction and `hydrateRoot` would spend its first
frame losing a reconciliation it cannot win. What the pass buys is the served
bytes — real content and correct metadata for anything that reads without
executing — plus a meaningful first paint before a 606 KB bundle arrives.

## The 404 is now a real 404

Because every route is a file on disk, `vercel.json` no longer needs its
catch-all rewrite, and it has been removed. Vercel's filesystem check answers
all 19 routes; anything else misses and gets `dist/404.html` with a genuine
**HTTP 404**.

Verified against a local server that mimics Vercel's resolution order — exact
file, then `path/index.html`, then `404.html` — across all 19 routes (200),
four shapes of unknown path including `/platform/deeper` (404), and both
token-carrying query strings (`?t=`, `?session_id=&h=`), which still resolve.

A catch-all rewrite would silently restore the soft 404, so
`routeMetadata.test.ts` fails if one reappears.

## Code splitting

The entry chunk was 936 KB and Vite warned about it on every build. Two changes:

- **Vendors are separated** — React, the router, `motion` and `lucide-react`
  each get their own chunk. They change far less often than the site does, so a
  copy deploy no longer makes every visitor re-download React to read a
  reworded paragraph.
- **Unlisted routes are `lazy()`** — Pricing and Questionnaire alone are ~4,000
  lines, and every visitor to the home page was downloading them.

Initial payload: **936 KB in one chunk → 606 KB across five**, four of which
are long-lived vendor files. The route chunks (Questionnaire 87 KB, Pricing
61 KB, ScheduleStrategicReview 46 KB, PricingMock 24 KB, Feedback 14 KB) now
load only when someone actually opens those pages. The build warning is gone.

## Known limits

**Prerendered markup is a snapshot, not a server render.** Nothing on a public
page depends on request state, so this is currently free — but a page that
needed per-request data would show the build-time version until the bundle took
over. Anything like that belongs on an unlisted route, which is a shell anyway.

**The build now needs a second Vite pass and a Node render.** `npm run build`
runs `vite build`, then `vite build --ssr`, then `tsx scripts/prerender.ts`.
It adds roughly a second. No browser is involved — prerendering uses
`react-dom/server`, not a headless Chromium — so CI needs nothing installed
that it did not already have.

**`X-Robots-Tag` headers cannot be verified locally.** They come from
`vercel.json` and only exist on a real deployment. The `noindex` is also baked
into each unlisted page's served HTML, so the directive is present either way,
but the header should still be checked once on the preview:

```bash
curl -sI $BASE/questionnaire | grep -i x-robots-tag   # expect noindex, nofollow
curl -sI $BASE/platform      | grep -i x-robots-tag   # expect nothing
```

## Verification

```
npm run lint     # tsc --noEmit — clean
npm test         # 220 pass (was 203; 17 registry and prerender guards)
npm run build    # clean; no chunk-size warning
```

Driven through a real browser against a server mimicking Vercel's resolution
order, all 20 routes including the 404: exactly one `<h1>`, no heading-level
skips, a unique title, and exactly one each of `description`, `og:title` and
`canonical` — with `robots` present on precisely the eight unlisted routes plus
the 404 and nowhere else. After sixteen consecutive client-side navigations the
tag counts had not grown and the title was not stale.

Status codes checked across all 19 routes (200), four shapes of unknown path
(404), and token-carrying query strings (200). Static files serve as
`text/plain` and `application/xml` rather than falling through to a shell.

The home page was screenshotted after a full client boot to confirm the new
lockup renders and nothing regressed visually.

Still to check on a preview deployment, because it cannot be tested locally:

```bash
curl -sI $BASE/questionnaire | grep -i x-robots-tag     # expect noindex, nofollow
curl -sI $BASE/platform      | grep -i x-robots-tag     # expect nothing
```
