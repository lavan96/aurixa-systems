// GET /storefront-identity?uid=<billing_user_id> — forwards to Mission
// Control's identity resolver for the pricing page's "Purchasing for …" banner.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { CORS, proxyToMc } from "../_shared/mc.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const search = new URL(req.url).search;
  return proxyToMc("/api/public/storefront/identity", { method: "GET", search });
});
