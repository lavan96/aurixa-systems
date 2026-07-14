// Public storefront catalog, served from the local mirror (kept fresh by
// catalog-sync). Mirrors Mission Control's /api/public/storefront/catalog
// response shape exactly, so the pricing page can point here with a one-line
// base-URL change. Public (no auth) — safe, non-PII product/pricing data only.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const db = admin();
  try {
    const [plans, packs, setups, addons, roles, reports] = await Promise.all([
      db.from("catalog_plans").select("id,slug,name,description,price_cents,currency,seat_limit,metadata").order("price_cents", { ascending: true }),
      db.from("catalog_packs").select("id,slug,name,tokens,price_cents,currency,expires_after_days,metadata").order("tokens", { ascending: true }),
      db.from("catalog_setups").select("id,slug,name,description,price_min_cents,price_max_cents,currency,deliverables"),
      db.from("catalog_addons").select("id,slug,name,description,price_min_cents,price_max_cents,currency,billing_period,category,included_in_plans"),
      db.from("catalog_roles").select("id,slug,name,description,price_min_cents,price_max_cents,currency,permissions"),
      db.from("catalog_reports").select("id,slug,name,category,description,credit_cost"),
    ]);
    return new Response(
      JSON.stringify({
        ok: true,
        plans: plans.data ?? [],
        packs: packs.data ?? [],
        setups: setups.data ?? [],
        addons: addons.data ?? [],
        roles: roles.data ?? [],
        reports: reports.data ?? [],
      }),
      { headers: { ...cors, "content-type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...cors, "content-type": "application/json" },
    });
  }
});
