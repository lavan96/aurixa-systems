import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EMPTY_RESUME_DETAILS,
  RESUME_COPY,
  formatReferenceInput,
  isApplicationReference,
  normaliseReference,
  readReferenceFromUrl,
  validateResumeDetails,
} from "./questionnaireResume";

test("formatReferenceInput shapes the reference as it is typed", () => {
  assert.equal(formatReferenceInput("ax7q2m4l9xz1"), "AX-7Q2M4L9XZ1");
  assert.equal(formatReferenceInput("AX-7Q2M4L9XZ1"), "AX-7Q2M4L9XZ1");
  assert.equal(formatReferenceInput("  ax-7q2m4l9xz1  "), "AX-7Q2M4L9XZ1");
  assert.equal(formatReferenceInput("7q2m4l9xz1"), "AX-7Q2M4L9XZ1", "the prefix is supplied");
  assert.equal(formatReferenceInput("AX"), "AX-", "the separator appears once there is a prefix");
  assert.equal(formatReferenceInput(""), "");
});

test("formatReferenceInput stops at the issued length and drops punctuation", () => {
  assert.equal(formatReferenceInput("AX-7Q2M4L9XZ1EXTRA"), "AX-7Q2M4L9XZ1");
  assert.equal(formatReferenceInput("ax_7q2m/4l9 xz1"), "AX-7Q2M4L9XZ1");
});

test("normaliseReference accepts what applicants realistically paste", () => {
  assert.equal(normaliseReference("AX-7Q2M4L9XZ1"), "AX-7Q2M4L9XZ1");
  assert.equal(normaliseReference("  ax-7q2m4l9xz1 "), "AX-7Q2M4L9XZ1");
  assert.equal(normaliseReference("ax 7q2m4l9xz1"), "AX-7Q2M4L9XZ1");
  assert.equal(normaliseReference("7Q2M4L9XZ1"), "AX-7Q2M4L9XZ1");
});

test("normaliseReference rejects anything that is not an issued reference", () => {
  assert.equal(normaliseReference(""), "");
  assert.equal(normaliseReference("AX-7Q2M4L9XZ"), "", "too short");
  assert.equal(normaliseReference("AX-7Q2M4L9XZ12"), "", "too long");
  assert.equal(normaliseReference("my application"), "");
  assert.equal(normaliseReference(undefined as unknown as string), "");
});

test("isApplicationReference only accepts the canonical form", () => {
  assert.equal(isApplicationReference("AX-7Q2M4L9XZ1"), true);
  assert.equal(isApplicationReference("ax-7q2m4l9xz1"), false);
  assert.equal(isApplicationReference("7Q2M4L9XZ1"), false);
  assert.equal(isApplicationReference(12345), false);
});

test("validateResumeDetails requires both factors", () => {
  const errors = validateResumeDetails(EMPTY_RESUME_DETAILS);
  assert.ok(errors.reference, "the reference is required");
  assert.ok(errors.workEmail, "the email is required — the reference alone is not a credential");

  assert.deepEqual(
    validateResumeDetails({ reference: "AX-7Q2M4L9XZ1", workEmail: "ada@example.com" }),
    {},
  );
});

test("validateResumeDetails explains a malformed reference", () => {
  const errors = validateResumeDetails({ reference: "AX-123", workEmail: "ada@example.com" });
  assert.match(errors.reference ?? "", /AX-7Q2M4L9XZ1/, "the message shows the expected shape");
  assert.equal(errors.workEmail, undefined);
});

test("validateResumeDetails checks the email", () => {
  const base = { reference: "AX-7Q2M4L9XZ1" };
  assert.ok(validateResumeDetails({ ...base, workEmail: "ada@example" }).workEmail);
  assert.ok(validateResumeDetails({ ...base, workEmail: "not an email" }).workEmail);
  assert.ok(validateResumeDetails({ ...base, workEmail: `${"a".repeat(320)}@example.com` }).workEmail);
  assert.equal(validateResumeDetails({ ...base, workEmail: " ada@example.com " }).workEmail, undefined);
});

test("readReferenceFromUrl picks up the reference the Stage 1 email links with", () => {
  const base = "https://aurixasystems.com.au/questionnaire";
  assert.equal(readReferenceFromUrl(new URL(`${base}?ref=AX-7Q2M4L9XZ1`)), "AX-7Q2M4L9XZ1");
  assert.equal(readReferenceFromUrl(new URL(`${base}?ref=ax-7q2m4l9xz1`)), "AX-7Q2M4L9XZ1");
  assert.equal(readReferenceFromUrl(new URL(`${base}?reference=AX-7Q2M4L9XZ1`)), "AX-7Q2M4L9XZ1");
});

test("readReferenceFromUrl ignores anything that is not an issued reference", () => {
  const base = "https://aurixasystems.com.au/questionnaire";
  assert.equal(readReferenceFromUrl(new URL(base)), "");
  assert.equal(readReferenceFromUrl(new URL(`${base}?ref=`)), "");
  assert.equal(readReferenceFromUrl(new URL(`${base}?ref=%3Cscript%3E`)), "");
  assert.equal(readReferenceFromUrl(new URL(`${base}?ref=AX-123`)), "");
});

test("every failure reason has copy the applicant can act on", () => {
  for (const [reason, copy] of Object.entries(RESUME_COPY)) {
    assert.ok(copy.length > 20, `${reason} needs a real message`);
    assert.doesNotMatch(copy, /undefined|null/, `${reason} copy is clean`);
  }
  assert.match(RESUME_COPY.invalid_reference, /reference and email/);
  assert.match(RESUME_COPY.not_configured, /contact/i);
});
