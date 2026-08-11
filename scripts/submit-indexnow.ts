/**
 * Tell the IndexNow search engines that the public pages changed.
 *
 * IndexNow is the only submission path that can be automated from a build box:
 * one unauthenticated POST, ownership proved by hosting a key file, no OAuth and
 * no verified property. **Bing, Yandex, Seznam and Naver share a single
 * endpoint** — submitting to one submits to all of them.
 *
 * **Google does not participate.** Its sitemap ping endpoint was retired and now
 * returns 404, and the Search Console API needs OAuth against a property a human
 * has verified. So Google submission stays a one-off manual step; see the
 * Search Console section of docs/seo-production-readiness.md.
 *
 * Deliberately NOT wired into `postbuild`. The key file has to be live before a
 * ping means anything, and re-submitting an unchanged URL list on every deploy
 * is how a host gets throttled. Run it when the public pages actually change:
 *
 *     npm run submit-indexnow            # submit
 *     npm run submit-indexnow -- --dry   # print what would be sent
 */

import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SITE_ORIGIN, absoluteUrl, indexableRoutes } from "../src/lib/routeMetadata.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENDPOINT = "https://api.indexnow.org/indexnow";
const HOST = new URL(SITE_ORIGIN).host;

/** The key is whichever 8–128 hex-named .txt sits at the site root. */
function resolveKey(): string {
  const candidates = readdirSync(join(ROOT, "public"))
    .filter((name) => /^[0-9a-f]{8,128}\.txt$/.test(name))
    .map((name) => name.replace(/\.txt$/, ""));

  if (candidates.length === 0) {
    throw new Error(
      "no IndexNow key file in public/. Create one named <key>.txt whose only " +
        "content is the key itself (8-128 hex characters).",
    );
  }
  if (candidates.length > 1) {
    throw new Error(`more than one IndexNow key file in public/: ${candidates.join(", ")}`);
  }
  return candidates[0];
}

const key = resolveKey();
// Only `indexable: true` routes, from the same registry the sitemap is built
// from. A gated route cannot be submitted here for the same reason it cannot
// reach the sitemap: the field that decides is the same field.
const urlList = indexableRoutes().map((route) => absoluteUrl(route.path));
const dryRun = process.argv.includes("--dry");

const body = {
  host: HOST,
  key,
  keyLocation: `${SITE_ORIGIN}/${key}.txt`,
  urlList,
};

console.log(`IndexNow → ${ENDPOINT}`);
console.log(`  host:        ${body.host}`);
console.log(`  keyLocation: ${body.keyLocation}`);
console.log(`  urls:        ${urlList.length}`);
for (const url of urlList) console.log(`    ${url}`);

if (dryRun) {
  console.log("\n--dry given; nothing submitted.");
  process.exit(0);
}

// The key file must already be reachable — the endpoint fetches it to verify
// ownership, and a 403 here almost always means the deploy has not landed yet.
const keyCheck = await fetch(body.keyLocation);
const served = keyCheck.ok ? (await keyCheck.text()).trim() : "";
if (served !== key) {
  console.error(
    `\nFAIL ${body.keyLocation} returned ${keyCheck.status}` +
      (keyCheck.ok ? ` with unexpected contents` : "") +
      `.\nDeploy the key file before submitting — IndexNow fetches it to prove ownership.`,
  );
  process.exit(1);
}
console.log(`\n  key file verified live (${keyCheck.status})`);

const response = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});

// 200 accepted, 202 accepted but the key is still being validated. Both fine.
if (response.status === 200 || response.status === 202) {
  console.log(`  submitted: HTTP ${response.status}`);
  process.exit(0);
}
console.error(`\nFAIL HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
process.exit(1);
