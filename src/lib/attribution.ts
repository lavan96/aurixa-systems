/**
 * Source tracking for Stage 1 (section 5.4).
 *
 * UTM values, referrer and landing page are recorded silently — they are never
 * exposed as applicant questions. The first page of the session is captured
 * once and kept in sessionStorage so a visitor who lands on a campaign URL and
 * then navigates to the waitlist still carries the original attribution.
 */

const STORAGE_KEY = "aurixa.attribution.v1";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

type StoredAttribution = {
  landingPage?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
};

function readStored(): StoredAttribution | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAttribution) : null;
  } catch {
    return null;
  }
}

/**
 * Records the first landing page, referrer and campaign parameters of the
 * session. Safe to call on every render — it only writes once per session.
 */
export function captureAttribution(): StoredAttribution {
  if (typeof window === "undefined") return {};

  const existing = readStored();
  if (existing) return existing;

  const params = new URLSearchParams(window.location.search);
  const utm = Object.fromEntries(
    UTM_KEYS.map((key) => {
      const camel = key.replace(/_(.)/g, (_, char: string) => char.toUpperCase());
      const value = params.get(key)?.trim().slice(0, 200);
      return [camel, value || undefined];
    }),
  ) as Omit<StoredAttribution, "landingPage" | "referrer">;

  const attribution: StoredAttribution = {
    landingPage: `${window.location.pathname}${window.location.search}`.slice(0, 500),
    referrer: document.referrer ? document.referrer.slice(0, 500) : undefined,
    ...utm,
  };

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // Private browsing or storage disabled — attribution is best-effort.
  }

  return attribution;
}

/** Attribution for a submission made from `page`. */
export function getAttribution(source: string, page: string) {
  return { ...captureAttribution(), source, page };
}
