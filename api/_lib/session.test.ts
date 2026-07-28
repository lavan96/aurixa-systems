/**
 * Readiness session sealing tests.
 *
 * This is the security boundary for the Stage 1 → Stage 2 handoff: if a sealed
 * cookie can be forged, tampered with, replayed past expiry or opened with the
 * wrong secret, `/questionnaire` is not actually gated.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  clearSessionCookie,
  fingerprint,
  openSession,
  readCookie,
  sealSession,
  serialiseSessionCookie,
} from "./session";

const SECRET = "a-test-secret-that-is-at-least-32-chars-long";
const OTHER_SECRET = "a-different-secret-also-32-chars-minimum!!";

const details = {
  applicationId: "AX-7Q2M4L9XZ1",
  firstName: "Jordan",
  lastName: "Reyes",
  workEmail: "jordan.reyes@example.com.au",
  organisationName: "Meridian Property Partners",
  role: "coo",
  organisationType: "property_advisory",
  annualVolume: "76_to_150",
};

test("a sealed session round-trips the verified Stage 1 details", () => {
  const sealed = sealSession(details, SECRET);
  const opened = openSession(sealed, SECRET);

  assert.ok(opened);
  assert.equal(opened.applicationId, details.applicationId);
  assert.equal(opened.workEmail, details.workEmail);
  assert.equal(opened.role, details.role);
  assert.equal(opened.organisationType, details.organisationType);
});

test("the cookie value is opaque — details are not readable from it", () => {
  const sealed = sealSession(details, SECRET);
  for (const secret of [details.workEmail, details.organisationName, details.applicationId, "Jordan"]) {
    assert.ok(!sealed.includes(secret), `${secret} leaked into the cookie value`);
  }
  // Not merely base64-encoded plaintext either.
  const decoded = Buffer.from(sealed.split(".")[1], "base64url").toString("utf8");
  assert.ok(!decoded.includes("Jordan"));
});

test("a session sealed with a different secret cannot be opened", () => {
  const sealed = sealSession(details, OTHER_SECRET);
  assert.equal(openSession(sealed, SECRET), null);
});

test("tampering with the envelope is rejected", () => {
  const sealed = sealSession(details, SECRET);
  const [version, body] = sealed.split(".");

  // Flip one byte of the ciphertext.
  const raw = Buffer.from(body, "base64url");
  raw[raw.length - 1] ^= 0x01;
  assert.equal(openSession(`${version}.${raw.toString("base64url")}`, SECRET), null);

  // Truncated, wrong version, empty and garbage values.
  assert.equal(openSession(`${version}.${body.slice(0, 12)}`, SECRET), null);
  assert.equal(openSession(`v2.${body}`, SECRET), null);
  assert.equal(openSession("", SECRET), null);
  assert.equal(openSession("not-a-session", SECRET), null);
  assert.equal(openSession(undefined, SECRET), null);
});

test("a forged value cannot be constructed without the secret", () => {
  const forged = Buffer.from(JSON.stringify({ ...details, exp: 9999999999 }), "utf8").toString("base64url");
  assert.equal(openSession(`v1.${forged}`, SECRET), null);
});

test("the server-side expiry bounds a restored or copied cookie", () => {
  const now = 1_800_000_000_000;
  const sealed = sealSession(details, SECRET, now);

  assert.ok(openSession(sealed, SECRET, now + 60_000), "valid a minute later");
  assert.ok(
    openSession(sealed, SECRET, now + (SESSION_MAX_AGE_SECONDS - 60) * 1000),
    "valid just inside two hours",
  );
  assert.equal(
    openSession(sealed, SECRET, now + (SESSION_MAX_AGE_SECONDS + 1) * 1000),
    null,
    "expired just past two hours",
  );
});

test("an unconfigured or weak secret refuses to issue a session", () => {
  assert.throws(() => sealSession(details, undefined), /READINESS_SESSION_SECRET/);
  assert.throws(() => sealSession(details, ""), /READINESS_SESSION_SECRET/);
  assert.throws(() => sealSession(details, "too-short"), /READINESS_SESSION_SECRET/);

  // And a session cannot be opened without it either.
  const sealed = sealSession(details, SECRET);
  assert.equal(openSession(sealed, undefined), null);
  assert.equal(openSession(sealed, "too-short"), null);
});

test("each seal is unique even for identical details", () => {
  const a = sealSession(details, SECRET);
  const b = sealSession(details, SECRET);
  assert.notEqual(a, b, "random IV and session id must make each seal distinct");
  assert.notEqual(openSession(a, SECRET).jti, openSession(b, SECRET).jti);
});

test("the cookie is HttpOnly, SameSite=Strict, path-scoped and browser-session", () => {
  const cookie = serialiseSessionCookie("v1.abc", { secure: true });
  assert.match(cookie, new RegExp(`^${SESSION_COOKIE}=v1\\.abc`));
  assert.ok(cookie.includes("HttpOnly"));
  assert.ok(cookie.includes("SameSite=Strict"));
  assert.ok(cookie.includes("Path=/"));
  assert.ok(cookie.includes("Secure"));
  // A browser-session cookie carries no Max-Age or Expires.
  assert.ok(!/Max-Age|Expires/.test(cookie));

  // Local http verification drops Secure so the cookie is still stored.
  assert.ok(!serialiseSessionCookie("v1.abc", { secure: false }).includes("Secure"));
});

test("clearing the cookie expires it immediately", () => {
  const cleared = clearSessionCookie({ secure: true });
  assert.ok(cleared.includes("Max-Age=0"));
  assert.ok(cleared.includes("HttpOnly"));
  assert.ok(cleared.includes("Secure"));
});

test("the cookie is read out of a shared Cookie header", () => {
  const header = `other=1; ${SESSION_COOKIE}=v1.value; another=2`;
  assert.equal(readCookie(header, SESSION_COOKIE), "v1.value");
  assert.equal(readCookie("other=1", SESSION_COOKIE), undefined);
  assert.equal(readCookie(undefined, SESSION_COOKIE), undefined);
  // A name that merely ends with the cookie name must not match.
  assert.equal(readCookie(`not_${SESSION_COOKIE}=nope`, SESSION_COOKIE), undefined);
});

test("fingerprints are stable hashes, never the credential itself", () => {
  const sealed = sealSession(details, SECRET);
  const hash = fingerprint(sealed);
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.equal(hash, fingerprint(sealed));
  assert.ok(!hash.includes(sealed));
});
