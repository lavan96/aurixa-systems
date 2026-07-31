import assert from "node:assert/strict";
import { test } from "node:test";
import {
  APPLICATION_REFERENCE_PATTERN,
  formatReferenceInput,
  isApplicationReference,
  normaliseReference,
  readReferenceFromUrl,
} from "./applicationReference";

test("the pattern is anchored, so a longer string never partially matches", () => {
  assert.equal(APPLICATION_REFERENCE_PATTERN.test("AX-7Q2M4L9XZ1"), true);
  assert.equal(APPLICATION_REFERENCE_PATTERN.test("XAX-7Q2M4L9XZ1"), false);
  assert.equal(APPLICATION_REFERENCE_PATTERN.test("AX-7Q2M4L9XZ1X"), false);
  assert.equal(APPLICATION_REFERENCE_PATTERN.test("AX-7Q2M4L9XZ1\nAX-0000000000"), false);
});

test("isApplicationReference only accepts the canonical form", () => {
  assert.equal(isApplicationReference("AX-7Q2M4L9XZ1"), true);
  for (const value of ["ax-7q2m4l9xz1", "7Q2M4L9XZ1", "AX-7Q2M4L9XZ", 12345, null, undefined, {}]) {
    assert.equal(isApplicationReference(value), false, String(value));
  }
});

test("normaliseReference accepts what applicants realistically paste", () => {
  for (const typed of ["AX-7Q2M4L9XZ1", "  ax-7q2m4l9xz1 ", "ax 7q2m4l9xz1", "7Q2M4L9XZ1", "AX_7Q2M/4L9 XZ1"]) {
    assert.equal(normaliseReference(typed), "AX-7Q2M4L9XZ1", typed);
  }
});

test("normaliseReference rejects anything that is not an issued reference", () => {
  for (const value of ["", "AX-7Q2M4L9XZ", "AX-7Q2M4L9XZ12", "my application", "AX-", "AX"]) {
    assert.equal(normaliseReference(value), "", value);
  }
  assert.equal(normaliseReference(undefined as unknown as string), "");
  assert.equal(normaliseReference(null as unknown as string), "");
});

test("normalising strips the characters an injection would need", () => {
  // The reference reaches an Airtable formula on the server, which sanitises
  // again. Nothing quote-shaped should survive this side either.
  assert.equal(normaliseReference("' OR 1=1 --"), "");
  assert.equal(normaliseReference("AX-7Q2M4L9XZ1'"), "AX-7Q2M4L9XZ1");
  assert.equal(formatReferenceInput("AX-7Q2'M4L9XZ1"), "AX-7Q2M4L9XZ1");
  assert.doesNotMatch(formatReferenceInput("<script>alert(1)</script>"), /[<>()/]/);
});

test("formatReferenceInput shapes the reference as it is typed", () => {
  assert.equal(formatReferenceInput("ax7q2m4l9xz1"), "AX-7Q2M4L9XZ1");
  assert.equal(formatReferenceInput("7q2m4l9xz1"), "AX-7Q2M4L9XZ1", "the prefix is supplied");
  assert.equal(formatReferenceInput("AX"), "AX-", "the separator appears once there is a prefix");
  assert.equal(formatReferenceInput("AX-7Q2M4L9XZ1EXTRA"), "AX-7Q2M4L9XZ1", "it stops at the issued length");
  assert.equal(formatReferenceInput(""), "");
});

test("readReferenceFromUrl takes only a reference it would accept anyway", () => {
  const base = "https://aurixasystems.com.au/schedule-strategic-review";
  assert.equal(readReferenceFromUrl(new URL(`${base}?ref=AX-7Q2M4L9XZ1`)), "AX-7Q2M4L9XZ1");
  assert.equal(readReferenceFromUrl(new URL(`${base}?ref=ax-7q2m4l9xz1`)), "AX-7Q2M4L9XZ1");
  assert.equal(readReferenceFromUrl(new URL(`${base}?reference=AX-7Q2M4L9XZ1`)), "AX-7Q2M4L9XZ1");
  for (const query of ["", "?ref=", "?ref=AX-123", "?ref=%3Cscript%3E", "?ref=' OR 1=1"]) {
    assert.equal(readReferenceFromUrl(new URL(`${base}${query}`)), "", query);
  }
});
