/**
 * Stage 2 readiness session — sealed same-origin cookie.
 *
 * The Stage 1 → Stage 2 handoff needs an access credential that the browser
 * cannot forge or read. This module seals the verified Stage 1 details into an
 * authenticated-encryption envelope (AES-256-GCM) keyed by a server-only
 * secret, which is then carried in an HttpOnly cookie on the Aurixa origin.
 *
 * Why sealed rather than a database row:
 *   * The cookie must be set for `aurixasystems.com.au`, so it has to be issued
 *     by a same-origin endpoint. A Supabase Edge Function on a Supabase domain
 *     cannot do that.
 *   * A sealed envelope needs no session table, so the handoff works before any
 *     database is provisioned.
 *
 * Trade-off, stated plainly: with no server-side session store there is no
 * revocation list, so a cookie copied out of a browser stays valid until its
 * two-hour expiry. `fingerprint()` exists so a revocation table can be added
 * later without changing the cookie format — persist only the hash, never the
 * sealed value itself.
 *
 * Nothing here computes or exposes a qualification score, priority class or
 * tier: this is access control for the questionnaire, not a decision.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Cookie name is fixed by the Stage 1 → Stage 2 contract. */
export const SESSION_COOKIE = "aurixa_readiness_session";

/** Server-side maximum lifetime, independent of the browser session. */
export const SESSION_MAX_AGE_SECONDS = 2 * 60 * 60;

const ENVELOPE_VERSION = "v1";
const IV_BYTES = 12;
const TAG_BYTES = 16;

/** Verified Stage 1 details carried by the session. */
export type ReadinessSessionPayload = {
  applicationId: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  organisationName: string;
  role: string;
  organisationType: string;
  annualVolume: string;
  /** Issued-at and expiry, seconds since epoch. */
  iat: number;
  exp: number;
  /** Random session id. Hash this if a revocation table is ever added. */
  jti: string;
};

export class SessionSecretMissingError extends Error {
  constructor() {
    super("READINESS_SESSION_SECRET is not configured");
    this.name = "SessionSecretMissingError";
  }
}

/**
 * Derives the encryption key. Fails closed when the secret is absent or too
 * weak — an unconfigured deployment must not issue sessions at all.
 */
function sessionKey(secret: string | undefined): Buffer {
  if (!secret || secret.length < 32) throw new SessionSecretMissingError();
  return createHash("sha256").update(secret, "utf8").digest();
}

const b64url = (buffer: Buffer) => buffer.toString("base64url");

/** Seals the payload into an opaque, tamper-evident cookie value. */
export function sealSession(
  payload: Omit<ReadinessSessionPayload, "iat" | "exp" | "jti">,
  secret: string | undefined,
  now: number = Date.now(),
): string {
  const key = sessionKey(secret);
  const issuedAt = Math.floor(now / 1000);

  const sealed: ReadinessSessionPayload = {
    ...payload,
    iat: issuedAt,
    exp: issuedAt + SESSION_MAX_AGE_SECONDS,
    jti: randomBytes(16).toString("hex"),
  };

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(sealed), "utf8"),
    cipher.final(),
  ]);

  return `${ENVELOPE_VERSION}.${b64url(Buffer.concat([iv, cipher.getAuthTag(), ciphertext]))}`;
}

/**
 * Opens a sealed session. Returns null for anything that is not a valid,
 * unexpired envelope produced by this secret — a forged, truncated, tampered,
 * foreign or stale cookie all fail identically.
 */
export function openSession(
  value: string | undefined,
  secret: string | undefined,
  now: number = Date.now(),
): ReadinessSessionPayload | null {
  if (!value) return null;

  let key: Buffer;
  try {
    key = sessionKey(secret);
  } catch {
    return null;
  }

  const [version, body] = value.split(".");
  if (version !== ENVELOPE_VERSION || !body) return null;

  try {
    const raw = Buffer.from(body, "base64url");
    if (raw.length <= IV_BYTES + TAG_BYTES) return null;

    const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(0, IV_BYTES));
    decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    const plaintext = Buffer.concat([
      decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)),
      decipher.final(),
    ]).toString("utf8");

    const payload = JSON.parse(plaintext) as ReadinessSessionPayload;

    // Server-side expiry still applies to a cookie that was restored or copied.
    if (typeof payload.exp !== "number" || payload.exp * 1000 <= now) return null;
    if (!payload.applicationId) return null;

    return payload;
  } catch {
    // Authentication-tag failure, malformed base64 or bad JSON.
    return null;
  }
}

/**
 * Hash of a sealed session value. If a revocation or audit table is added,
 * store this — never the sealed value, which is a live credential.
 */
export const fingerprint = (sealed: string) =>
  createHash("sha256").update(sealed, "utf8").digest("hex");

/** Constant-time comparison for any future shared-secret header checks. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

// ── Cookie serialisation ────────────────────────────────────────────────────

type CookieOptions = { secure: boolean };

/**
 * A browser-session cookie: no Max-Age, so it normally disappears when the
 * browser session ends. The two-hour server-side expiry inside the envelope is
 * what actually bounds its validity.
 */
export function serialiseSessionCookie(value: string, { secure }: CookieOptions): string {
  return [
    `${SESSION_COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

/** Expires the cookie immediately — used once Stage 2 is submitted. */
export function clearSessionCookie({ secure }: CookieOptions): string {
  return [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

/** Reads one cookie out of a raw Cookie header. */
export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return undefined;
}
