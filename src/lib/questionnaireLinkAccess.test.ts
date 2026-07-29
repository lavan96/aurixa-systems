import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
  QUESTIONNAIRE_LINK_EXPIRES,
  QUESTIONNAIRE_LINK_STORAGE_KEY,
  QUESTIONNAIRE_LINK_TOKEN,
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

const beforeExpiry = Date.parse(QUESTIONNAIRE_LINK_EXPIRES) - 1_000;
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
const exactQuery = `?token=${QUESTIONNAIRE_LINK_TOKEN}&expires=${encodeURIComponent(QUESTIONNAIRE_LINK_EXPIRES)}`;

test("exact link opens the questionnaire and creates the fixed session", () => {
  assert.equal(resolveQuestionnaireLink(url(exactQuery), beforeExpiry), "link");
  assert.equal(hasQuestionnaireLinkSession(beforeExpiry), true);
});

test("incorrect token is blocked", () => {
  assert.equal(resolveQuestionnaireLink(url(`?token=wrong&expires=${encodeURIComponent(QUESTIONNAIRE_LINK_EXPIRES)}`), beforeExpiry), "rejected");
});

test("missing token is blocked", () => {
  assert.equal(resolveQuestionnaireLink(url(`?expires=${encodeURIComponent(QUESTIONNAIRE_LINK_EXPIRES)}`), beforeExpiry), "rejected");
});

test("incorrect expiry is blocked", () => {
  assert.equal(resolveQuestionnaireLink(url(`?token=${QUESTIONNAIRE_LINK_TOKEN}&expires=2027-01-01T00%3A00%3A00.000Z`), beforeExpiry), "rejected");
});

test("expired link is blocked", () => {
  assert.equal(resolveQuestionnaireLink(url(exactQuery), Date.parse(QUESTIONNAIRE_LINK_EXPIRES)), "rejected");
});

test("valid link session survives refresh", () => {
  resolveQuestionnaireLink(url(exactQuery), beforeExpiry);
  assert.equal(resolveQuestionnaireLink(url(), beforeExpiry), "session");
});

test("stored access does not survive beyond the fixed expiry", () => {
  resolveQuestionnaireLink(url(exactQuery), beforeExpiry);
  assert.equal(hasQuestionnaireLinkSession(Date.parse(QUESTIONNAIRE_LINK_EXPIRES)), false);
  assert.equal(storage.getItem(QUESTIONNAIRE_LINK_STORAGE_KEY), null);
});

test("malformed stored access is deleted", () => {
  storage.setItem(QUESTIONNAIRE_LINK_STORAGE_KEY, JSON.stringify({ version: 1, authorised: true }));
  assert.equal(hasQuestionnaireLinkSession(beforeExpiry), false);
  assert.equal(storage.getItem(QUESTIONNAIRE_LINK_STORAGE_KEY), null);
});

test("direct questionnaire access remains blocked by the link gateway", () => {
  assert.equal(resolveQuestionnaireLink(url(), beforeExpiry), "absent");
});

test("clearing access after successful submission removes the session", () => {
  resolveQuestionnaireLink(url(exactQuery), beforeExpiry);
  clearQuestionnaireLinkAccess();
  assert.equal(hasQuestionnaireLinkSession(beforeExpiry), false);
});
