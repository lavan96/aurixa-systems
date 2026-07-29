import type { ReadinessPrefill } from "./readinessQuestionnaireService";

export const READINESS_HANDOFF_STORAGE_KEY = "aurixa_readiness_access";

const HANDOFF_VERSION = 1;
const HANDOFF_LIFETIME_MS = 2 * 60 * 60 * 1_000;
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1_000;
const APPLICATION_ID_PATTERN = /^AX-[A-Z0-9]{10}$/;
const PREFILL_KEYS: (keyof ReadinessPrefill)[] = [
  "applicationId",
  "firstName",
  "lastName",
  "workEmail",
  "organisationName",
  "role",
  "organisationType",
  "annualVolume",
];

type ReadinessHandoffRecord = {
  version: 1;
  authorised: true;
  createdAt: number;
  expiresAt: number;
  prefill: ReadinessPrefill;
};

const validPrefill = (value: unknown): value is ReadinessPrefill => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prefill = value as Record<string, unknown>;
  return (
    Object.keys(prefill).length === PREFILL_KEYS.length &&
    PREFILL_KEYS.every((key) => typeof prefill[key] === "string") &&
    APPLICATION_ID_PATTERN.test(prefill.applicationId as string)
  );
};

/** Grants the current tab two hours of access after Stage 1 is accepted. */
export function grantReadinessHandoff(prefill: ReadinessPrefill): boolean {
  if (!validPrefill(prefill)) return false;

  try {
    const createdAt = Date.now();
    const record: ReadinessHandoffRecord = {
      version: HANDOFF_VERSION,
      authorised: true,
      createdAt,
      expiresAt: createdAt + HANDOFF_LIFETIME_MS,
      prefill: { ...prefill },
    };
    window.sessionStorage.setItem(READINESS_HANDOFF_STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

/** Returns valid Stage 1 prefill, failing closed and removing invalid records. */
export function readReadinessHandoff(): ReadinessPrefill | null {
  try {
    const stored = window.sessionStorage.getItem(READINESS_HANDOFF_STORAGE_KEY);
    if (stored === null) return null;

    const value = JSON.parse(stored) as Partial<ReadinessHandoffRecord>;
    const now = Date.now();
    const valid =
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === 5 &&
      value.version === HANDOFF_VERSION &&
      value.authorised === true &&
      typeof value.createdAt === "number" &&
      Number.isFinite(value.createdAt) &&
      typeof value.expiresAt === "number" &&
      Number.isFinite(value.expiresAt) &&
      value.expiresAt > value.createdAt &&
      value.expiresAt - value.createdAt === HANDOFF_LIFETIME_MS &&
      value.createdAt <= now + MAX_FUTURE_CLOCK_SKEW_MS &&
      value.expiresAt > now &&
      validPrefill(value.prefill);

    if (!valid) {
      clearReadinessHandoff();
      return null;
    }
    return { ...value.prefill };
  } catch {
    clearReadinessHandoff();
    return null;
  }
}

/** Removes this tab's Stage 1 handoff without affecting other access modes. */
export function clearReadinessHandoff(): void {
  try {
    window.sessionStorage.removeItem(READINESS_HANDOFF_STORAGE_KEY);
  } catch {
    // Storage can be unavailable; access still fails closed.
  }
}
