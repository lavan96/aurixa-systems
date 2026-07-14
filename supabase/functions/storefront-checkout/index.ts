// POST /storefront-checkout — forwards to Mission Control's handoff/uid-scoped
// Stripe checkout. Body: { h? | uid?, mode, item_id, quantity }. MC mints the
// Stripe Checkout Session and returns { ok, url }.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { CORS, json, proxyToMc } from "../_shared/mc.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const body = await req.text();
  return proxyToMc("/api/public/storefront/checkout", { method: "POST", body });
});
