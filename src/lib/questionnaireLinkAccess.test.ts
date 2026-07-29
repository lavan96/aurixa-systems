import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
  QUESTIONNAIRE_LINK_STORAGE_KEY,
  clearQuestionnaireLinkAccess,
  hasQuestionnaireLinkSession,
  resolveQuestionnaireLink,
} from "./questionnaireLinkAccess";

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const NOW = Date.parse("2026-07-29T12:00:00.000Z");
const TOKEN_A = "alpha_DYNAMIC-token_12345";
const TOKEN_B = "Z9_unrelated-access-key-987654321";
const EXPIRY_A = "2026-07-30T15:48:54.156Z";
const EXPIRY_B = "2026-08-14T03:20:00.000Z";
let storage: MemoryStorage;
let originalWindow: typeof globalThis.window | undefined;

beforeEach(() => {
  originalWindow = globalThis.window;
  storage = new MemoryStorage();
  Object.defineProperty(globalThis, "window", { configurable: true, value: { sessionStorage: storage } });
});

afterEach(() => {
  if (originalWindow === undefined) delete (globalThis as { window?: unknown }).window;
  else Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
});

const url = (query = "") => new URL(`https://aurixasystems.com.au/questionnaire${query}`);
const dynamicQuery = (token: string, expiry: string) =>
  `?token=${encodeURIComponent(token)}&expires=${encodeURIComponent(expiry)}`;

test("first valid dynamic token opens the questionnaire", () => {
  assert.equal(resolveQuestionnaireLink(url(dynamicQuery(TOKEN_A, EXPIRY_A)), NOW), "link");
});

test("a different valid dynamic token and future expiry also open it", () => {
  assert.equal(resolveQuestionnaireLink(url(dynamicQuery(TOKEN_B, EXPIRY_B)), NOW), "link");
});

test("the example values are not required", () => {
  const unrelatedExpiry = "2028-01-02T04:05:06.000Z";
  assert.equal(resolveQuestionnaireLink(url(dynamicQuery("completely_new-token_456", unrelatedExpiry)), NOW), "link");
});

for (const [name, query] of [
  ["empty token", `?token=&expires=${encodeURIComponent(EXPIRY_A)}`],
  ["token shorter than 16 characters", `?token=short-token&expires=${encodeURIComponent(EXPIRY_A)}`],
  ["token containing invalid characters", `?token=${encodeURIComponent("invalid.token.value")}&expires=${encodeURIComponent(EXPIRY_A)}`],
  ["missing token", `?expires=${encodeURIComponent(EXPIRY_A)}`],
  ["malformed expiry", `?token=${TOKEN_A}&expires=not-a-date`],
  ["past expiry", dynamicQuery(TOKEN_A, "2026-07-29T11:59:59.999Z")],
  ["duplicate token parameters", `${dynamicQuery(TOKEN_A, EXPIRY_A)}&token=${TOKEN_B}`],
  ["duplicate expires parameters", `${dynamicQuery(TOKEN_A, EXPIRY_A)}&expires=${encodeURIComponent(EXPIRY_B)}`],
] as const) {
  test(`${name} is rejected`, () => {
    assert.equal(resolveQuestionnaireLink(url(query), NOW), "rejected");
  });
}

test("a token without expiry remains available to legacy backend authorisation", () => {
  assert.equal(resolveQuestionnaireLink(url(`?token=${TOKEN_A}`), NOW), "absent");
});

test("a valid link stores its supplied dynamic expiry", () => {
  resolveQuestionnaireLink(url(dynamicQuery(TOKEN_A, EXPIRY_B)), NOW);
  assert.deepEqual(JSON.parse(storage.getItem(QUESTIONNAIRE_LINK_STORAGE_KEY)!), {
    version: 1,
    authorised: true,
    createdAt: new Date(NOW).toISOString(),
    expiresAt: EXPIRY_B,
  });
});

test("refresh restores access using sessionStorage", () => {
  resolveQuestionnaireLink(url(dynamicQuery(TOKEN_A, EXPIRY_A)), NOW);
  assert.equal(resolveQuestionnaireLink(url(), NOW + 1_000), "session");
});

test("stored access expires at its original dynamic expiry", () => {
  resolveQuestionnaireLink(url(dynamicQuery(TOKEN_A, EXPIRY_A)), NOW);
  assert.equal(hasQuestionnaireLinkSession(Date.parse(EXPIRY_A)), false);
  assert.equal(storage.getItem(QUESTIONNAIRE_LINK_STORAGE_KEY), null);
});

test("malformed sessionStorage records are deleted", () => {
  const malformedRecords = [
    "{not json",
    JSON.stringify({ version: 1, authorised: true }),
    JSON.stringify({ version: 1, authorised: true, createdAt: "bad", expiresAt: EXPIRY_A }),
    JSON.stringify({ version: 1, authorised: true, createdAt: EXPIRY_B, expiresAt: EXPIRY_A }),
    JSON.stringify({ version: 1, authorised: true, createdAt: EXPIRY_A, expiresAt: EXPIRY_A }),
  ];
  for (const record of malformedRecords) {
    storage.setItem(QUESTIONNAIRE_LINK_STORAGE_KEY, record);
    assert.equal(hasQuestionnaireLinkSession(NOW), false);
    assert.equal(storage.getItem(QUESTIONNAIRE_LINK_STORAGE_KEY), null);
  }
});

test("direct questionnaire access remains locked by the link gateway", () => {
  assert.equal(resolveQuestionnaireLink(url(), NOW), "absent");
});

test("successful-submission cleanup removes link access", () => {
  resolveQuestionnaireLink(url(dynamicQuery(TOKEN_A, EXPIRY_A)), NOW);
  clearQuestionnaireLinkAccess();
  assert.equal(hasQuestionnaireLinkSession(NOW), false);
});
