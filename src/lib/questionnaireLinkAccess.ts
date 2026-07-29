export const QUESTIONNAIRE_LINK_STORAGE_KEY = "aurixa_questionnaire_link_access";
export const QUESTIONNAIRE_LINK_TOKEN = "V2RFaGprbUhqSTB2T2M3Qw";
export const QUESTIONNAIRE_LINK_EXPIRES = "2026-07-30T15:48:54.156Z";

const FIXED_EXPIRY_MS = Date.parse(QUESTIONNAIRE_LINK_EXPIRES);

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

/** Reads the fixed-link session, validating every field and its fixed lifetime. */
export function hasQuestionnaireLinkSession(now = Date.now()): boolean {
  try {
    const stored = window.sessionStorage.getItem(QUESTIONNAIRE_LINK_STORAGE_KEY);
    if (stored === null) return false;
    const value = JSON.parse(stored) as Partial<LinkAccessRecord>;
    const createdAt = Date.parse(value.createdAt ?? "");
    const valid =
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === 4 &&
      value.version === 1 &&
      value.authorised === true &&
      typeof value.createdAt === "string" &&
      Number.isFinite(createdAt) &&
      createdAt <= now &&
      createdAt < FIXED_EXPIRY_MS &&
      value.expiresAt === QUESTIONNAIRE_LINK_EXPIRES &&
      now < FIXED_EXPIRY_MS;

    if (!valid) clearQuestionnaireLinkAccess();
    return valid;
  } catch {
    clearQuestionnaireLinkAccess();
    return false;
  }
}

/**
 * Handles only the one locally authorised link. Legacy links without an
 * `expires` parameter remain available to the existing server authorisation.
 */
export function resolveQuestionnaireLink(url: URL, now = Date.now()): QuestionnaireLinkAccess {
  const tokens = url.searchParams.getAll("token");
  const expiries = url.searchParams.getAll("expires");
  const isFixedLinkAttempt = expiries.length > 0 || tokens.includes(QUESTIONNAIRE_LINK_TOKEN);

  if (isFixedLinkAttempt) {
    const valid =
      tokens.length === 1 &&
      expiries.length === 1 &&
      tokens[0] === QUESTIONNAIRE_LINK_TOKEN &&
      expiries[0] === QUESTIONNAIRE_LINK_EXPIRES &&
      now < FIXED_EXPIRY_MS;
    if (!valid) return "rejected";

    const record: LinkAccessRecord = {
      version: 1,
      authorised: true,
      createdAt: new Date(now).toISOString(),
      expiresAt: QUESTIONNAIRE_LINK_EXPIRES,
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
