import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BREAKAGE_OPTIONS,
  CATEGORY_OPTIONS,
  EMPTY_SUPPORT_TICKET,
  MAX_DESCRIPTION,
  MAX_IMPACT,
  MAX_REPORTER_NAME,
  MAX_SUBJECT,
  MAX_WORKSPACE_ID,
  buildSupportTicketPayload,
  validateSupportTicket,
  type SupportTicketMeta,
  type SupportTicketValues,
} from "./supportTicket";

/** A submission that must sail through every rule. */
const VALID: SupportTicketValues = {
  workspaceId: "ws_01HZX4T9",
  userId: "usr_42",
  reporterName: "Priya Naidu",
  reporterEmail: "priya@npcservices.com.au",
  category: "bug",
  breakageVector: "single_feature",
  subject: "Listings page shows no photographs",
  description: "Opened the Listings page this morning and every card renders without its photo.",
  impact: "Agents cannot present listings to clients.",
  website: "",
};

const META: SupportTicketMeta = {
  source: "npc-dashboard",
  url: "https://dashboard.npcservices.com.au/support?workspace_id=ws_01HZX4T9",
  userAgent: "Mozilla/5.0 (test)",
};

// ── validateSupportTicket ────────────────────────────────────────────────────

test("a valid ticket produces no errors", () => {
  assert.deepEqual(validateSupportTicket(VALID), {});
});

test("workspace id is required and bounded", () => {
  assert.ok(validateSupportTicket({ ...VALID, workspaceId: "" }).workspaceId);
  assert.ok(validateSupportTicket({ ...VALID, workspaceId: "   " }).workspaceId);
  assert.ok(
    validateSupportTicket({ ...VALID, workspaceId: "w".repeat(MAX_WORKSPACE_ID + 1) }).workspaceId,
  );
  assert.equal(
    validateSupportTicket({ ...VALID, workspaceId: "w".repeat(MAX_WORKSPACE_ID) }).workspaceId,
    undefined,
  );
});

test("reporter email is required, must look like an email and is bounded", () => {
  assert.ok(validateSupportTicket({ ...VALID, reporterEmail: "" }).reporterEmail);
  assert.ok(validateSupportTicket({ ...VALID, reporterEmail: "not-an-email" }).reporterEmail);
  assert.ok(validateSupportTicket({ ...VALID, reporterEmail: "@nothing" }).reporterEmail);
  assert.ok(validateSupportTicket({ ...VALID, reporterEmail: "nothing@" }).reporterEmail);
  assert.ok(
    validateSupportTicket({ ...VALID, reporterEmail: `${"a".repeat(320)}@x.com` }).reporterEmail,
  );
  assert.equal(validateSupportTicket({ ...VALID, reporterEmail: "a@b.co" }).reporterEmail, undefined);
});

test("reporter name is optional but bounded", () => {
  assert.equal(validateSupportTicket({ ...VALID, reporterName: "" }).reporterName, undefined);
  assert.ok(
    validateSupportTicket({ ...VALID, reporterName: "n".repeat(MAX_REPORTER_NAME + 1) })
      .reporterName,
  );
});

test("subject is required and must be 4..160 characters after trimming", () => {
  assert.ok(validateSupportTicket({ ...VALID, subject: "" }).subject);
  assert.ok(validateSupportTicket({ ...VALID, subject: "abc" }).subject);
  assert.ok(validateSupportTicket({ ...VALID, subject: "  abc  " }).subject);
  assert.ok(validateSupportTicket({ ...VALID, subject: "s".repeat(MAX_SUBJECT + 1) }).subject);
  assert.equal(validateSupportTicket({ ...VALID, subject: "abcd" }).subject, undefined);
});

test("description is required and must be 20..5000 characters after trimming", () => {
  assert.ok(validateSupportTicket({ ...VALID, description: "" }).description);
  assert.ok(validateSupportTicket({ ...VALID, description: "too short" }).description);
  assert.ok(
    validateSupportTicket({ ...VALID, description: "d".repeat(MAX_DESCRIPTION + 1) }).description,
  );
  assert.equal(
    validateSupportTicket({ ...VALID, description: "d".repeat(20) }).description,
    undefined,
  );
});

test("impact is optional but bounded", () => {
  assert.equal(validateSupportTicket({ ...VALID, impact: "" }).impact, undefined);
  assert.ok(validateSupportTicket({ ...VALID, impact: "i".repeat(MAX_IMPACT + 1) }).impact);
});

test("category and breakage vector must come from the option lists", () => {
  assert.ok(validateSupportTicket({ ...VALID, category: "" }).category);
  assert.ok(validateSupportTicket({ ...VALID, category: "meltdown" }).category);
  assert.ok(validateSupportTicket({ ...VALID, breakageVector: "" }).breakageVector);
  assert.ok(validateSupportTicket({ ...VALID, breakageVector: "sideways" }).breakageVector);
  for (const option of CATEGORY_OPTIONS) {
    assert.equal(validateSupportTicket({ ...VALID, category: option.value }).category, undefined);
  }
  for (const option of BREAKAGE_OPTIONS) {
    assert.equal(
      validateSupportTicket({ ...VALID, breakageVector: option.value }).breakageVector,
      undefined,
    );
  }
});

test("the empty form fails on exactly the required fields", () => {
  const errors = validateSupportTicket(EMPTY_SUPPORT_TICKET);
  assert.deepEqual(Object.keys(errors).sort(), [
    "description",
    "reporterEmail",
    "subject",
    "workspaceId",
  ]);
});

// ── buildSupportTicketPayload ────────────────────────────────────────────────

test("payload carries the contract shape with trimmed values", () => {
  const payload = buildSupportTicketPayload(
    {
      ...VALID,
      workspaceId: "  ws_01HZX4T9  ",
      reporterEmail: "  Priya@NPCServices.com.au ",
      subject: "  Listings page shows no photographs  ",
      description: `  ${VALID.description}  `,
    },
    META,
  );

  assert.deepEqual(payload, {
    version: 1,
    workspace_id: "ws_01HZX4T9",
    user_id: "usr_42",
    reporter_name: "Priya Naidu",
    reporter_email: "priya@npcservices.com.au",
    category: "bug",
    breakage_vector: "single_feature",
    subject: "Listings page shows no photographs",
    description: VALID.description,
    impact: "Agents cannot present listings to clients.",
    client_meta: {
      source: "npc-dashboard",
      url: META.url,
      user_agent: META.userAgent,
    },
  });
});

test("empty optionals are omitted, never sent as empty strings", () => {
  const payload = buildSupportTicketPayload(
    { ...VALID, userId: "", reporterName: "   ", impact: "" },
    META,
  );
  assert.ok(!("user_id" in payload));
  assert.ok(!("reporter_name" in payload));
  assert.ok(!("impact" in payload));
});

test("client_meta source is constrained to the two allowed values", () => {
  const direct = buildSupportTicketPayload(VALID, { ...META, source: "direct" });
  assert.equal(direct.client_meta.source, "direct");
  const smuggled = buildSupportTicketPayload(VALID, {
    ...META,
    source: "npc-dashboard-extra" as unknown as "direct",
  });
  assert.equal(smuggled.client_meta.source, "direct");
});

test("client_meta url and user_agent are clamped to the contract bounds", () => {
  const payload = buildSupportTicketPayload(VALID, {
    source: "direct",
    url: `https://example.com/${"a".repeat(600)}`,
    userAgent: "u".repeat(500),
  });
  assert.equal(payload.client_meta.url.length, 500);
  assert.equal(payload.client_meta.user_agent.length, 400);
});

test("an overlong URL-supplied user_id is clamped rather than rejected", () => {
  const payload = buildSupportTicketPayload({ ...VALID, userId: "u".repeat(200) }, META);
  assert.equal(payload.user_id?.length, 120);
});

test("the honeypot never reaches the payload", () => {
  const payload = buildSupportTicketPayload({ ...VALID, website: "https://spam.example" }, META);
  assert.ok(!("website" in payload));
});
