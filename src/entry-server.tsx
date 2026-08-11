import { renderToString } from "react-dom/server";
// React Router 7 folded the old `react-router-dom/server` entry point back into
// the main module; `StaticRouter` is a top-level export now.
import { StaticRouter } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { AppShell } from "./App";

/**
 * The prerender entry point. Built separately with `vite build --ssr` and
 * driven by `scripts/prerender.ts`.
 *
 * This exists because the site is a client-rendered SPA, so the HTML actually
 * served was `<div id="root"></div>` and nothing else. Googlebot executes
 * JavaScript and coped; no link-preview scraper does. Slack, LinkedIn, X,
 * WhatsApp, iMessage and Discord all read the served bytes only, which meant
 * every URL shared anywhere unfurled as a bare link.
 *
 * The output is deliberately NOT hydrated. `src/main.tsx` still calls
 * `createRoot`, which discards this markup and renders the tree fresh. That is
 * the safe choice rather than a lazy one: `HeroBackgrounds` seeds its particle
 * field from `Math.random()`, so server and client markup differ by
 * construction, and `hydrateRoot` would spend the first frame reconciling a
 * mismatch it can never win. What this pass buys is the served HTML — real
 * content and correct per-route metadata for anything that reads bytes without
 * running them — plus a meaningful first paint before the bundle arrives.
 */
export function render(path: string): string {
  return renderToString(
    <MotionConfig reducedMotion="user">
      <StaticRouter location={path}>
        <AppShell />
      </StaticRouter>
    </MotionConfig>,
  );
}
