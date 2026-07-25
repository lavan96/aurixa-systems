// Card-saved receipt: thin proxy to Mission Control's wallet-status endpoint.
// Authorised by possession of the (session_id, credential) pair.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { CORS, json, proxyToMc } from "../_shared/mc.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") return json({ ok: false, error: "method_not_allowed" }, 405);
  const search = new URL(req.url).search;
  return proxyToMc("/api/public/storefront/wallet", { method: "GET", search });
});
