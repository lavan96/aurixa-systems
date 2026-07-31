// POST /capture-lead — stores a marketing-site submission in Aurixa Systems'
// own DB (Aurixa owns leads). Public endpoint; writes via the service role so
// the leads table stays locked down (no anon table access). Tolerant of the
// existing payload shapes (corporateEmail/fullName/etc.).
//
// All three stages of the priority-access funnel arrive here — the Stage 1
// application, the Stage 2 readiness questionnaire and the Stage 3 review
// booking — so the stage and the public application reference that ties them
// together are stored as columns rather than left inside the metadata blob.
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

/** The issued application reference, or null when the value is not one. */
const applicationId = (...values: unknown[]): string | null => {
  for (const value of values) {
    const cleaned = String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const body = cleaned.startsWith("AX") ? cleaned.slice(2) : cleaned;
    if (/^[A-Z0-9]{10}$/.test(body)) return `AX-${body}`;
  }
  return null;
};

/** Which point in the funnel this submission describes. */
const stageOf = (submissionType: unknown): number => {
  if (submissionType === "strategic_review_booking") return 3;
  if (submissionType === "business_readiness_questionnaire") return 2;
  return 1;
};

const timestamp = (v: unknown): string | null => {
  const raw = str(v);
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
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
    application_id: applicationId(body.applicationId, body.applicationReference),
    stage: stageOf(body.submissionType),
    submitted_at: timestamp(body.submittedAt),
    metadata: body,
  });
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true });
});
