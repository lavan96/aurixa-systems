// Shared helpers for the storefront edge functions that front Mission Control.
// Mission Control stays authoritative for checkout/Stripe/handoffs; these
// functions are the storefront's own public surface (so the browser only ever
// talks to Aurixa Systems), forwarding to MC server-to-server.
export const MC_URL = (Deno.env.get("MISSION_CONTROL_URL") ??
  "https://mission-control.aurixasystems.com.au").replace(/\/+$/, "");

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}

/** Forward a request to a Mission Control storefront path, relaying its JSON. */
export async function proxyToMc(
  path: string,
  init: { method: "GET" | "POST"; body?: string; search?: string },
): Promise<Response> {
  const url = `${MC_URL}${path}${init.search ?? ""}`;
  try {
    const res = await fetch(url, {
      method: init.method,
      headers: { "content-type": "application/json", accept: "application/json" },
      body: init.body,
    });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { ...CORS, "content-type": "application/json" },
    });
  } catch (_e) {
    return json({ ok: false, error: "mission_control_unreachable" }, 502);
  }
}
