/**
 * /api/priority-access/session
 *
 *   GET    — verifies the readiness session cookie and returns the verified
 *            Stage 1 details for prefill. 401 when there is no valid session,
 *            which is what keeps `/questionnaire` locked for direct visitors.
 *   DELETE — invalidates the session once Stage 2 has been submitted.
 *
 * The response deliberately carries no score, priority class, tier or
 * qualification outcome. It is an access check and a prefill source only.
 */

import {
  isSameOrigin,
  isSecureContext,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http.js";
import {
  SESSION_COOKIE,
  clearSessionCookie,
  openSession,
  readCookie,
} from "../_lib/session.js";

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (!isSameOrigin(req)) return sendJson(res, 403, { authorised: false, error: "forbidden" });

  const sealed = readCookie(req.headers.cookie, SESSION_COOKIE);

  if (req.method === "DELETE") {
    // Always clear, whether or not the cookie was valid — this is the Stage 2
    // completion hook and must be idempotent.
    return sendJson(res, 200, { authorised: false, cleared: true }, [
      clearSessionCookie({ secure: isSecureContext(req) }),
    ]);
  }

  if (req.method !== "GET") {
    res.setHeader("allow", "GET, DELETE");
    return sendJson(res, 405, { authorised: false, error: "method_not_allowed" });
  }

  const session = openSession(sealed, process.env.READINESS_SESSION_SECRET);

  if (!session) {
    // Missing, forged, tampered, foreign and expired cookies are indistinguishable
    // in the response, so this endpoint cannot be used to probe for a session.
    const cookies = sealed ? [clearSessionCookie({ secure: isSecureContext(req) })] : [];
    return sendJson(res, 401, { authorised: false, error: "no_session" }, cookies);
  }

  return sendJson(res, 200, {
    authorised: true,
    applicationId: session.applicationId,
    expiresAt: new Date(session.exp * 1000).toISOString(),
    prefill: {
      applicationId: session.applicationId,
      firstName: session.firstName,
      lastName: session.lastName,
      workEmail: session.workEmail,
      organisationName: session.organisationName,
      role: session.role,
      organisationType: session.organisationType,
      annualVolume: session.annualVolume,
    },
  });
}
