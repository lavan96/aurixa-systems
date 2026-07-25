// Wallet flow (save a card): thin proxy to Mission Control, which mints a
// Stripe Checkout session in `setup` mode. Card details are entered on
// Stripe's hosted page — they never touch this backend.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { CORS, json, proxyToMc } from "../_shared/mc.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const body = await req.text();
  return proxyToMc("/api/public/storefront/setup", { method: "POST", body });
});
