// POST /capture-lead — stores a marketing-site contact lead in Aurixa Systems'
// own DB (Aurixa owns leads). Public endpoint; writes via the service role so
// the leads table stays locked down (no anon table access). Tolerant of the
// existing payload shapes (corporateEmail/fullName/etc.).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}

const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, 2000) : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const email = String(body.email ?? body.corporateEmail ?? "").trim().toLowerCase();
  if (!email || !email.includes("@") || email.length > 320) {
    return json({ ok: false, error: "invalid_email" }, 400);
  }

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { error } = await db.from("leads").insert({
    email,
    name: str(body.name ?? body.fullName ?? body.full_name),
    company: str(body.company ?? body.companyName ?? body.company_name),
    phone: str(body.phone ?? body.phoneNumber ?? body.phone_number),
    message: str(body.message ?? body.notes ?? body.enquiry),
    source: str(body.source ?? body.page) ?? "website",
    metadata: body,
  });
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true });
});
