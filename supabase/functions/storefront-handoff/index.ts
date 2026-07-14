// GET /storefront-handoff?h=<uuid> — forwards to Mission Control's handoff
// resolver (single-use, dashboard-minted purchase links).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { CORS, proxyToMc } from "../_shared/mc.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const search = new URL(req.url).search;
  return proxyToMc("/api/public/storefront/handoff", { method: "GET", search });
});
