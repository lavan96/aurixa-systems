export const QUESTIONNAIRE_LINK_STORAGE_KEY = "aurixa_questionnaire_link_access";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,256}$/;

type LinkAccessRecord = {
  version: 1;
  authorised: true;
  createdAt: string;
  expiresAt: string;
};

export type QuestionnaireLinkAccess = "link" | "session" | "rejected" | "absent";

export function clearQuestionnaireLinkAccess(): void {
  try {
    window.sessionStorage.removeItem(QUESTIONNAIRE_LINK_STORAGE_KEY);
  } catch {
    // Storage may be disabled. Removing access still fails closed.
  }
}

/** Reads a dynamic-link session and fails closed if any field is invalid. */
export function hasQuestionnaireLinkSession(now = Date.now()): boolean {
  try {
    const stored = window.sessionStorage.getItem(QUESTIONNAIRE_LINK_STORAGE_KEY);
    if (stored === null) return false;
    const value: unknown = JSON.parse(stored);

    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      clearQuestionnaireLinkAccess();
      return false;
    }

    const record = value as Partial<LinkAccessRecord>;
    const createdAt = typeof record.createdAt === "string" ? Date.parse(record.createdAt) : Number.NaN;
    const expiresAt = typeof record.expiresAt === "string" ? Date.parse(record.expiresAt) : Number.NaN;
    const valid =
      Object.keys(record).length === 4 &&
      record.version === 1 &&
      record.authorised === true &&
      typeof record.createdAt === "string" &&
      Number.isFinite(createdAt) &&
      typeof record.expiresAt === "string" &&
      Number.isFinite(expiresAt) &&
      createdAt <= now &&
      createdAt < expiresAt &&
      now < expiresAt;

    if (!valid) clearQuestionnaireLinkAccess();
    return valid;
  } catch {
    clearQuestionnaireLinkAccess();
    return false;
  }
}

/**
 * Accepts a locally authorised dynamic link only when `token` and `expires`
 * are supplied together. Token-only links are left to backend authorisation.
 */
export function resolveQuestionnaireLink(url: URL, now = Date.now()): QuestionnaireLinkAccess {
  const tokens = url.searchParams.getAll("token");
  const expiries = url.searchParams.getAll("expires");
  const isDynamicLinkAttempt = expiries.length > 0;

  if (isDynamicLinkAttempt) {
    const expiresAt = expiries.length === 1 ? Date.parse(expiries[0]) : Number.NaN;
    const valid =
      tokens.length === 1 &&
      expiries.length === 1 &&
      TOKEN_PATTERN.test(tokens[0]) &&
      Number.isFinite(expiresAt) &&
      expiresAt > now;

    if (!valid) return "rejected";

    const record: LinkAccessRecord = {
      version: 1,
      authorised: true,
      createdAt: new Date(now).toISOString(),
      expiresAt: expiries[0],
    };
    try {
      window.sessionStorage.setItem(QUESTIONNAIRE_LINK_STORAGE_KEY, JSON.stringify(record));
    } catch {
      // The accepted link still works for this page load; refresh fails closed.
    }
    return "link";
  }

  return hasQuestionnaireLinkSession(now) ? "session" : "absent";
}
