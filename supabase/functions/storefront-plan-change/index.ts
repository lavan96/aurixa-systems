// GET  /storefront-plan-change?uid=…|h=…  — plan changes this workspace has
//                                           not been shown yet.
// POST /storefront-plan-change            — acknowledge one, so it is shown
//                                           exactly once.
//
// Thin proxy: Mission Control owns the record and the acknowledgement, and the
// browser only ever talks to Aurixa Systems.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { CORS, json, proxyToMc } from "../_shared/mc.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  if (req.method === "GET") {
    const search = new URL(req.url).search;
    return proxyToMc("/api/public/storefront/plan-change", { method: "GET", search });
  }

  if (req.method === "POST") {
    const body = await req.text();
    return proxyToMc("/api/public/storefront/plan-change", { method: "POST", body });
  }

  return json({ ok: false, error: "method_not_allowed" }, 405);
});
