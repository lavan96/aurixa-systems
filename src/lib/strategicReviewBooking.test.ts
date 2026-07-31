import assert from "node:assert/strict";
import { test } from "node:test";
import {
  REVIEW_REFERENCE_STORAGE_KEY,
  buildSchedulingFallbackMailto,
  describeTimeZone,
  isApplicationReference,
  resolveApplicationReference,
  resolveBookingUrl,
} from "./strategicReviewBooking";

const BOOKINGS = "https://outlook.office365.com/owa/calendar/aurixa@example.com/bookings/";

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

test("resolveBookingUrl accepts an allowlisted Microsoft Bookings URL", () => {
  assert.equal(resolveBookingUrl(BOOKINGS), BOOKINGS);
  assert.equal(
    resolveBookingUrl("https://book.ms/b/aurixa"),
    "https://book.ms/b/aurixa",
  );
});

test("resolveBookingUrl rejects anything that is not a safe booking host", () => {
  assert.equal(resolveBookingUrl(""), null);
  assert.equal(resolveBookingUrl("   "), null);
  assert.equal(resolveBookingUrl(undefined), null);
  assert.equal(resolveBookingUrl(null), null);
  assert.equal(resolveBookingUrl("not a url"), null);
  assert.equal(resolveBookingUrl("http://outlook.office365.com/owa/"), null, "http is rejected");
  assert.equal(resolveBookingUrl("javascript:alert(1)"), null);
  assert.equal(resolveBookingUrl("https://evil.example.com/bookings/"), null);
  assert.equal(
    resolveBookingUrl("https://outlook.office365.com.evil.example/bookings/"),
    null,
    "a look-alike suffix is not an allowlisted host",
  );
  assert.equal(resolveBookingUrl("https://user:pass@book.ms/b/aurixa"), null, "credentials are rejected");
});

test("resolveBookingUrl allows subdomains of allowlisted hosts", () => {
  assert.equal(
    resolveBookingUrl("https://apac.outlook.office.com/owa/calendar/x/bookings/"),
    "https://apac.outlook.office.com/owa/calendar/x/bookings/",
  );
});

test("resolveBookingUrl layers prefill on without clobbering configured values", () => {
  const withPrefill = resolveBookingUrl(BOOKINGS, { name: "Ada Lovelace", email: "ada@example.com" });
  assert.ok(withPrefill);
  const parsed = new URL(withPrefill);
  assert.equal(parsed.searchParams.get("name"), "Ada Lovelace");
  assert.equal(parsed.searchParams.get("email"), "ada@example.com");

  const configured = resolveBookingUrl(`${BOOKINGS}?name=Preset`, { name: "Ada Lovelace" });
  assert.ok(configured);
  assert.equal(new URL(configured).searchParams.get("name"), "Preset");

  assert.equal(resolveBookingUrl(BOOKINGS, { name: "   ", email: "" }), BOOKINGS);
});

test("resolveBookingUrl strips control characters from prefill", () => {
  const url = resolveBookingUrl(BOOKINGS, { name: "Ada\r\nBcc: someone@example.com" });
  assert.ok(url);
  assert.equal(new URL(url).searchParams.get("name"), "AdaBcc: someone@example.com");
});

test("isApplicationReference only accepts the issued format", () => {
  assert.equal(isApplicationReference("AX-7Q2M4L9XZ1"), true);
  assert.equal(isApplicationReference("ax-7q2m4l9xz1"), false);
  assert.equal(isApplicationReference("AX-7Q2M4L9XZ"), false);
  assert.equal(isApplicationReference("AX-7Q2M4L9XZ12"), false);
  assert.equal(isApplicationReference(12345), false);
  assert.equal(isApplicationReference(undefined), false);
});

test("resolveApplicationReference reads, normalises and remembers a link reference", () => {
  const storage = new MemoryStorage();
  const reference = resolveApplicationReference(
    new URL("https://aurixasystems.com.au/schedule-strategic-review?ref=ax-7q2m4l9xz1"),
    storage,
  );
  assert.equal(reference, "AX-7Q2M4L9XZ1");
  assert.equal(storage.getItem(REVIEW_REFERENCE_STORAGE_KEY), "AX-7Q2M4L9XZ1");

  const remembered = resolveApplicationReference(
    new URL("https://aurixasystems.com.au/schedule-strategic-review"),
    storage,
  );
  assert.equal(remembered, "AX-7Q2M4L9XZ1");
});

test("resolveApplicationReference ignores malformed, repeated and absent references", () => {
  const storage = new MemoryStorage();
  const base = "https://aurixasystems.com.au/schedule-strategic-review";

  assert.equal(resolveApplicationReference(new URL(`${base}?ref=nope`), storage), "");
  assert.equal(storage.getItem(REVIEW_REFERENCE_STORAGE_KEY), null);
  assert.equal(resolveApplicationReference(new URL(`${base}?ref=AX-7Q2M4L9XZ1&ref=AX-0000000000`), storage), "");
  assert.equal(resolveApplicationReference(new URL(base), storage), "");
  assert.equal(resolveApplicationReference(new URL(base)), "", "storage is optional");
});

test("resolveApplicationReference drops a stored value that no longer parses", () => {
  const storage = new MemoryStorage();
  storage.setItem(REVIEW_REFERENCE_STORAGE_KEY, "tampered");
  assert.equal(
    resolveApplicationReference(new URL("https://aurixasystems.com.au/schedule-strategic-review"), storage),
    "",
  );
  assert.equal(storage.getItem(REVIEW_REFERENCE_STORAGE_KEY), null);
});

test("buildSchedulingFallbackMailto carries the reference and time zone", () => {
  const mailto = buildSchedulingFallbackMailto({
    address: "admin@aurixasystems.com.au",
    reference: "AX-7Q2M4L9XZ1",
    timeZone: describeTimeZone(new Date("2026-07-01T00:00:00Z"), "Australia/Brisbane"),
  });
  assert.ok(mailto.startsWith("mailto:admin@aurixasystems.com.au?"));
  const query = new URLSearchParams(mailto.slice(mailto.indexOf("?") + 1));
  assert.equal(query.get("subject"), "Strategic review scheduling - AX-7Q2M4L9XZ1");
  assert.match(query.get("body") ?? "", /Application reference: AX-7Q2M4L9XZ1/);
  assert.match(query.get("body") ?? "", /Australia\/Brisbane \(UTC\+10:00\)/);
});

test("buildSchedulingFallbackMailto omits an unissued reference", () => {
  const mailto = buildSchedulingFallbackMailto({ address: "admin@aurixasystems.com.au", reference: "tampered" });
  const query = new URLSearchParams(mailto.slice(mailto.indexOf("?") + 1));
  assert.equal(query.get("subject"), "Strategic review scheduling");
  assert.doesNotMatch(query.get("body") ?? "", /Application reference/);
});

test("buildSchedulingFallbackMailto carries a time the applicant already picked", () => {
  const mailto = buildSchedulingFallbackMailto({
    address: "admin@aurixasystems.com.au",
    requestedTime: "Friday 7 August 2026, 9:00 am – 9:30 am",
  });
  const body = new URLSearchParams(mailto.slice(mailto.indexOf("?") + 1)).get("body") ?? "";
  assert.match(body, /The time I would like to request:/);
  assert.match(body, /Friday 7 August 2026, 9:00 am/);
  assert.doesNotMatch(body, /Suitable times for me are/);
});
