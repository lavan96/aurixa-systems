// GET /storefront-session?session_id=cs_…&(h=…|uid=…) — forwards to Mission
// Control's post-checkout receipt endpoint (fulfilment status + summary).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { CORS, proxyToMc } from "../_shared/mc.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const search = new URL(req.url).search;
  return proxyToMc("/api/public/storefront/session", { method: "GET", search });
});
