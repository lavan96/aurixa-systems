// GET  /storefront-feedback?h=…|uid=…  — the questions this workspace gets.
// POST /storefront-feedback            — the answers, and the 100 credits.
//
// Thin proxy: Mission Control owns the form, the grant rule and the hand-off
// to Make.com, and the browser only ever talks to Aurixa Systems.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { CORS, json, proxyToMc } from "../_shared/mc.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  if (req.method === "GET") {
    const search = new URL(req.url).search;
    return proxyToMc("/api/public/storefront/feedback", { method: "GET", search });
  }

  if (req.method === "POST") {
    return proxyToMc("/api/public/storefront/feedback", {
      method: "POST",
      body: await req.text(),
    });
  }

  return json({ ok: false, error: "method_not_allowed" }, 405);
});
