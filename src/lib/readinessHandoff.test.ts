import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
  READINESS_HANDOFF_STORAGE_KEY,
  clearReadinessHandoff,
  grantReadinessHandoff,
  readReadinessHandoff,
} from "./readinessHandoff";

const prefill = {
  applicationId: "AX-7Q2M4L9XZ1",
  firstName: "Ada",
  lastName: "Lovelace",
  workEmail: "ada@example.com",
  organisationName: "Analytical Engines",
  role: "founder_director",
  organisationType: "other",
  annualVolume: "26_to_75",
};

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

let storage: MemoryStorage;
let originalWindow: typeof globalThis.window | undefined;

beforeEach(() => {
  originalWindow = globalThis.window;
  storage = new MemoryStorage();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { sessionStorage: storage },
  });
});

afterEach(() => {
  if (originalWindow === undefined) delete (globalThis as { window?: unknown }).window;
  else Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
});

const setRecord = (overrides: Record<string, unknown> = {}) => {
  const createdAt = Date.now();
  storage.setItem(READINESS_HANDOFF_STORAGE_KEY, JSON.stringify({
    version: 1,
    authorised: true,
    createdAt,
    expiresAt: createdAt + 7_200_000,
    prefill,
    ...overrides,
  }));
};

test("a valid granted record grants access", () => {
  assert.equal(grantReadinessHandoff(prefill), true);
  assert.deepEqual(readReadinessHandoff(), prefill);
});

test("a missing record denies access", () => {
  assert.equal(readReadinessHandoff(), null);
});

test("an expired record denies access and is removed", () => {
  setRecord({ createdAt: Date.now() - 10_000, expiresAt: Date.now() - 1 });
  assert.equal(readReadinessHandoff(), null);
  assert.equal(storage.getItem(READINESS_HANDOFF_STORAGE_KEY), null);
});

test("malformed JSON denies access and is removed", () => {
  storage.setItem(READINESS_HANDOFF_STORAGE_KEY, "{not json");
  assert.equal(readReadinessHandoff(), null);
  assert.equal(storage.getItem(READINESS_HANDOFF_STORAGE_KEY), null);
});

test("wrong version denies access", () => {
  setRecord({ version: 2 });
  assert.equal(readReadinessHandoff(), null);
});

test("authorised other than true denies access", () => {
  setRecord({ authorised: false });
  assert.equal(readReadinessHandoff(), null);
});

test("invalid timestamps deny access", () => {
  for (const timestamps of [
    { createdAt: "now" },
    { createdAt: Number.NaN },
    { expiresAt: Number.POSITIVE_INFINITY },
    { createdAt: Date.now() + 600_000, expiresAt: Date.now() + 7_800_000 },
    { createdAt: Date.now(), expiresAt: Date.now() },
  ]) {
    setRecord(timestamps);
    assert.equal(readReadinessHandoff(), null);
  }
});

test("missing or invalid prefill denies access", () => {
  for (const invalid of [undefined, null, {}, { ...prefill, applicationId: "bad" }, { ...prefill, role: 1 }]) {
    setRecord({ prefill: invalid });
    assert.equal(readReadinessHandoff(), null);
  }
});

test("clearReadinessHandoff removes access", () => {
  assert.equal(grantReadinessHandoff(prefill), true);
  clearReadinessHandoff();
  assert.equal(readReadinessHandoff(), null);
});

test("storage exceptions fail closed without crashing", () => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { sessionStorage: { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } } },
  });
  assert.equal(grantReadinessHandoff(prefill), false);
  assert.equal(readReadinessHandoff(), null);
  assert.doesNotThrow(clearReadinessHandoff);
});
