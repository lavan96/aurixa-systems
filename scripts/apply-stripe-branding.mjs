#!/usr/bin/env node
/**
 * Apply the Aurixa brand to a Stripe account, from a terminal.
 *
 * Mission Control has an operator button for this (Billing → Pricing Catalog →
 * "Stripe brand identity"), and that is the normal route because it already
 * holds the secret key. This script exists for the first run — before that
 * deploy has shipped, and before the marketing site is serving the PNGs the
 * button fetches. It reads the images straight off disk instead, so the only
 * thing it needs is a key.
 *
 *   STRIPE_SECRET_KEY=sk_live_... node scripts/apply-stripe-branding.mjs
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/apply-stripe-branding.mjs --dry-run
 *
 * Deliberately dependency-free: `fetch`, `FormData` and `Blob` are all global
 * on Node 18+, and this file must be runnable in a checkout where nothing has
 * been installed.
 *
 * What it sets, and where each one shows up:
 *
 *   icon             square mark. Emails, Checkout, the customer portal, the
 *                    hosted invoice page and invoice PDFs.
 *   logo             the full lockup. Checkout, Payment Links, invoice PDFs.
 *   primary_color    #C89B3C, the Aurixa gold. Accents, buttons, headings.
 *   secondary_color  #040B16, the site's own ground. Stripe paints BACKGROUNDS
 *                    with this — it is the field that makes emails, Checkout
 *                    and the hosted pages dark, and it is the one that gets
 *                    put in the wrong slot.
 *
 * If Stripe refuses the account write — it restricts which accounts a key may
 * set `settings.branding` on — the uploads have already succeeded and the File
 * ids are printed. Those ids are exactly what the Dashboard's Branding page
 * takes, so the run is still worth something.
 */

import { readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Mirrors aurixa-mission-control/src/lib/brand/aurixa-brand.ts.
const BRANDING = { primary_color: "#C89B3C", secondary_color: "#040B16" };
const ASSETS = {
  icon: "brand-source/stripe/aurixa-stripe-icon-dark-512.png",
  logo: "brand-source/stripe/aurixa-stripe-logo-dark.png",
};
const MAX_BYTES = 512 * 1024;
const MIN_EDGE = 128;

const DRY_RUN = process.argv.includes("--dry-run");
const KEY = process.env.STRIPE_SECRET_KEY;

function die(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

/** Width and height straight out of the PNG IHDR chunk. */
function pngSize(buf) {
  const signature = "89504e470d0a1a0a";
  if (buf.subarray(0, 8).toString("hex") !== signature) die("not a PNG");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

async function stripe(method, path, body, host = "api.stripe.com") {
  const res = await fetch(`https://${host}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${KEY}`,
      ...(body instanceof URLSearchParams
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {}),
    },
    body,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? `${res.status} ${res.statusText}`);
  return json;
}

async function main() {
  if (!KEY && !DRY_RUN) die("STRIPE_SECRET_KEY is not set. Pass --dry-run to validate only.");

  // Read and check both marks before uploading either. A half-branded account
  // — new icon, old logo — is a worse state than an unbranded one, because
  // nothing about the page tells you which half is stale.
  const files = {};
  for (const [kind, relative] of Object.entries(ASSETS)) {
    const path = join(ROOT, relative);
    let buf;
    try {
      buf = readFileSync(path);
    } catch {
      die(`${relative} is missing. Run: python3 scripts/build-stripe-brand-assets.py`);
    }
    const { width, height } = pngSize(buf);
    const bytes = statSync(path).size;
    if (bytes > MAX_BYTES) die(`${relative} is ${Math.round(bytes / 1024)} KB; Stripe's cap is 512 KB`);
    if (Math.min(width, height) < MIN_EDGE) die(`${relative} is ${width}x${height}; Stripe's floor is 128px`);
    if (kind === "icon" && width !== height) die(`${relative} must be square; it is ${width}x${height}`);
    files[kind] = { buf, path: relative, width, height, bytes };
    console.log(`  ${kind.padEnd(5)} ${relative}  ${width}x${height}  ${Math.round(bytes / 1024)} KB`);
  }

  console.log(`  colour primary_color   ${BRANDING.primary_color}  (accents, buttons, headings)`);
  console.log(`  colour secondary_color ${BRANDING.secondary_color}  (BACKGROUNDS — this is the dark mode)`);

  if (DRY_RUN) {
    console.log("\n--dry-run: validated, nothing sent.");
    return;
  }

  const account = await stripe("GET", "/v1/account");
  const mode = KEY.startsWith("sk_live") ? "LIVE" : "test";
  console.log(`\n  → ${account.id} (${account.settings?.dashboard?.display_name ?? "?"}) in ${mode} mode`);

  const ids = {};
  for (const [kind, file] of Object.entries(files)) {
    const form = new FormData();
    form.append("purpose", "business_logo");
    form.append("file", new Blob([file.buf], { type: "image/png" }), file.path.split("/").pop());
    // File uploads go to a different host from the rest of the API.
    const uploaded = await stripe("POST", "/v1/files", form, "files.stripe.com");
    ids[kind] = uploaded.id;
    console.log(`  uploaded ${kind}: ${uploaded.id}`);
  }

  const body = new URLSearchParams({
    "settings[branding][icon]": ids.icon,
    "settings[branding][logo]": ids.logo,
    "settings[branding][primary_color]": BRANDING.primary_color,
    "settings[branding][secondary_color]": BRANDING.secondary_color,
  });

  try {
    const updated = await stripe("POST", `/v1/accounts/${account.id}`, body);
    console.log("\n✓ Branding applied:", JSON.stringify(updated.settings.branding, null, 2));
    console.log(
      "\nIt takes effect on everything Stripe renders from here on. Receipts and\n" +
        "invoices already delivered keep the styling they were sent with — Stripe\n" +
        "does not re-render a PDF it has already issued.",
    );
  } catch (err) {
    console.error(`\n✗ Stripe refused the account write: ${err.message}`);
    console.error(
      "\nThe uploads succeeded, so nothing is lost. Set these four by hand at\n" +
        "https://dashboard.stripe.com/settings/branding :\n" +
        `  icon             ${ids.icon}\n` +
        `  logo             ${ids.logo}\n` +
        `  brand colour     ${BRANDING.primary_color}\n` +
        `  accent colour    ${BRANDING.secondary_color}\n`,
    );
    process.exit(1);
  }
}

main().catch((err) => die(err.message));
