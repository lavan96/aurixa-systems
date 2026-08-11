# Pre-launch production readiness — metadata, discoverability, asset hygiene

What a stranger can tell about this site from outside it, and what was fixed.

The prompt was a checklist of twenty "tells" that a site was shipped fast and
never given a pre-launch pass. Rather than take it at face value, every item was
audited against the repository **and** against live production. Half of them
already passed. This documents the half that did not, and the two items where
the checklist was simply wrong about this codebase.

## Audit outcome

| # | Item | Before | Now |
| --- | --- | --- | --- |
| 1 | `.vercel.app` URL | pass — `aurixasystems.com.au` | unchanged |
| 2 | view-source empty | **fail** | **still fails — by design, see below** |
| 3 | no 404 page | **fail** — unknown paths rendered an empty `<main>` | `/*` route, `noindex` |
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
| 14 | no favicon | pass, but it was 548 KB | 1.6 KB PNG + apple-touch-icon |
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
right-click. The sixth is staged for open PR #21.

All six are now WebP at 1024 px with descriptive names: **10.67 MB → 0.35 MB, a
96.8% reduction.** They are resized, never cropped, because LYR-03 depends on an
`objectPosition` of `30% 25%`. `dist/` went from roughly 13 MB to 3.4 MB.

The favicon was `aurixa-symbol.svg` — 548 KB of base64 JPEG wrapped in an SVG,
fetched on every page load to paint a 16 px tab icon. It is now a 1.6 KB PNG.
The SVG is still used as an `<img>` on the homepage; shrinking that is separate
work.

`scripts/build-share-assets.py` builds the OG card and both icons, reusing the
ground, glow and placement helpers from `build-stripe-brand-assets.py` so the two
sets cannot drift.

## What this change does NOT fix

**The served HTML is still an empty `<div id="root">`.** Item 2 is unresolved and
needs prerendering.

The practical consequence is worth stating plainly: **link-preview scrapers do
not execute JavaScript.** Slack, LinkedIn, X, WhatsApp, iMessage and Discord all
read the served HTML only. So the per-route `og:`/`twitter:` tags this change
adds are invisible to every one of them — what they render is the *static*
card in `index.html`, which is why that card is complete and branded rather than
minimal. Googlebot does render JavaScript, so per-route titles, descriptions,
canonicals and `robots` directives do reach search, with a rendering delay.

**The 404 is still a soft 404.** `vercel.json` rewrites every unmatched path to
`index.html`, so the status is 200 before the bundle runs and an SPA cannot
revise it. This change fixes the user-visible dead end and adds `noindex`, which
is the accepted SPA mitigation. A genuine 404 status needs the rewrite narrowed
to an allowlist plus a static `404.html` — deliberately deferred, because
narrowing the rewrite means any future route added to `App.tsx` but not to
`vercel.json` would work on client-side navigation and hard-404 on direct link or
refresh. That belongs with prerendering, where it can be verified against a
preview deployment before it can break a live URL.

**The bundle is still one 936 KB chunk.** Vite warns about it on every build.
Code splitting changes the emitted asset graph, so it belongs with prerendering
too.

## Verification

```
npm run lint     # tsc --noEmit — clean
npm test         # 216 pass (was 203; 13 new registry guards)
npm run build    # clean; prebuild regenerates sitemap.xml + llms.txt
```

Driven through a real browser against `vite preview`, all 17 routes: exactly one
`<h1>`, no heading-level skips, a unique title, exactly one `description` and one
`og:title` — and after sixteen consecutive navigations the tag counts had not
grown, the title was not stale, and the `robots` directive had been correctly
removed on leaving a `noindex` page.

Static files verified served as `text/plain` and `text/xml` rather than falling
through to the SPA shell.

Still to check on a preview deployment, because it cannot be tested locally:

```bash
curl -sI $BASE/questionnaire | grep -i x-robots-tag     # expect noindex, nofollow
curl -sI $BASE/platform      | grep -i x-robots-tag     # expect nothing
```
